import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { fail, ok } from '../lib/response';
import { requireAuth } from '../middleware/auth';

const submissionSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  title: z.string().trim().min(5).max(180),
  markdown: z.string().min(20).max(200_000),
});

const githubHeaders = (token: string) => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'DejotaCode-Editor',
  'Content-Type': 'application/json',
});

const encodeBranch = (branch: string) => branch.split('/').map(encodeURIComponent).join('/');
const contentPath = (slug: string) => `src/content/posts/${slug}.md`;
const utf8ToBase64 = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

export const editor = new Hono<AppEnv>();
editor.use('*', requireAuth);

editor.get('/status', (c) => {
  const configured = Boolean(c.env.GITHUB_EDITOR_TOKEN?.trim());
  return ok(c, {
    configured,
    repository: c.env.GITHUB_EDITOR_REPO || 'Dejotacode/dejotacode',
  });
});

editor.post('/pull-request', async (c) => {
  const parsed = submissionSchema.safeParse(await c.req.json());
  if (!parsed.success) {
    return fail(c, 'VALIDATION_ERROR', 'Revise o conteúdo antes de enviar para revisão.', 400);
  }

  const token = c.env.GITHUB_EDITOR_TOKEN?.trim();
  if (!token) {
    return fail(c, 'GITHUB_NOT_CONFIGURED', 'A integração editorial com GitHub ainda não foi configurada.', 503);
  }

  const repository = c.env.GITHUB_EDITOR_REPO || 'Dejotacode/dejotacode';
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    return fail(c, 'GITHUB_REPO_INVALID', 'Repositório editorial inválido.', 500);
  }
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = githubHeaders(token);
  const refResponse = await fetch(`${base}/git/ref/heads/main`, { headers });
  if (!refResponse.ok) {
    return fail(c, 'GITHUB_BASE_REF_FAILED', 'Não foi possível localizar a branch main no GitHub.', 502);
  }

  const refPayload = await refResponse.json() as { object?: { sha?: string } };
  const baseSha = refPayload.object?.sha;
  if (!baseSha) {
    return fail(c, 'GITHUB_BASE_REF_FAILED', 'O GitHub não retornou o commit base esperado.', 502);
  }

  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const branch = `content/admin-${parsed.data.slug}-${timestamp}`;
  const createRef = await fetch(`${base}/git/refs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  });

  if (!createRef.ok) {
    return fail(c, 'GITHUB_BRANCH_FAILED', 'Não foi possível criar a branch editorial.', 502);
  }
  const path = contentPath(parsed.data.slug);
  const currentResponse = await fetch(`${base}/contents/${path}?ref=main`, { headers });
  let currentSha: string | undefined;

  if (currentResponse.ok) {
    const current = await currentResponse.json() as { sha?: string };
    currentSha = current.sha;
  } else if (currentResponse.status !== 404) {
    return fail(c, 'GITHUB_CONTENT_READ_FAILED', 'Não foi possível verificar o conteúdo atual no GitHub.', 502);
  }

  const updateResponse = await fetch(`${base}/contents/${path}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: currentSha
        ? `content: atualiza ${parsed.data.slug}`
        : `content: adiciona ${parsed.data.slug}`,
      content: utf8ToBase64(parsed.data.markdown),
      branch,
      ...(currentSha ? { sha: currentSha } : {}),
    }),
  });

  if (!updateResponse.ok) {
    return fail(c, 'GITHUB_CONTENT_WRITE_FAILED', 'Não foi possível gravar o Markdown na branch editorial.', 502);
  }
  const pullResponse = await fetch(`${base}/pulls`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: `content: ${parsed.data.title}`,
      head: branch,
      base: 'main',
      body: [
        'Conteúdo preparado pelo Admin Editorial do DejotaCode.',
        '',
        `Arquivo: \`${path}\``,
        '',
        'Revisão humana e CI continuam obrigatórios antes do merge.',
      ].join('\n'),
    }),
  });

  if (!pullResponse.ok) {
    return fail(c, 'GITHUB_PR_FAILED', 'O conteúdo foi criado na branch, mas o Pull Request não pôde ser aberto.', 502);
  }

  const pull = await pullResponse.json() as { number?: number; html_url?: string };
  return ok(c, {
    branch,
    path,
    pullRequestNumber: pull.number,
    pullRequestUrl: pull.html_url,
  }, 201);
});
