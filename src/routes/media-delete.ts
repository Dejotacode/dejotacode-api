import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { fail, ok } from '../lib/response';
import { requireAdmin, requireAuth } from '../middleware/auth';
import { hashToken } from '../lib/crypto';

const deleteSchema = z.object({
  confirmation: z.literal('EXCLUIR'),
  objectKey: z.string().trim().min(1).max(1024),
  dryRunToken: z.string().trim().min(20).max(256).optional(),
  snapshotId: z.number().int().positive()
});

const githubHeaders = (token: string) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'DejotaCode-Media-Delete-Recovery',
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
  const coverUsage = await env.DB.prepare('SELECT COUNT(*) AS total FROM posts WHERE cover_key=?')
    .bind(objectKey).first<{ total: number }>();
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

type MediaDeleteRow = {
  objectKey: string;
  reviewStatus: string;
  cleanupStatus: string;
  deleteCheckHash: string | null;
  deleteCheckExpiresAt: string | null;
  deleteStartedAt: string | null;
  deleteStartedBy: number | null;
  deleteStartedSnapshotId: number | null;
};

type SnapshotRow = {
  id: number;
  objectKey: string;
  dryRunHash: string;
  eligible: number;
  createdAt: string;
};

const loadSnapshot = async (env: AppEnv['Bindings'], id: number, snapshotId: number) => env.DB.prepare(
  `SELECT id,object_key AS objectKey,dry_run_hash AS dryRunHash,eligible,created_at AS createdAt
   FROM media_delete_snapshots WHERE id=? AND media_id=? LIMIT 1`
).bind(snapshotId, id).first<SnapshotRow>();

const finalizeMetadataDelete = async (
  env: AppEnv['Bindings'],
  id: number,
  userId: number,
  requestId: string,
  recovery: boolean,
) => {
  const path = recovery ? `/api/media/cms/${id}/delete-recovery` : `/api/media/cms/${id}/delete-finalize`;
  const action = recovery ? 'DELETE_RECOVERY' : 'DELETE_FINALIZE';
  await env.DB.batch([
    env.DB.prepare('DELETE FROM media WHERE id=?').bind(id),
    env.DB.prepare('INSERT INTO audit_logs (user_id,action,path,request_id) VALUES (?,?,?,?)')
      .bind(userId, action, path, requestId),
  ]);
};

export const mediaDelete = new Hono<AppEnv>();

mediaDelete.use('*', requireAuth);
mediaDelete.use('*', requireAdmin);

