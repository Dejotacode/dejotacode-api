import { Hono } from 'hono';
import type { AppEnv, Bindings } from './types';
import { fail } from './lib/response';
import { health } from './routes/health';
import { leads } from './routes/leads';
import { posts } from './routes/posts';
import { categories } from './routes/categories';
import { contact } from './routes/contact';
import { auth } from './routes/auth';
import { cms } from './routes/cms';
import { media } from './routes/media';
import { analytics } from './routes/analytics';
import { stats } from './routes/stats';
import { editor } from './routes/editor';
import { requestContext, securityHeaders, siteCors } from './middleware/security';
import { rateLimit } from './middleware/rate-limit';
import { auditMutations } from './middleware/audit';

const app = new Hono<AppEnv>().basePath('/api');

app.use('*', requestContext);
app.use('*', securityHeaders);
app.use('*', siteCors);
app.use('*', rateLimit);
app.use('*', auditMutations);
app.route('/health', health);
app.route('/leads', leads);
app.route('/posts', posts);
app.route('/categories', categories);
app.route('/contact', contact);
app.route('/auth', auth);
app.route('/cms', cms);
app.route('/media', media);
app.route('/analytics', analytics);
app.route('/stats', stats);
app.route('/editor', editor);
app.notFound((c) => fail(c, 'NOT_FOUND', 'Rota não encontrada.', 404));
app.onError((error, c) => {
  console.error(JSON.stringify({ requestId: c.get('requestId'), message: error.message }));
  return fail(c, 'INTERNAL_ERROR', 'Não foi possível concluir a solicitação.', 500);
});

export default {
  fetch: app.fetch,
  scheduled(_controller: ScheduledController, env: Bindings, ctx: ExecutionContext) {
    ctx.waitUntil(env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP'),
      env.DB.prepare('DELETE FROM invitations WHERE expires_at <= CURRENT_TIMESTAMP OR used_at IS NOT NULL'),
      env.DB.prepare("DELETE FROM audit_logs WHERE created_at < datetime('now','-180 days')")
    ]));
  }
};
