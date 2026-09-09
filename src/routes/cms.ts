import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { fail, ok } from '../lib/response';
import { requireAuth } from '../middleware/auth';

const section = z.object({
  id: z.string(),
  title: z.string(),
  paragraphs: z.array(z.string()),
  steps: z.array(z.string()).optional(),
  code: z.string().optional()
});

const postSchema = z.object({
  title: z.string().trim().min(5).max(180),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  excerpt: z.string().trim().min(10).max(320),
  content: z.array(section).min(1),
  categoryId: z.number().int().positive(),
  coverKey: z.string().trim().max(500).nullable().optional(),
  type: z.enum(['article', 'tutorial']),
  status: z.enum(['draft', 'review', 'published', 'archived'])
});

type CmsPostRow = {
  id: number; title: string; slug: string; type: 'article' | 'tutorial';
  status: 'draft' | 'review' | 'published' | 'archived'; excerpt: string;
  content: string; categoryId: number; coverKey: string | null; updatedAt: string;
};
const parsePost = (row: CmsPostRow) => ({
  ...row,
  content: JSON.parse(row.content || '[]') as unknown[]
});
const categoryExists = async (c: Context<AppEnv>, categoryId: number) => Boolean(
  await c.env.DB.prepare('SELECT id FROM categories WHERE id=? LIMIT 1').bind(categoryId).first()
);
const coverExists = async (c: Context<AppEnv>, coverKey?: string | null) => {
  if (!coverKey) return true;
  const media = await c.env.DB.prepare(
    "SELECT id FROM media WHERE object_key=? AND content_type LIKE 'image/%' LIMIT 1"
  ).bind(coverKey).first();
  return Boolean(media);
};

export const cms = new Hono<AppEnv>();
cms.use('*', requireAuth);

cms.get('/posts', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT id,title,slug,type,status,excerpt,content,category_id AS categoryId,
      cover_key AS coverKey,updated_at AS updatedAt
     FROM posts ORDER BY updated_at DESC`
  ).all<CmsPostRow>();
  return ok(c, { items: result.results.map(parsePost) });
});

cms.post('/posts', async (c) => {
  const parsed = postSchema.safeParse(await c.req.json());
  if (!parsed.success) return fail(c, 'VALIDATION_ERROR', 'Revise os campos do conteúdo.', 400);
  const post = parsed.data;
  if (!await categoryExists(c, post.categoryId)) {
    return fail(c, 'CATEGORY_NOT_FOUND', 'Selecione uma categoria válida.', 400);
  }
  if (!await coverExists(c, post.coverKey)) {
    return fail(c, 'COVER_NOT_FOUND', 'Selecione uma imagem válida da biblioteca.', 400);
  }
  const duplicate = await c.env.DB.prepare('SELECT id FROM posts WHERE slug=? LIMIT 1')
    .bind(post.slug).first();
  if (duplicate) return fail(c, 'SLUG_EXISTS', 'Este slug já está em uso.', 409);

  const result = await c.env.DB.prepare(
    `INSERT INTO posts
      (category_id,author_id,type,slug,title,excerpt,content,cover_key,status,published_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    post.categoryId, c.get('user').id, post.type, post.slug, post.title, post.excerpt,
    JSON.stringify(post.content), post.coverKey || null, post.status,
    post.status === 'published' ? new Date().toISOString() : null
  ).run();
  return ok(c, { id: result.meta.last_row_id }, 201);
});

cms.put('/posts/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id < 1) return fail(c, 'VALIDATION_ERROR', 'Conteúdo inválido.', 400);
  const parsed = postSchema.safeParse(await c.req.json());
  if (!parsed.success) return fail(c, 'VALIDATION_ERROR', 'Revise os campos do conteúdo.', 400);
  if (!await c.env.DB.prepare('SELECT id FROM posts WHERE id=? LIMIT 1').bind(id).first()) {
    return fail(c, 'POST_NOT_FOUND', 'Conteúdo não encontrado.', 404);
  }
  const post = parsed.data;
  if (!await categoryExists(c, post.categoryId)) {
    return fail(c, 'CATEGORY_NOT_FOUND', 'Selecione uma categoria válida.', 400);
  }
  if (!await coverExists(c, post.coverKey)) {
    return fail(c, 'COVER_NOT_FOUND', 'Selecione uma imagem válida da biblioteca.', 400);
  }
  const duplicate = await c.env.DB.prepare('SELECT id FROM posts WHERE slug=? AND id<>? LIMIT 1')
    .bind(post.slug, id).first();
  if (duplicate) return fail(c, 'SLUG_EXISTS', 'Este slug já está em uso.', 409);

  await c.env.DB.prepare(
    `UPDATE posts SET category_id=?,type=?,slug=?,title=?,excerpt=?,content=?,cover_key=?,status=?,
      published_at=CASE WHEN ?='published' THEN COALESCE(published_at,CURRENT_TIMESTAMP) ELSE published_at END,
      updated_at=CURRENT_TIMESTAMP WHERE id=?`
  ).bind(
    post.categoryId, post.type, post.slug, post.title, post.excerpt,
    JSON.stringify(post.content), post.coverKey || null, post.status, post.status, id
  ).run();
  return ok(c, { message: 'Conteúdo atualizado.' });
});

cms.delete('/posts/:id', async (c) => {
  const id = Number(c.req.param('id'));
  if (!Number.isInteger(id) || id < 1) return fail(c, 'VALIDATION_ERROR', 'Conteúdo inválido.', 400);
  const result = await c.env.DB.prepare(
    "UPDATE posts SET status='archived',updated_at=CURRENT_TIMESTAMP WHERE id=?"
  ).bind(id).run();
  if (!result.meta.changes) return fail(c, 'POST_NOT_FOUND', 'Conteúdo não encontrado.', 404);
  return ok(c, { message: 'Conteúdo arquivado.' });
});
