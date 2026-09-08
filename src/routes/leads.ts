import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { fail, ok } from '../lib/response';

const leadSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  name: z.string().trim().min(2).max(100).optional(),
  resource: z.string().trim().min(1).max(120).default('newsletter'),
  consent: z.literal(true)
});

export const leads = new Hono<AppEnv>().post('/', async (c) => {
  const contentType = c.req.header('content-type') ?? '';
  const raw = contentType.includes('application/json')
    ? await c.req.json<unknown>()
    : await c.req.parseBody();
  const candidate = typeof raw === 'object' && raw !== null ? { ...raw, consent: true } : raw;
  const parsed = leadSchema.safeParse(candidate);
  if (!parsed.success) return fail(c, 'VALIDATION_ERROR', 'Informe um e-mail válido.', 400);

  await c.env.DB.prepare(
    'INSERT INTO leads (email, name, resource_slug, consent_at) VALUES (?, ?, ?, ?)'
  ).bind(parsed.data.email, parsed.data.name ?? null, parsed.data.resource, new Date().toISOString()).run();

  return ok(c, { message: 'Inscrição realizada com sucesso.' }, 201);
});
