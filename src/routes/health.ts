import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { ok } from '../lib/response';
import { countPublishedPosts, inspectMediaBucket } from '../db/client';

export const health = new Hono<AppEnv>()
  .get('/', (c) => ok(c, {
    service: 'dejotacode-api', status: 'healthy', environment: c.env.ENVIRONMENT
  }))
  .get('/storage', async (c) => {
    const [publishedPosts, media] = await Promise.all([
      countPublishedPosts(c.env.DB),
      inspectMediaBucket(c.env.MEDIA)
    ]);
    return ok(c, { d1: { reachable: true, publishedPosts }, r2: media });
  });
