import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { fail, ok } from '../lib/response';
import { requireAdmin, requireAuth } from '../middleware/auth';

type SnapshotPayload = {
  media?: Record<string, unknown>;
  dryRun?: Record<string, unknown>;
};

type MediaAuditItem = {
  id: number;
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  altText: string;
  createdAt: string;
  reviewStatus: string;
  cleanupStatus: string;
  deleted: boolean;
  snapshotId?: number;
  snapshotCreatedAt?: unknown;
};

const parseSnapshot = (value: unknown): SnapshotPayload | null => {
  if (typeof value !== 'string' || !value) return null;
  try {
    const parsed = JSON.parse(value) as SnapshotPayload;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const loadAuditLogs = async (env: AppEnv['Bindings'], id: number) => {
  const prefix = `/api/media/cms/${id}`;
  return env.DB.prepare(
    `SELECT a.id,a.action,a.path,a.request_id AS requestId,a.created_at AS createdAt,
      a.user_id AS userId,u.name AS userName
     FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id
     WHERE a.path=? OR a.path LIKE ?
     ORDER BY a.created_at DESC,a.id DESC LIMIT 50`
  ).bind(prefix, `${prefix}/%`).all<Record<string, unknown>>();
};

const loadUserNames = async (env: AppEnv['Bindings'], ids: unknown[]) => {
  const normalized = [...new Set(ids.filter((id): id is number => Number.isInteger(id) && Number(id) > 0).map(Number))];
  const names = new Map<number, string>();
  for (const id of normalized) {
    const row = await env.DB.prepare('SELECT name FROM users WHERE id=? LIMIT 1').bind(id).first<{ name: string }>();
    if (row?.name) names.set(id, row.name);
  }
  return names;
};

export const mediaAudit = new Hono<AppEnv>();

mediaAudit.use('*', requireAuth);
mediaAudit.use('*', requireAdmin);

mediaAudit.get('/items', async (c) => {
  const active = await c.env.DB.prepare(
    `SELECT id,object_key AS objectKey,content_type AS contentType,
      size_bytes AS sizeBytes,alt_text AS altText,created_at AS createdAt,
      review_status AS reviewStatus,cleanup_status AS cleanupStatus
     FROM media ORDER BY created_at DESC LIMIT 100`
  ).all<{
    id: number;
    objectKey: string;
    contentType: string;
    sizeBytes: number;
    altText: string;
    createdAt: string;
    reviewStatus: string;
    cleanupStatus: string;
  }>();

  const deletedSnapshots = await c.env.DB.prepare(
    `SELECT s.id AS snapshotId,s.media_id AS mediaId,s.object_key AS objectKey,
      s.snapshot_json AS snapshotJson,s.created_at AS snapshotCreatedAt
     FROM media_delete_snapshots s
     LEFT JOIN media m ON m.id=s.media_id
     WHERE m.id IS NULL
       AND s.id=(SELECT MAX(s2.id) FROM media_delete_snapshots s2 WHERE s2.media_id=s.media_id)
     ORDER BY s.created_at DESC LIMIT 100`
  ).all<Record<string, unknown>>();

  const deleted: MediaAuditItem[] = deletedSnapshots.results.flatMap((row) => {
    const snapshot = parseSnapshot(row.snapshotJson);
    const media = snapshot?.media;
    if (!media) return [];
    return [{
      id: Number(row.mediaId),
      objectKey: String(media.objectKey ?? row.objectKey ?? ''),
      contentType: String(media.contentType ?? ''),
      sizeBytes: Number(media.sizeBytes ?? 0),
      altText: String(media.altText ?? ''),
      createdAt: String(media.createdAt ?? row.snapshotCreatedAt ?? ''),
      reviewStatus: String(media.reviewStatus ?? 'candidate'),
      cleanupStatus: String(media.cleanupStatus ?? 'approved'),
      deleted: true,
      snapshotId: Number(row.snapshotId),
      snapshotCreatedAt: row.snapshotCreatedAt,
    }];
  });

  const items: MediaAuditItem[] = [
    ...active.results.map((item) => ({ ...item, deleted: false })),
    ...deleted,
  ];
  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return ok(c, { items });
});

mediaAudit.get('/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id < 1) return fail(c, 'VALIDATION_ERROR', 'Mídia inválida.', 400);

  const current = await c.env.DB.prepare(
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

  const logs = await loadAuditLogs(c.env, id);

  if (current) {
    const now = Date.now();
    const expiresAt = typeof current.deleteCheckExpiresAt === 'string' ? current.deleteCheckExpiresAt : null;
    const dryRunStatus = !current.deleteCheckedAt
      ? 'never'
      : !current.deleteCheckHash
        ? 'blocked'
        : expiresAt && new Date(expiresAt).getTime() <= now
          ? 'expired'
          : 'approved';

    return ok(c, {
      media: {
        id: current.id,
        objectKey: current.objectKey,
        createdAt: current.createdAt,
        uploadedBy: current.uploadedBy,
        uploadedByName: current.uploadedByName,
        reviewStatus: current.reviewStatus,
        reviewNote: current.reviewNote,
        reviewedAt: current.reviewedAt,
        reviewedBy: current.reviewedBy,
        reviewedByName: current.reviewedByName,
        cleanupStatus: current.cleanupStatus,
        cleanupNote: current.cleanupNote,
        cleanupApprovedAt: current.cleanupApprovedAt,
        cleanupApprovedBy: current.cleanupApprovedBy,
        cleanupApprovedByName: current.cleanupApprovedByName,
        deleteCheckedAt: current.deleteCheckedAt,
        deleteCheckedBy: current.deleteCheckedBy,
        deleteCheckedByName: current.deleteCheckedByName,
        deleteCheckExpiresAt: expiresAt,
        dryRunStatus,
        deleted: false,
      },
      audit: logs.results,
    });
  }

  const snapshotRow = await c.env.DB.prepare(
    `SELECT id,object_key AS objectKey,snapshot_json AS snapshotJson,
      snapshot_hash AS snapshotHash,created_at AS snapshotCreatedAt
     FROM media_delete_snapshots
     WHERE media_id=? ORDER BY id DESC LIMIT 1`
  ).bind(id).first<Record<string, unknown>>();

  if (!snapshotRow) return fail(c, 'MEDIA_NOT_FOUND', 'Arquivo não encontrado.', 404);
  const snapshot = parseSnapshot(snapshotRow.snapshotJson);
  const media = snapshot?.media;
  if (!media) return fail(c, 'MEDIA_AUDIT_SNAPSHOT_INVALID', 'O snapshot preservado não pôde ser lido.', 500);

  const names = await loadUserNames(c.env, [media.uploadedBy, media.reviewedBy, media.cleanupApprovedBy, snapshot?.dryRun?.checkedBy]);
  const deletedLog = logs.results.find((entry) => entry.action === 'DELETE' && entry.path === `/api/media/cms/${id}`);
  const dryRun = snapshot?.dryRun ?? {};

  return ok(c, {
    media: {
      id,
      objectKey: media.objectKey ?? snapshotRow.objectKey,
      createdAt: media.createdAt ?? null,
      uploadedBy: media.uploadedBy ?? null,
      uploadedByName: names.get(Number(media.uploadedBy)) ?? null,
      reviewStatus: media.reviewStatus ?? 'candidate',
      reviewNote: media.reviewNote ?? null,
      reviewedAt: media.reviewedAt ?? null,
      reviewedBy: media.reviewedBy ?? null,
      reviewedByName: names.get(Number(media.reviewedBy)) ?? null,
      cleanupStatus: media.cleanupStatus ?? 'approved',
      cleanupNote: media.cleanupNote ?? null,
      cleanupApprovedAt: media.cleanupApprovedAt ?? null,
      cleanupApprovedBy: media.cleanupApprovedBy ?? null,
      cleanupApprovedByName: names.get(Number(media.cleanupApprovedBy)) ?? null,
      deleteCheckedAt: dryRun.checkedAt ?? null,
      deleteCheckedBy: dryRun.checkedBy ?? null,
      deleteCheckedByName: names.get(Number(dryRun.checkedBy)) ?? null,
      deleteCheckExpiresAt: dryRun.expiresAt ?? null,
      dryRunStatus: 'approved',
      deleted: true,
      deletedAt: deletedLog?.createdAt ?? null,
      snapshotId: snapshotRow.id,
      snapshotHash: snapshotRow.snapshotHash,
      snapshotCreatedAt: snapshotRow.snapshotCreatedAt,
    },
    audit: logs.results,
  });
});
