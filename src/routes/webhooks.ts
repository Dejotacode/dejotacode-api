import { Hono } from 'hono';
import { z } from 'zod';

import { hashToken } from '../lib/crypto';
import { fail, ok } from '../lib/response';
import type { AppEnv } from '../types';

const kiwifySchema = z.object({
  order_id: z.string().min(1).max(200),
  order_status: z.string().min(1).max(40),
  payment_method: z.string().max(80).optional().nullable(),
  Product: z.object({
    product_id: z.string().max(200).optional(),
    product_name: z.string().max(200).optional(),
  }).optional(),
}).passthrough();

const safeEqual = (left: string, right: string) => {
  let diff = left.length ^ right.length;
  const size = Math.max(left.length, right.length);

  for (let index = 0; index < size; index += 1) {
    diff |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }

  return diff === 0;
};
export const webhooks = new Hono<AppEnv>();

webhooks.post('/kiwify', async (c) => {
  const expectedToken = c.env.KIWIFY_WEBHOOK_TOKEN?.trim() ?? '';
  const providedToken = c.req.query('token')?.trim() ?? '';

  if (!expectedToken || !providedToken || !safeEqual(expectedToken, providedToken)) {
    return fail(c, 'UNAUTHORIZED', 'Webhook não autorizado.', 401);
  }

  const parsed = kiwifySchema.safeParse(await c.req.json<unknown>().catch(() => null));

  if (!parsed.success) {
    return fail(c, 'VALIDATION_ERROR', 'Payload de webhook inválido.', 400);
  }

  const payload = parsed.data;
  const productName = payload.Product?.product_name?.trim() ?? '';

  if (payload.order_status !== 'paid' || productName !== 'Linux do Zero') {
    return ok(c, { accepted: true, counted: false });
  }

  const eventKey = await hashToken(`kiwify:${payload.order_id}:paid`);
  const inserted = await c.env.DB.prepare(
    `
      INSERT OR IGNORE INTO commerce_webhook_events (
        event_key,
        provider,
        event_type,
        product_key,
        payment_method
      )
      VALUES (?, 'kiwify', 'purchase_approved', 'linux-do-zero', ?)
    `,
  )
    .bind(eventKey, payload.payment_method ?? '')
    .run();

  if (Number(inserted.meta.changes ?? 0) === 0) {
    return ok(c, { accepted: true, counted: false, duplicate: true });
  }

  const date = new Date().toISOString().slice(0, 10);

  await c.env.DB.prepare(
    `
      INSERT INTO daily_metrics (
        metric_date,
        event_type,
        path,
        campaign,
        total
      )
      VALUES (?, 'purchase_approved', '/produtos/linux-do-zero/', 'linux-do-zero', 1)
      ON CONFLICT(metric_date, event_type, path, campaign)
      DO UPDATE SET
        total = total + 1,
        updated_at = CURRENT_TIMESTAMP
    `,
  )
    .bind(date)
    .run();

  return ok(c, { accepted: true, counted: true }, 201);
});
