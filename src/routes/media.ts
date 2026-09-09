import { Hono } from 'hono';
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
  return new Response(object.body, { headers });
});

media.use('/cms/*', requireAuth);

media.get('/cms', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT id,object_key AS objectKey,content_type AS contentType,
      size_bytes AS sizeBytes,alt_text AS altText,created_at AS createdAt
     FROM media ORDER BY created_at DESC LIMIT 100`
  ).all();
  return ok(c, { items: result.results });
});

media.post('/cms', async (c) => {
  const form = await c.req.formData();
  const file = form.get('file');
  const alt = String(form.get('alt') ?? '').trim();
  if (!(file instanceof File)) return fail(c, 'FILE_REQUIRED', 'Selecione um arquivo.', 400);
  const extension = allowed.get(file.type);
  if (!extension) return fail(c, 'TYPE_NOT_ALLOWED', 'Use JPG, PNG, WebP, AVIF, PDF ou ZIP.', 400);
  if (file.size > maxSize) return fail(c, 'FILE_TOO_LARGE', 'O arquivo deve ter no máximo 10 MB.', 400);
  if (file.type.startsWith('image/') && (alt.length < 3 || alt.length > 220)) {
    return fail(c, 'ALT_REQUIRED', 'Descreva a imagem em até 220 caracteres.', 400);
  }

  const now = new Date();
  const group = file.type.startsWith('image/') ? 'images' : 'downloads';
  const key = `${group}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${crypto.randomUUID()}.${extension}`;
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
