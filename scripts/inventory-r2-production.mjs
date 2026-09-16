import { spawnSync } from 'node:child_process';

const query = `
SELECT object_key, content_type, size_bytes, created_at
FROM media
ORDER BY id;
`;

const command = [
  '--no-install',
  'wrangler',
  'd1',
  'execute',
  'DB',
  '--env',
  'production',
  '--remote',
  '--command',
  query,
  '--json',
];

const result = spawnSync('npx', command, {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: process.env,
});

if (result.error || result.status !== 0) {
  process.stderr.write(result.stderr || 'Falha ao consultar metadados de mídia.\n');
  process.exit(result.status || 1);
}
const payload = JSON.parse(result.stdout);
const rows = payload?.[0]?.results ?? [];
const groups = { posts: 0, images: 0, downloads: 0, other: 0 };
const contentTypes = {};
let totalBytes = 0;

for (const row of rows) {
  totalBytes += Number(row.size_bytes || 0);
  const key = String(row.object_key || '');
  if (key.startsWith('posts/')) groups.posts += 1;
  else if (key.startsWith('images/')) groups.images += 1;
  else if (key.startsWith('downloads/')) groups.downloads += 1;
  else groups.other += 1;

  const type = String(row.content_type || 'unknown');
  const current = contentTypes[type] || { objects: 0, bytes: 0 };
  current.objects += 1;
  current.bytes += Number(row.size_bytes || 0);
  contentTypes[type] = current;
}

const failures = [];
let reachable = 0;
for (const row of rows) {
  const key = String(row.object_key || '');
  const url = `https://api.dejotacode.com.br/api/media/public/${key}`;
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 200) reachable += 1;
    else failures.push({ objectKey: key, status: response.status });
  } catch (error) {
    failures.push({ objectKey: key, error: error instanceof Error ? error.message : 'HEAD failed' });
  }
}
const createdAtValues = rows
  .map((row) => row.created_at)
  .filter(Boolean)
  .sort();

const summary = {
  source: 'D1 media metadata + public HEAD validation',
  environment: 'production',
  totalObjects: rows.length,
  totalBytes,
  groups,
  contentTypes,
  oldestAt: createdAtValues[0] ?? null,
  newestAt: createdAtValues.at(-1) ?? null,
  publicHead: {
    checked: rows.length,
    reachable,
    failed: failures.length,
    failures,
  },
  limitation: 'Não detecta objetos órfãos existentes no bucket R2 sem registro na tabela media.',
  mutation: false,
};

console.log(JSON.stringify(summary, null, 2));

if (failures.length > 0) process.exitCode = 2;
