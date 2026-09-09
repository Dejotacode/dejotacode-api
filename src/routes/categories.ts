import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { fail, ok } from '../lib/response';

type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
  description: string;
  sortOrder: number;
  postCount: number;
};

export const categories = new Hono<AppEnv>()
  .get('/', async (c) => {
    const result = await c.env.DB.prepare(
      `SELECT c.id,c.name,c.slug,c.icon,c.description,c.sort_order AS sortOrder,
        COUNT(p.id) AS postCount
       FROM categories c
       LEFT JOIN posts p ON p.category_id=c.id AND p.status='published'
       GROUP BY c.id
       ORDER BY c.sort_order,c.name`
    ).all<CategoryRow>();

    return ok(c, { items: result.results });
  })
  .get('/:slug', async (c) => {
    const row = await c.env.DB.prepare(
      `SELECT id,name,slug,icon,description,sort_order AS sortOrder
       FROM categories
       WHERE slug=?
       LIMIT 1`
    ).bind(c.req.param('slug')).first();

    if (!row) return fail(c, 'CATEGORY_NOT_FOUND', 'Categoria não encontrada.', 404);
    return ok(c, row);
  });
