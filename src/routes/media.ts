import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { fail, ok } from '../lib/response';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { hashToken, randomToken } from '../lib/crypto';

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
const deleteDryRunSchema = z.object({
  objectKey: z.string().trim().min(1).max(1024)
});
const deleteSnapshotSchema = z.object({
  objectKey: z.string().trim().min(1).max(1024),
  dryRunToken: z.string().trim().min(20).max(256)
});
const deleteSchema = z.object({
  confirmation: z.literal('EXCLUIR'),
  objectKey: z.string().trim().min(1).max(1024),
  dryRunToken: z.string().trim().min(20).max(256),
  snapshotId: z.number().int().positive()
});


const githubHeaders = (token: string) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'DejotaCode-Media-Cleanup',
});

const decodeBase64Utf8 = (value: string) => {
  const binary = atob(value.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const findMarkdownReferences = async (env: AppEnv['Bindings'], objectKey: string) => {
  const token = env.GITHUB_EDITOR_TOKEN?.trim();
  if (!token) throw new Error('GITHUB_NOT_CONFIGURED');
  const repository = env.GITHUB_EDITOR_REPO || 'Dejotacode/dejotacode';
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) throw new Error('GITHUB_REPO_INVALID');
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = githubHeaders(token);
  const listResponse = await fetch(`${base}/contents/src/content/posts?ref=main`, { headers });
  if (!listResponse.ok) throw new Error('GITHUB_CONTENT_READ_FAILED');
  const files = await listResponse.json() as Array<{ name?: string; path?: string; sha?: string; type?: string }>;
  const markdownFiles = files.filter((file) => file.type === 'file' && file.name?.endsWith('.md') && file.sha && file.path);
  const references: string[] = [];
  for (const file of markdownFiles) {
    const blobResponse = await fetch(`${base}/git/blobs/${encodeURIComponent(file.sha!)}`, { headers });
    if (!blobResponse.ok) throw new Error('GITHUB_CONTENT_READ_FAILED');
    const blob = await blobResponse.json() as { content?: string; encoding?: string };
    if (blob.encoding !== 'base64' || !blob.content) throw new Error('GITHUB_CONTENT_READ_FAILED');
    const content = decodeBase64Utf8(blob.content);
    if (content.includes(objectKey) || content.includes(`/api/media/public/${objectKey}`)) references.push(file.path!);
  }
  return references;
};

const inspectDeletionEligibility = async (env: AppEnv['Bindings'], objectKey: string) => {
  const coverUsage = await env.DB.prepare(
    'SELECT COUNT(*) AS total FROM posts WHERE cover_key=?'
  ).bind(objectKey).first<{ total: number }>();
  const object = await env.MEDIA.head(objectKey);
  const markdownReferences = await findMarkdownReferences(env, objectKey);
  const blockers: string[] = [];
  if ((coverUsage?.total ?? 0) > 0) blockers.push('used_as_cover');
  if (markdownReferences.length > 0) blockers.push('referenced_in_markdown');
  if (!object) blockers.push('missing_in_r2');
  return {
    eligible: blockers.length === 0,
    blockers,
    coverUsage: coverUsage?.total ?? 0,
    markdownReferences,
    r2Exists: Boolean(object),
  };
};

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
      cleanup_approved_at AS cleanupApprovedAt,cleanup_approved_by AS cleanupApprovedBy,
      delete_check_expires_at AS deleteCheckExpiresAt,delete_checked_at AS deleteCheckedAt
     FROM media ORDER BY created_at DESC LIMIT 100`
  ).all();
  return ok(c, { items: result.results });
});

media.get('/cms/:id/history', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id < 1) return fail(c, 'VALIDATION_ERROR', 'Mídia inválida.', 400);
  const row = await c.env.DB.prepare(
    `SELECT m.id,m.object_key AS objectKey,m.created_at AS createdAt,
      m.uploaded_by AS uploadedBy,u0.name AS uploadedByName,
      m.review_status AS reviewStatus,m.review_note AS reviewNote,m.reviewed_at AS reviewedAt,
      m.reviewed_by AS reviewedBy,u1.name AS reviewedByName,
      m.cleanup_status AS cleanupStatus,m.cleanup_note AS cleanupNote,m.cleanup_approved_at AS cleanupApprovedAt,
      m.cleanup_approved_by AS cleanupApprovedBy,u2.name AS cleanupApprovedByName,
      m.delete_check_hash AS deleteCheckHash,m.delete_check_expires_at AS deleteCheckExpiresAt,
      m.delete_checked_at AS deleteCheckedAt,m.delete_checked_by AS deleteCheckedBy,u3.name AS deleteCheckedByName
     FROM media m
     LEFT JOIN users u0 ON u0.id=m.uploaded_by
     LEFT JOIN users u1 ON u1.id=m.reviewed_by
     LEFT JOIN users u2 ON u2.id=m.cleanup_approved_by
     LEFT JOIN users u3 ON u3.id=m.delete_checked_by
     WHERE m.id=? LIMIT 1`
  ).bind(id).first<Record<string, unknown>>();
  if (!row) return fail(c, 'MEDIA_NOT_FOUND', 'Arquivo não encontrado.', 404);

  const prefix = `/api/media/cms/${id}`;
  const logs = await c.env.DB.prepare(
    `SELECT a.id,a.action,a.path,a.request_id AS requestId,a.created_at AS createdAt,
      a.user_id AS userId,u.name AS userName
     FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id
     WHERE a.path=? OR a.path LIKE ?
     ORDER BY a.created_at DESC,a.id DESC LIMIT 50`
  ).bind(prefix, `${prefix}/%`).all();

  const now = Date.now();
  const expiresAt = typeof row.deleteCheckExpiresAt === 'string' ? row.deleteCheckExpiresAt : null;
  const dryRunStatus = !row.deleteCheckedAt
    ? 'never'
    : !row.deleteCheckHash
      ? 'blocked'
      : expiresAt && new Date(expiresAt).getTime() <= now
        ? 'expired'
        : 'approved';

  return ok(c, {
    media: {
      id: row.id, objectKey: row.objectKey,
      createdAt: row.createdAt, uploadedBy: row.uploadedBy, uploadedByName: row.uploadedByName,
      reviewStatus: row.reviewStatus, reviewNote: row.reviewNote, reviewedAt: row.reviewedAt,
      reviewedBy: row.reviewedBy, reviewedByName: row.reviewedByName,
      cleanupStatus: row.cleanupStatus, cleanupNote: row.cleanupNote, cleanupApprovedAt: row.cleanupApprovedAt,
      cleanupApprovedBy: row.cleanupApprovedBy, cleanupApprovedByName: row.cleanupApprovedByName,
      deleteCheckedAt: row.deleteCheckedAt, deleteCheckedBy: row.deleteCheckedBy,
      deleteCheckedByName: row.deleteCheckedByName, deleteCheckExpiresAt: expiresAt, dryRunStatus
    },
    audit: logs.results
  });
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
      cleanup_approved_by=CASE WHEN ?='candidate' THEN cleanup_approved_by ELSE NULL END,
      delete_check_hash=NULL,delete_check_expires_at=NULL,delete_checked_at=NULL,delete_checked_by=NULL
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
      cleanup_approved_by=CASE WHEN ?='approved' THEN ? ELSE NULL END,
      delete_check_hash=NULL,delete_check_expires_at=NULL,delete_checked_at=NULL,delete_checked_by=NULL
     WHERE id=?`
  ).bind(status, note || null, status, status, userId, id).run();

  return ok(c, {
    id,
    cleanupStatus: status,
    cleanupNote: note || null,
    cleanupApprovedBy: status === 'approved' ? userId : null
  });
});

