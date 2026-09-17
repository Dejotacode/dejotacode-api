import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { fail, ok } from '../lib/response';
import { requireAuth } from '../middleware/auth';

const allowed = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
  ['application/pdf', 'pdf'],
  ['application/zip', 'zip']
]);
const maxSize = 10 * 1024 * 1024;
const postSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const reviewSchema = z.object({
  status: z.enum(['pending', 'keep', 'candidate']),
  note: z.string().trim().max(500).optional().default('')
});
const cleanupSchema = z.object({
  status: z.enum(['pending', 'approved']),
  note: z.string().trim().max(500).optional().default('')
});

export const media = new Hono<AppEnv>();

media.get('/public/*', async (c) => {
  const key = c.req.path.split('/media/public/')[1];
  if (!key || key.includes('..')) return fail(c, 'INVALID_KEY', 'Arquivo inválido.', 400);
  const object = await c.env.MEDIA.get(key);
  if (!object) return fail(c, 'MEDIA_NOT_FOUND', 'Arquivo não encontrado.', 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('cross-origin-resource-policy', 'cross-origin');
  return new Response(object.body, { headers });
});

media.use('/cms/*', requireAuth);

media.get('/cms', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT id,object_key AS objectKey,content_type AS contentType,
      size_bytes AS sizeBytes,alt_text AS altText,created_at AS createdAt,
      review_status AS reviewStatus,review_note AS reviewNote,
      reviewed_at AS reviewedAt,reviewed_by AS reviewedBy,
      cleanup_status AS cleanupStatus,cleanup_note AS cleanupNote,
      cleanup_approved_at AS cleanupApprovedAt,cleanup_approved_by AS cleanupApprovedBy
     FROM media ORDER BY created_at DESC LIMIT 100`
  ).all();
  return ok(c, { items: result.results });
});

media.post('/cms', async (c) => {
  const form = await c.req.formData();
  const file = form.get('file');
  const alt = String(form.get('alt') ?? '').trim();
  const postSlug = String(form.get('postSlug') ?? '').trim();
  if (!(file instanceof File)) return fail(c, 'FILE_REQUIRED', 'Selecione um arquivo.', 400);
  const extension = allowed.get(file.type);
  if (!extension) return fail(c, 'TYPE_NOT_ALLOWED', 'Use JPG, PNG, WebP, AVIF, PDF ou ZIP.', 400);
  if (file.size > maxSize) return fail(c, 'FILE_TOO_LARGE', 'O arquivo deve ter no máximo 10 MB.', 400);
  if (file.type.startsWith('image/') && (alt.length < 3 || alt.length > 220)) {
    return fail(c, 'ALT_REQUIRED', 'Descreva a imagem em até 220 caracteres.', 400);
  }
  if (postSlug && !postSlugPattern.test(postSlug)) {
    return fail(c, 'POST_SLUG_INVALID', 'Slug editorial inválido para organizar a imagem.', 400);
  }

  const now = new Date();
  const isImage = file.type.startsWith('image/');
  const group = isImage && postSlug ? `posts/${postSlug}` : isImage ? 'images' : 'downloads';
  const datePath = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const key = `${group}/${datePath}/${crypto.randomUUID()}.${extension}`;
  await c.env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: { originalName: file.name }
  });

  try {
    const result = await c.env.DB.prepare(
      'INSERT INTO media (object_key,content_type,size_bytes,alt_text,uploaded_by) VALUES (?,?,?,?,?)'
    ).bind(key, file.type, file.size, alt, c.get('user').id).run();
    return ok(c, {
      id: result.meta.last_row_id,
      objectKey: key,
      publicPath: `/api/media/public/${key}`
    }, 201);
  } catch (error) {
    await c.env.MEDIA.delete(key);
    throw error;
  }
});


media.patch('/cms/:id/review', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id < 1) return fail(c, 'VALIDATION_ERROR', 'Mídia inválida.', 400);
  const parsed = reviewSchema.safeParse(await c.req.json());
  if (!parsed.success) return fail(c, 'VALIDATION_ERROR', 'Revise o estado e a nota da mídia.', 400);
  const exists = await c.env.DB.prepare('SELECT id FROM media WHERE id=? LIMIT 1').bind(id).first();
  if (!exists) return fail(c, 'MEDIA_NOT_FOUND', 'Arquivo não encontrado.', 404);

  const { status, note } = parsed.data;
  const userId = c.get('user').id;
  await c.env.DB.prepare(
    `UPDATE media SET review_status=?,review_note=?,
      reviewed_at=CASE WHEN ?='pending' THEN NULL ELSE CURRENT_TIMESTAMP END,
      reviewed_by=CASE WHEN ?='pending' THEN NULL ELSE ? END,
      cleanup_status=CASE WHEN ?='candidate' THEN cleanup_status ELSE 'pending' END,
      cleanup_note=CASE WHEN ?='candidate' THEN cleanup_note ELSE NULL END,
      cleanup_approved_at=CASE WHEN ?='candidate' THEN cleanup_approved_at ELSE NULL END,
      cleanup_approved_by=CASE WHEN ?='candidate' THEN cleanup_approved_by ELSE NULL END
     WHERE id=?`
  ).bind(status, note || null, status, status, userId, status, status, status, status, id).run();

  return ok(c, {
    id,
    reviewStatus: status,
    reviewNote: note || null,
    reviewedBy: status === 'pending' ? null : userId
  });
});


media.patch('/cms/:id/cleanup', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id < 1) return fail(c, 'VALIDATION_ERROR', 'Mídia inválida.', 400);
  const parsed = cleanupSchema.safeParse(await c.req.json());
  if (!parsed.success) return fail(c, 'VALIDATION_ERROR', 'Revise o estado e a nota do gate de limpeza.', 400);
  const row = await c.env.DB.prepare(
    'SELECT review_status AS reviewStatus FROM media WHERE id=? LIMIT 1'
  ).bind(id).first<{ reviewStatus: string }>();
  if (!row) return fail(c, 'MEDIA_NOT_FOUND', 'Arquivo não encontrado.', 404);
  if (parsed.data.status === 'approved' && row.reviewStatus !== 'candidate') {
    return fail(c, 'MEDIA_NOT_CANDIDATE', 'A mídia precisa estar marcada como candidata antes da aprovação final.', 409);
  }

  const userId = c.get('user').id;
  const { status, note } = parsed.data;
  await c.env.DB.prepare(
    `UPDATE media SET cleanup_status=?,cleanup_note=?,
      cleanup_approved_at=CASE WHEN ?='approved' THEN CURRENT_TIMESTAMP ELSE NULL END,
      cleanup_approved_by=CASE WHEN ?='approved' THEN ? ELSE NULL END
     WHERE id=?`
  ).bind(status, note || null, status, status, userId, id).run();

  return ok(c, {
    id,
    cleanupStatus: status,
    cleanupNote: note || null,
    cleanupApprovedBy: status === 'approved' ? userId : null
  });
});

media.delete('/cms/:id', async (c) => {
  const row = await c.env.DB.prepare(
    'SELECT object_key AS objectKey FROM media WHERE id=? LIMIT 1'
  ).bind(c.req.param('id')).first<{ objectKey: string }>();
  if (!row) return fail(c, 'MEDIA_NOT_FOUND', 'Arquivo não encontrado.', 404);

  const usage = await c.env.DB.prepare(
    'SELECT COUNT(*) AS total FROM posts WHERE cover_key=?'
  ).bind(row.objectKey).first<{ total: number }>();
  if ((usage?.total ?? 0) > 0) {
    return fail(c, 'MEDIA_IN_USE', 'Remova esta capa dos conteúdos antes de excluir o arquivo.', 409);
  }

  await c.env.MEDIA.delete(row.objectKey);
  await c.env.DB.prepare('DELETE FROM media WHERE id=?').bind(c.req.param('id')).run();
  return ok(c, { message: 'Arquivo removido.' });
});
