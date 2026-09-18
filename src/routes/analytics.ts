import { Hono } from 'hono';
import { z } from 'zod';

import { hashToken } from '../lib/crypto';
import { fail, ok } from '../lib/response';
import { requireAuth } from '../middleware/auth';
import type { AppEnv } from '../types';

const analyticsEvents = [
  'page_view',
  'cta_click',
  'lead_submit',
  'contact_submit',
  'form_start',
  'guide_access',
  'trail_start',
  'trail_lesson_click',
  'trail_complete',
] as const;

const eventSchema = z.object({
  event: z.enum(analyticsEvents),
  path: z.string().startsWith('/').max(240),
  campaign: z.string().max(100).optional(),
});

export const analytics = new Hono<AppEnv>();

analytics.post('/', async (c) => {
  const address = c.req.header('cf-connecting-ip') ?? 'local';
  const key = await hashToken(`analytics:${address}`);

  const limited = await c.env.ANALYTICS_RATE_LIMITER.limit({ key });

  if (!limited.success) {
    return fail(c, 'RATE_LIMITED', 'Limite de métricas atingido.', 429);
  }

  const parsed = eventSchema.safeParse(await c.req.json());

  if (!parsed.success) {
    return fail(c, 'VALIDATION_ERROR', 'Evento inválido.', 400);
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
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(metric_date, event_type, path, campaign)
      DO UPDATE SET
        total = total + 1,
        updated_at = CURRENT_TIMESTAMP
    `,
  )
    .bind(
      date,
      parsed.data.event,
      parsed.data.path,
      parsed.data.campaign ?? '',
    )
    .run();

  return ok(c, { accepted: true }, 201);
});

analytics.get('/summary', requireAuth, async (c) => {
  const totals = await c.env.DB.prepare(
    `
      SELECT
        event_type AS event,
        SUM(total) AS total
      FROM daily_metrics
      WHERE metric_date >= date('now', '-30 days')
      GROUP BY event_type
    `,
  ).all();

  const pages = await c.env.DB.prepare(
    `
      SELECT
        path,
        SUM(total) AS total
      FROM daily_metrics
      WHERE event_type = 'page_view'
        AND metric_date >= date('now', '-30 days')
      GROUP BY path
      ORDER BY total DESC
      LIMIT 10
    `,
  ).all();

  const campaigns = await c.env.DB.prepare(
    `
      SELECT
        campaign,
        event_type AS event,
        SUM(total) AS total
      FROM daily_metrics
      WHERE metric_date >= date('now', '-30 days')
        AND campaign <> ''
      GROUP BY campaign, event_type
      ORDER BY total DESC
      LIMIT 20
    `,
  ).all();

  const linuxDoZeroFunnel = await c.env.DB.prepare(
    `
      SELECT
        COALESCE(SUM(CASE
          WHEN event_type = 'page_view'
            AND path = '/produtos/linux-do-zero/'
          THEN total ELSE 0 END), 0) AS product_page_views,
        COALESCE(SUM(CASE
          WHEN event_type = 'cta_click'
            AND campaign = 'article-linux-ebook-product'
          THEN total ELSE 0 END), 0) AS article_to_product_clicks,
        COALESCE(SUM(CASE
          WHEN event_type = 'cta_click'
            AND campaign = 'trail-linux-ebook-product'
          THEN total ELSE 0 END), 0) AS trail_to_product_clicks,
        COALESCE(SUM(CASE
          WHEN event_type = 'cta_click'
            AND campaign IN (
              'product-linux-buy-kiwify-hero',
              'product-linux-buy-kiwify-final'
            )
          THEN total ELSE 0 END), 0) AS product_to_checkout_clicks
      FROM daily_metrics
      WHERE metric_date >= date('now', '-30 days')
    `,
  ).first();

  return ok(c, {
    periodDays: 30,
    totals: totals.results,
    pages: pages.results,
    campaigns: campaigns.results,
    productFunnel: {
      linuxDoZero: {
        productPageViews: Number(linuxDoZeroFunnel?.product_page_views ?? 0),
        articleToProductClicks: Number(linuxDoZeroFunnel?.article_to_product_clicks ?? 0),
        trailToProductClicks: Number(linuxDoZeroFunnel?.trail_to_product_clicks ?? 0),
        productToCheckoutClicks: Number(linuxDoZeroFunnel?.product_to_checkout_clicks ?? 0),
      },
    },
  });
});