media.post('/cms/:id/delete-dry-run', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id < 1) return fail(c, 'VALIDATION_ERROR', 'Mídia inválida.', 400);
  const parsed = deleteDryRunSchema.safeParse(await c.req.json());
  if (!parsed.success) return fail(c, 'VALIDATION_ERROR', 'Confirme a chave exata da mídia.', 400);
  const row = await c.env.DB.prepare(
    `SELECT object_key AS objectKey,review_status AS reviewStatus,cleanup_status AS cleanupStatus
     FROM media WHERE id=? LIMIT 1`
  ).bind(id).first<{ objectKey: string; reviewStatus: string; cleanupStatus: string }>();
  if (!row) return fail(c, 'MEDIA_NOT_FOUND', 'Arquivo não encontrado.', 404);
  if (row.objectKey !== parsed.data.objectKey) return fail(c, 'MEDIA_KEY_MISMATCH', 'A chave informada não corresponde à mídia.', 409);
  if (row.reviewStatus !== 'candidate' || row.cleanupStatus !== 'approved') {
    return fail(c, 'MEDIA_CLEANUP_NOT_APPROVED', 'A mídia precisa concluir as duas revisões antes do dry-run.', 409);
  }

  let inspection;
  try {
    inspection = await inspectDeletionEligibility(c.env, row.objectKey);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'MEDIA_DELETE_CHECK_FAILED';
    return fail(c, code, 'Não foi possível revalidar todas as referências. A exclusão permanece bloqueada.', 502);
  }
  if (!inspection.eligible) {
    await c.env.DB.prepare(
      'UPDATE media SET delete_check_hash=NULL,delete_check_expires_at=NULL,delete_checked_at=CURRENT_TIMESTAMP,delete_checked_by=? WHERE id=?'
    ).bind(c.get('user').id, id).run();
    return ok(c, { ...inspection, message: 'Dry-run bloqueado. Nenhuma exclusão foi executada.' });
  }

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  await c.env.DB.prepare(
    `UPDATE media SET delete_check_hash=?,delete_check_expires_at=?,delete_checked_at=CURRENT_TIMESTAMP,delete_checked_by=? WHERE id=?`
  ).bind(await hashToken(token), expiresAt, c.get('user').id, id).run();
  return ok(c, {
    ...inspection,
    dryRunToken: token,
    expiresAt,
    message: 'Dry-run aprovado. Nenhuma exclusão foi executada.'
  });
});

