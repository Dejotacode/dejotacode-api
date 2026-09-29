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

const hotmartEnvelopeSchema = z.object({
  id: z.string().min(1).max(200),
  event: z.string().min(1).max(80),
  version: z.string().max(20).optional(),
  data: z.unknown(),
}).passthrough();

const hotmartPurchaseApprovedDataSchema = z.object({
  product: z.object({
    id: z.number().int().optional(),
    ucode: z.string().max(120).optional(),
    name: z.string().max(240).optional(),
  }).passthrough(),
  purchase: z.object({
    status: z.string().max(80).optional(),
    transaction: z.string().max(200).optional(),
    payment: z.object({
      type: z.string().max(80).optional(),
    }).passthrough().optional(),
    origin: z.object({
      src: z.string().max(200).optional(),
      sck: z.string().max(200).optional(),
      xcod: z.string().max(200).optional(),
    }).passthrough().optional(),
  }).passthrough(),
  commissions: z.array(z.object({
    value: z.number().optional(),
    currency_value: z.string().max(12).optional(),
    source: z.string().max(40).optional(),
    currency_conversion: z.object({
      converted_value: z.number().optional(),
      converted_to_currency: z.string().max(12).optional(),
    }).passthrough().optional(),
  }).passthrough()).optional(),
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

webhooks.post('/hotmart', async (c) => {
  const expectedHottok = c.env.HOTMART_HOTTOK?.trim() ?? '';
  const providedHottok = c.req.header('X-HOTMART-HOTTOK')?.trim() ?? '';

  if (!expectedHottok || !providedHottok || !safeEqual(expectedHottok, providedHottok)) {
    return fail(c, 'UNAUTHORIZED', 'Webhook não autorizado.', 401);
  }

  const envelope = hotmartEnvelopeSchema.safeParse(await c.req.json<unknown>().catch(() => null));

  if (!envelope.success) {
    return fail(c, 'VALIDATION_ERROR', 'Payload de webhook inválido.', 400);
  }

  if (envelope.data.event !== 'PURCHASE_APPROVED') {
    return ok(c, { accepted: true, counted: false });
  }

  const purchaseData = hotmartPurchaseApprovedDataSchema.safeParse(envelope.data.data);

  if (!purchaseData.success) {
    return fail(c, 'VALIDATION_ERROR', 'Payload de compra aprovado inválido.', 400);
  }

  const payload = envelope.data;
  const purchase = purchaseData.data.purchase;

  if (purchase.status !== 'APPROVED') {
    return ok(c, { accepted: true, counted: false });
  }

  const product = purchaseData.data.product;
  const productKey = `hotmart:${product.ucode ?? String(product.id ?? 'unknown')}`;
  const eventKey = await hashToken(`hotmart:${payload.id}:${payload.event}`);
  const transactionKey = purchase.transaction
    ? await hashToken(`hotmart:transaction:${purchase.transaction}`)
    : '';
  const affiliateCommission = purchaseData.data.commissions?.find((commission) => commission.source === 'AFFILIATE');
  const commissionValue = affiliateCommission?.currency_conversion?.converted_value ?? affiliateCommission?.value ?? null;
  const commissionCurrency = affiliateCommission?.currency_conversion?.converted_to_currency ?? affiliateCommission?.currency_value ?? '';
  const paymentMethod = purchase.payment?.type ?? '';
  const origin = purchase.origin;

  const inserted = await c.env.DB.prepare(
    `
      INSERT OR IGNORE INTO affiliate_conversions (
        event_key,
        provider,
        product_key,
        product_name,
        transaction_key,
        payment_method,
        commission_value,
        commission_currency,
        origin_src,
        origin_sck,
        origin_xcod
      )
      VALUES (?, 'hotmart', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  )
    .bind(
      eventKey,
      productKey,
      product.name?.trim() ?? '',
      transactionKey,
      paymentMethod,
      commissionValue,
      commissionCurrency,
      origin?.src ?? '',
      origin?.sck ?? '',
      origin?.xcod ?? '',
    )
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
      VALUES (?, 'affiliate_purchase_approved', '/recursos/', ?, 1)
      ON CONFLICT(metric_date, event_type, path, campaign)
      DO UPDATE SET
        total = total + 1,
        updated_at = CURRENT_TIMESTAMP
    `,
  )
    .bind(date, productKey)
    .run();

  return ok(c, { accepted: true, counted: true }, 201);
});
