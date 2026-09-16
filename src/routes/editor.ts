import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types';
import { fail, ok } from '../lib/response';
import { requireAuth } from '../middleware/auth';


const pullNumberSchema = z.coerce.number().int().positive();
const mergeSchema = z.object({
  confirmation: z.literal('PUBLICAR'),
  expectedHeadSha: z.string().regex(/^[0-9a-f]{40}$/i),
});

const publicGithubHeaders = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'DejotaCode-Editor',
};

type WorkflowRun = { status?: string; conclusion?: string | null; html_url?: string };
const readCi = async (owner: string, repo: string, sha: string) => {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/runs?head_sha=${encodeURIComponent(sha)}&event=pull_request&per_page=10`,
    { headers: publicGithubHeaders },
  );
  if (!response.ok) return { state: 'unknown' as const, runs: [] as WorkflowRun[] };
  const payload = await response.json() as { workflow_runs?: WorkflowRun[] };
  const runs = payload.workflow_runs ?? [];
  if (!runs.length) return { state: 'pending' as const, runs };
  if (runs.some((run) => run.status !== 'completed')) return { state: 'pending' as const, runs };
  if (runs.every((run) => run.conclusion === 'success')) return { state: 'success' as const, runs };
  return { state: 'failure' as const, runs };
};

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


editor.get('/pull-request/:number', async (c) => {
  const number = pullNumberSchema.safeParse(c.req.param('number'));
  if (!number.success) return fail(c, 'VALIDATION_ERROR', 'Pull Request inválido.', 400);
  const token = c.env.GITHUB_EDITOR_TOKEN?.trim();
  if (!token) return fail(c, 'GITHUB_NOT_CONFIGURED', 'A integração editorial com GitHub ainda não foi configurada.', 503);
  const repository = c.env.GITHUB_EDITOR_REPO || 'Dejotacode/dejotacode';
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) return fail(c, 'GITHUB_REPO_INVALID', 'Repositório editorial inválido.', 500);
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${number.data}`, { headers: githubHeaders(token) });
  if (!response.ok) return fail(c, 'GITHUB_PR_READ_FAILED', 'Não foi possível consultar o Pull Request.', 502);
  const pull = await response.json() as { state?: string; merged?: boolean; mergeable?: boolean | null; html_url?: string; head?: { sha?: string } };
  const sha = pull.head?.sha ?? '';
  const ci = sha ? await readCi(owner, repo, sha) : { state: 'unknown' as const, runs: [] as WorkflowRun[] };
  return ok(c, { number: number.data, state: pull.state, merged: Boolean(pull.merged), mergeable: pull.mergeable ?? null, url: pull.html_url, headSha: sha, ci: ci.state, workflowUrl: ci.runs[0]?.html_url ?? null });
});

editor.post('/pull-request/:number/merge', async (c) => {
  const number = pullNumberSchema.safeParse(c.req.param('number'));
  const confirmation = mergeSchema.safeParse(await c.req.json());
  if (!number.success || !confirmation.success) return fail(c, 'VALIDATION_ERROR', 'Confirmação de publicação inválida.', 400);
  const token = c.env.GITHUB_EDITOR_TOKEN?.trim();
  if (!token) return fail(c, 'GITHUB_NOT_CONFIGURED', 'A integração editorial com GitHub ainda não foi configurada.', 503);
  const repository = c.env.GITHUB_EDITOR_REPO || 'Dejotacode/dejotacode';
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) return fail(c, 'GITHUB_REPO_INVALID', 'Repositório editorial inválido.', 500);
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const headers = githubHeaders(token);
  const prResponse = await fetch(`${base}/pulls/${number.data}`, { headers });
  if (!prResponse.ok) return fail(c, 'GITHUB_PR_READ_FAILED', 'Não foi possível consultar o Pull Request.', 502);
  const pull = await prResponse.json() as {
    state?: string;
    merged?: boolean;
    mergeable?: boolean | null;
    title?: string;
    base?: { ref?: string };
    head?: { ref?: string; sha?: string };
  };
  if (pull.merged || pull.state !== 'open') return fail(c, 'GITHUB_PR_NOT_OPEN', 'Este Pull Request não está aberto para publicação.', 409);
  if (pull.base?.ref !== 'main') return fail(c, 'GITHUB_PR_BASE_INVALID', 'A publicação só aceita Pull Requests destinados à main.', 409);
  if (!pull.head?.ref?.startsWith('content/admin-')) return fail(c, 'GITHUB_PR_HEAD_INVALID', 'A publicação só aceita branches editoriais criadas pelo Admin.', 409);
  if (pull.mergeable === false) return fail(c, 'GITHUB_PR_CONFLICT', 'O Pull Request possui conflito e precisa de revisão manual.', 409);
  const sha = pull.head?.sha ?? '';
  if (!sha) return fail(c, 'GITHUB_PR_HEAD_MISSING', 'Não foi possível identificar o commit do Pull Request.', 502);
  if (sha.toLowerCase() !== confirmation.data.expectedHeadSha.toLowerCase()) {
    return fail(c, 'GITHUB_PR_HEAD_CHANGED', 'O Pull Request mudou desde a última revisão. Atualize o status e revise novamente antes de publicar.', 409);
  }
  const ci = await readCi(owner, repo, sha);
  if (ci.state !== 'success') return fail(c, 'CI_NOT_GREEN', 'A publicação só é liberada depois que o CI termina com sucesso.', 409);
  const mergeResponse = await fetch(`${base}/pulls/${number.data}/merge`, {
    method: 'PUT', headers, body: JSON.stringify({ merge_method: 'squash', commit_title: pull.title, sha }),
  });
  if (!mergeResponse.ok) return fail(c, 'GITHUB_MERGE_FAILED', 'O GitHub recusou o merge. Revise o Pull Request antes de tentar novamente.', 502);
  const merged = await mergeResponse.json() as { merged?: boolean; sha?: string; message?: string };
  if (!merged.merged) return fail(c, 'GITHUB_MERGE_FAILED', merged.message || 'O Pull Request não foi mesclado.', 409);
  return ok(c, { merged: true, sha: merged.sha, message: 'Pull Request mesclado. O deploy do Cloudflare Pages seguirá o fluxo da main.' });
});