media.post('/cms/:id/delete-snapshot', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id < 1) return fail(c, 'VALIDATION_ERROR', 'Mídia inválida.', 400);
  const parsed = deleteSnapshotSchema.safeParse(await c.req.json());
  if (!parsed.success) return fail(c, 'VALIDATION_ERROR', 'Confirmação do snapshot inválida.', 400);

  const row = await c.env.DB.prepare(
    `SELECT id,object_key AS objectKey,content_type AS contentType,size_bytes AS sizeBytes,alt_text AS altText,
      created_at AS createdAt,uploaded_by AS uploadedBy,review_status AS reviewStatus,review_note AS reviewNote,
      reviewed_at AS reviewedAt,reviewed_by AS reviewedBy,cleanup_status AS cleanupStatus,cleanup_note AS cleanupNote,
      cleanup_approved_at AS cleanupApprovedAt,cleanup_approved_by AS cleanupApprovedBy,
      delete_check_hash AS deleteCheckHash,delete_check_expires_at AS deleteCheckExpiresAt,
      delete_checked_at AS deleteCheckedAt,delete_checked_by AS deleteCheckedBy
     FROM media WHERE id=? LIMIT 1`
  ).bind(id).first<{
    id: number;
    objectKey: string;
    contentType: string;
    sizeBytes: number;
    altText: string | null;
    createdAt: string;
    uploadedBy: number | null;
    reviewStatus: string;
    reviewNote: string | null;
    reviewedAt: string | null;
    reviewedBy: number | null;
    cleanupStatus: string;
    cleanupNote: string | null;
    cleanupApprovedAt: string | null;
    cleanupApprovedBy: number | null;
    deleteCheckHash: string | null;
    deleteCheckExpiresAt: string | null;
    deleteCheckedAt: string | null;
    deleteCheckedBy: number | null;
  }>();
  if (!row) return fail(c, 'MEDIA_NOT_FOUND', 'Arquivo não encontrado.', 404);
  if (row.objectKey !== parsed.data.objectKey) return fail(c, 'MEDIA_KEY_MISMATCH', 'A chave informada não corresponde à mídia.', 409);
  if (row.reviewStatus !== 'candidate' || row.cleanupStatus !== 'approved') {
    return fail(c, 'MEDIA_CLEANUP_NOT_APPROVED', 'A mídia não possui aprovação final válida.', 409);
  }

  const expiresAt = row.deleteCheckExpiresAt;
  if (!row.deleteCheckHash || !expiresAt || new Date(expiresAt).getTime() <= Date.now()) {
    return fail(c, 'MEDIA_DRY_RUN_REQUIRED', 'Execute um novo dry-run antes de gerar o snapshot.', 409);
  }
  if (await hashToken(parsed.data.dryRunToken) !== row.deleteCheckHash) {
    return fail(c, 'MEDIA_DRY_RUN_INVALID', 'O token do dry-run não corresponde à verificação mais recente.', 409);
  }

  let inspection;
  try {
    inspection = await inspectDeletionEligibility(c.env, row.objectKey);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'MEDIA_DELETE_CHECK_FAILED';
    return fail(c, code, 'Não foi possível gerar a evidência final. A exclusão permanece bloqueada.', 502);
  }
  if (!inspection.eligible) {
    return fail(c, 'MEDIA_DELETE_BLOCKED', 'O snapshot encontrou uma referência ativa. A exclusão permanece bloqueada.', 409);
  }

  const actorId = c.get('user').id;
  const requestId = c.get('requestId');
  const capturedAt = new Date().toISOString();
  const snapshotPayload = {
    media: {
      id: row.id,
      objectKey: row.objectKey,
      contentType: row.contentType,
      sizeBytes: row.sizeBytes,
      altText: row.altText,
      createdAt: row.createdAt,
      uploadedBy: row.uploadedBy,
      reviewStatus: row.reviewStatus,
      reviewNote: row.reviewNote,
      reviewedAt: row.reviewedAt,
      reviewedBy: row.reviewedBy,
      cleanupStatus: row.cleanupStatus,
      cleanupNote: row.cleanupNote,
      cleanupApprovedAt: row.cleanupApprovedAt,
      cleanupApprovedBy: row.cleanupApprovedBy,
    },
    dryRun: {
      checkedAt: row.deleteCheckedAt,
      checkedBy: row.deleteCheckedBy,
      expiresAt,
    },
    checks: inspection,
    actor: { id: actorId },
    requestId,
    capturedAt,
  };
  const snapshotJson = JSON.stringify(snapshotPayload);
  const snapshotHash = await hashToken(snapshotJson);
  const result = await c.env.DB.prepare(
    `INSERT INTO media_delete_snapshots
      (media_id,object_key,dry_run_hash,snapshot_json,snapshot_hash,eligible,created_by,request_id)
     VALUES (?,?,?,?,?,1,?,?)`
  ).bind(id, row.objectKey, row.deleteCheckHash, snapshotJson, snapshotHash, actorId, requestId).run();

  return ok(c, {
    snapshotId: Number(result.meta.last_row_id),
    snapshotHash,
    capturedAt,
    expiresAt,
    inspection,
    message: 'Snapshot final registrado. Nenhuma exclusão foi executada.'
  });
});

