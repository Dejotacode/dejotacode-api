import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { fail, ok } from '../lib/response';

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(80).optional(),
  type: z.enum(['article', 'tutorial']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(12)
});

type PostRow = {
  slug: string; type: 'article' | 'tutorial'; title: string; excerpt: string;
  content: string; category: string; categorySlug: string; author: string;
  publishedAt: string; readingTime: number; coverPath: string | null; coverAlt: string | null;
};
const parsePost = (row: PostRow) => ({
  ...row,
  coverPath: row.coverPath ?? undefined,
  coverAlt: row.coverAlt ?? undefined,
  sections: JSON.parse(row.content || '[]') as unknown[]
});
const select = `SELECT p.slug,p.type,p.title,p.excerpt,p.content,
  c.name AS category,c.slug AS categorySlug,u.name AS author,
  p.published_at AS publishedAt,
  MAX(1,CAST((LENGTH(p.content)/1000)+1 AS INTEGER)) AS readingTime,
  CASE WHEN p.cover_key IS NOT NULL THEN '/api/media/public/' || p.cover_key END AS coverPath,
  m.alt_text AS coverAlt
  FROM posts p
  JOIN users u ON u.id=p.author_id
  LEFT JOIN categories c ON c.id=p.category_id
  LEFT JOIN media m ON m.object_key=p.cover_key`;

export const posts = new Hono<AppEnv>()
  .get('/', async (c) => {
    const parsed = querySchema.safeParse(c.req.query());
    if (!parsed.success) return fail(c, 'VALIDATION_ERROR', 'Filtros inválidos.', 400);
    const { q, category, type, page, limit } = parsed.data;
    const clauses = ["p.status = 'published'"];
    const values: (string | number)[] = [];
    if (q) { clauses.push('(p.title LIKE ? OR p.excerpt LIKE ?)'); values.push(`%${q}%`, `%${q}%`); }
    if (category) { clauses.push('c.slug = ?'); values.push(category); }
    if (type) { clauses.push('p.type = ?'); values.push(type); }
    const where = clauses.join(' AND ');
    const total = await c.env.DB.prepare(
      `SELECT COUNT(*) AS total FROM posts p LEFT JOIN categories c ON c.id=p.category_id WHERE ${where}`
    ).bind(...values).first<{ total: number }>();
    const result = await c.env.DB.prepare(
      `${select} WHERE ${where} ORDER BY p.published_at DESC LIMIT ? OFFSET ?`
    ).bind(...values, limit, (page - 1) * limit).all<PostRow>();
    return ok(c, {
      items: result.results.map(parsePost),
      pagination: { page, limit, total: total?.total ?? 0, pages: Math.ceil((total?.total ?? 0) / limit) }
    });
  })
  .get('/:slug', async (c) => {
    const row = await c.env.DB.prepare(
      `${select} WHERE p.slug=? AND p.status='published' LIMIT 1`
    ).bind(c.req.param('slug')).first<PostRow>();
    if (!row) return fail(c, 'POST_NOT_FOUND', 'Conteúdo não encontrado.', 404);
    return ok(c, parsePost(row));
  });
