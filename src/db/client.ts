import type { Bindings } from '../types';

export const countPublishedPosts = async (db: Bindings['DB']) => {
  const row = await db.prepare(
    "SELECT COUNT(*) AS total FROM posts WHERE status = ?"
  ).bind('published').first<{ total: number }>();
  return row?.total ?? 0;
};

export const inspectMediaBucket = async (bucket: Bindings['MEDIA']) => {
  const result = await bucket.list({ limit: 1 });
  return { reachable: true, sampleCount: result.objects.length };
};