media.delete('/cms/:id', requireAdmin, async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id < 1) return fail(c, 'VALIDATION_ERROR', 'Mídia inválida.', 400);
  const parsed = deleteSchema.safeParse(await c.req.json());
  if (!parsed.success) return fail(c, 'VALIDATION_ERROR', 'Confirmação final inválida.', 400);
  const row = await c.env.DB.prepare(
    `SELECT object_key AS objectKey,review_status AS reviewStatus,cleanup_status AS cleanupStatus,
      delete_check_hash AS deleteCheckHash,delete_check_expires_at AS deleteCheckExpiresAt
     FROM media WHERE id=? LIMIT 1`
  ).bind(id).first<{
    objectKey: string;
    reviewStatus: string;
    cleanupStatus: string;
    deleteCheckHash: string | null;
    deleteCheckExpiresAt: string | null;
  }>();
  if (!row) return fail(c, 'MEDIA_NOT_FOUND', 'Arquivo não encontrado.', 404);
  if (row.objectKey !== parsed.data.objectKey) return fail(c, 'MEDIA_KEY_MISMATCH', 'A chave informada não corresponde à mídia.', 409);
  if (row.reviewStatus !== 'candidate' || row.cleanupStatus !== 'approved') {
    return fail(c, 'MEDIA_CLEANUP_NOT_APPROVED', 'A mídia não possui aprovação final válida.', 409);
  }
  if (!row.deleteCheckHash || !row.deleteCheckExpiresAt || new Date(row.deleteCheckExpiresAt).getTime() <= Date.now()) {
    return fail(c, 'MEDIA_DRY_RUN_REQUIRED', 'Execute um novo dry-run antes da exclusão.', 409);
  }
  if (await hashToken(parsed.data.dryRunToken) !== row.deleteCheckHash) {
    return fail(c, 'MEDIA_DRY_RUN_INVALID', 'O token do dry-run não corresponde à verificação mais recente.', 409);
  }
  const snapshot = await c.env.DB.prepare(
    `SELECT id,object_key AS objectKey,dry_run_hash AS dryRunHash,eligible,created_at AS createdAt
     FROM media_delete_snapshots WHERE id=? AND media_id=? LIMIT 1`
  ).bind(parsed.data.snapshotId, id).first<{
    id: number;
    objectKey: string;
    dryRunHash: string;
    eligible: number;
    createdAt: string;
  }>();
  if (!snapshot || snapshot.objectKey !== row.objectKey || snapshot.eligible !== 1) {
    return fail(c, 'MEDIA_DELETE_SNAPSHOT_REQUIRED', 'Gere um snapshot final válido antes da exclusão.', 409);
  }
  if (snapshot.dryRunHash !== row.deleteCheckHash) {
    return fail(c, 'MEDIA_DELETE_SNAPSHOT_INVALID', 'O snapshot não pertence ao dry-run atual.', 409);
  }
  const snapshotCreatedAt = new Date(snapshot.createdAt.replace(' ', 'T') + 'Z').getTime();
  if (!Number.isFinite(snapshotCreatedAt) || snapshotCreatedAt > new Date(row.deleteCheckExpiresAt).getTime()) {
    return fail(c, 'MEDIA_DELETE_SNAPSHOT_INVALID', 'O snapshot não pertence à janela válida do dry-run.', 409);
  }

  let inspection;
  try {
    inspection = await inspectDeletionEligibility(c.env, row.objectKey);
  } catch (error) {
    const code = error instanceof Error ? error.message : 'MEDIA_DELETE_CHECK_FAILED';
    return fail(c, code, 'Não foi possível repetir a verificação final. A exclusão foi bloqueada.', 502);
  }
  if (!inspection.eligible) {
    await c.env.DB.prepare(
      'UPDATE media SET delete_check_hash=NULL,delete_check_expires_at=NULL WHERE id=?'
    ).bind(id).run();
    return fail(c, 'MEDIA_DELETE_BLOCKED', 'Uma referência apareceu após o dry-run. A exclusão foi bloqueada.', 409);
  }

  await c.env.MEDIA.delete(row.objectKey);
  await c.env.DB.prepare('DELETE FROM media WHERE id=?').bind(id).run();
  return ok(c, { message: 'Arquivo removido após dry-run e revalidação final.', objectKey: row.objectKey });
});