mediaDelete.get('/delete-pending', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT id,object_key AS objectKey,content_type AS contentType,alt_text AS altText,
      review_status AS reviewStatus,cleanup_status AS cleanupStatus,
      delete_started_at AS deleteStartedAt,delete_started_by AS deleteStartedBy,
      delete_started_snapshot_id AS deleteStartedSnapshotId
     FROM media WHERE delete_started_at IS NOT NULL
     ORDER BY delete_started_at DESC LIMIT 100`
  ).all();
  return ok(c, { items: result.results });
});

mediaDelete.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id < 1) return fail(c, 'VALIDATION_ERROR', 'Mídia inválida.', 400);
  const parsed = deleteSchema.safeParse(await c.req.json());
  if (!parsed.success) return fail(c, 'VALIDATION_ERROR', 'Confirmação final inválida.', 400);

  const row = await c.env.DB.prepare(
    `SELECT object_key AS objectKey,review_status AS reviewStatus,cleanup_status AS cleanupStatus,
      delete_check_hash AS deleteCheckHash,delete_check_expires_at AS deleteCheckExpiresAt,
      delete_started_at AS deleteStartedAt,delete_started_by AS deleteStartedBy,
      delete_started_snapshot_id AS deleteStartedSnapshotId
     FROM media WHERE id=? LIMIT 1`
  ).bind(id).first<MediaDeleteRow>();
  if (!row) return fail(c, 'MEDIA_NOT_FOUND', 'Arquivo não encontrado.', 404);
  if (row.objectKey !== parsed.data.objectKey) return fail(c, 'MEDIA_KEY_MISMATCH', 'A chave informada não corresponde à mídia.', 409);
  if (row.reviewStatus !== 'candidate' || row.cleanupStatus !== 'approved') {
    return fail(c, 'MEDIA_CLEANUP_NOT_APPROVED', 'A mídia não possui aprovação final válida.', 409);
  }

  const snapshot = await loadSnapshot(c.env, id, parsed.data.snapshotId);
  if (!snapshot || snapshot.objectKey !== row.objectKey || snapshot.eligible !== 1) {
    return fail(c, 'MEDIA_DELETE_SNAPSHOT_REQUIRED', 'Gere um snapshot final válido antes da exclusão.', 409);
  }

  const userId = c.get('user').id;
  const requestId = c.get('requestId');
  const recovery = Boolean(row.deleteStartedAt);

  if (recovery) {
    if (row.deleteStartedSnapshotId !== parsed.data.snapshotId) {
      return fail(c, 'MEDIA_DELETE_RECOVERY_SNAPSHOT_MISMATCH', 'A recuperação exige o mesmo snapshot da exclusão iniciada.', 409);
    }

    const object = await c.env.MEDIA.head(row.objectKey);
    if (object) {
      let inspection;
      try {
        inspection = await inspectDeletionEligibility(c.env, row.objectKey);
      } catch (error) {
        const code = error instanceof Error ? error.message : 'MEDIA_DELETE_CHECK_FAILED';
        return fail(c, code, 'Não foi possível revalidar a exclusão interrompida.', 502);
      }
      if (!inspection.eligible) {
        await c.env.DB.prepare(
          `UPDATE media SET delete_started_at=NULL,delete_started_by=NULL,delete_started_snapshot_id=NULL,
            delete_check_hash=NULL,delete_check_expires_at=NULL WHERE id=?`
        ).bind(id).run();
        return fail(c, 'MEDIA_DELETE_BLOCKED', 'Uma referência ativa foi encontrada. A exclusão interrompida foi cancelada.', 409);
      }
      try {
        await c.env.MEDIA.delete(row.objectKey);
      } catch {
        return fail(c, 'MEDIA_R2_DELETE_FAILED', 'O arquivo ainda não pôde ser removido do armazenamento. A operação permanece recuperável.', 502);
      }
    }

    try {
      await finalizeMetadataDelete(c.env, id, userId, requestId, true);
    } catch {
      return fail(c, 'MEDIA_DELETE_FINALIZE_FAILED', 'O arquivo já pode ter sido removido, mas a limpeza do registro ainda não terminou. Tente novamente.', 500);
    }

    return ok(c, {
      message: 'Exclusão interrompida concluída com segurança.',
      objectKey: row.objectKey,
      recovered: true,
    });
  }

  if (!row.deleteCheckHash || !row.deleteCheckExpiresAt || new Date(row.deleteCheckExpiresAt).getTime() <= Date.now()) {
    return fail(c, 'MEDIA_DRY_RUN_REQUIRED', 'Execute um novo dry-run antes da exclusão.', 409);
  }
  if (!parsed.data.dryRunToken || await hashToken(parsed.data.dryRunToken) !== row.deleteCheckHash) {
    return fail(c, 'MEDIA_DRY_RUN_INVALID', 'O token do dry-run não corresponde à verificação mais recente.', 409);
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
    await c.env.DB.prepare('UPDATE media SET delete_check_hash=NULL,delete_check_expires_at=NULL WHERE id=?').bind(id).run();
    return fail(c, 'MEDIA_DELETE_BLOCKED', 'Uma referência apareceu após o dry-run. A exclusão foi bloqueada.', 409);
  }

  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `UPDATE media SET delete_started_at=CURRENT_TIMESTAMP,delete_started_by=?,delete_started_snapshot_id=? WHERE id=?`
      ).bind(userId, snapshot.id, id),
      c.env.DB.prepare('INSERT INTO audit_logs (user_id,action,path,request_id) VALUES (?,?,?,?)')
        .bind(userId, 'DELETE_START', `/api/media/cms/${id}/delete-start`, requestId),
    ]);
  } catch {
    return fail(c, 'MEDIA_DELETE_START_FAILED', 'A exclusão não foi iniciada porque o checkpoint durável não pôde ser gravado.', 500);
  }

  try {
    await c.env.MEDIA.delete(row.objectKey);
  } catch {
    return fail(c, 'MEDIA_R2_DELETE_FAILED', 'O armazenamento não confirmou a remoção. A operação ficou marcada para recuperação segura.', 502);
  }

  try {
    await finalizeMetadataDelete(c.env, id, userId, requestId, false);
  } catch {
    return fail(c, 'MEDIA_DELETE_FINALIZE_FAILED', 'O arquivo foi removido, mas a limpeza do registro ficou pendente. Tente novamente para concluir.', 500);
  }

  return ok(c, {
    message: 'Arquivo removido após checkpoint durável, dry-run e revalidação final.',
    objectKey: row.objectKey,
    recovered: false,
  });
});
