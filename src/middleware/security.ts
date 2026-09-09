import { createMiddleware } from 'hono/factory';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { AppEnv } from '../types';

export const requestContext = createMiddleware<AppEnv>(async (c, next) => {
  c.set('requestId', crypto.randomUUID());
  await next();
  c.header('X-Request-Id', c.get('requestId'));
});

export const securityHeaders = createMiddleware<AppEnv>(async (c, next) => {
  const handler = secureHeaders({
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
    crossOriginResourcePolicy: c.req.path.startsWith('/api/media/public/')
      ? 'cross-origin'
      : 'same-origin'
  });

  return handler(c, next);
});

export const siteCors = createMiddleware<AppEnv>(async (c, next) => {
  const handler = cors({
    origin: c.env.SITE_ORIGIN,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-CSRF-Token'],
    credentials: true,
    maxAge: 86400
  });
  return handler(c, next);
});
