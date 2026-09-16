import type { Context } from 'hono';
import type { AppEnv } from '../types';

export const ok = <T>(c: Context<AppEnv>, data: T, status: 200 | 201 = 200) =>
  c.json({ success: true as const, data, requestId: c.get('requestId') }, status);

export const fail = (c: Context<AppEnv>, code: string, message: string, status: 400 | 401 | 403 | 404 | 409 | 429 | 500 | 502 | 503 = 400) =>
  c.json({ success: false as const, error: { code, message }, requestId: c.get('requestId') }, status);
