export type Bindings = {
  DB: D1Database;
  MEDIA: R2Bucket;
  ENVIRONMENT: 'local' | 'preview' | 'production';
  SITE_ORIGIN: string;
  CMS_BOOTSTRAP_TOKEN: string;
  GITHUB_EDITOR_TOKEN?: string;
  GITHUB_EDITOR_REPO?: string;
  AUTH_RATE_LIMITER: RateLimit;
  FORM_RATE_LIMITER: RateLimit;
  ANALYTICS_RATE_LIMITER: RateLimit;
};

export type CmsUser = { id: number; email: string; name: string; role: 'admin' | 'editor' };
export type AppEnv = { Bindings: Bindings; Variables: { requestId: string; user: CmsUser } };
