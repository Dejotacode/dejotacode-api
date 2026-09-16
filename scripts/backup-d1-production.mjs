import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const dryRun = process.argv.includes('--dry-run');
const root = process.cwd();
const backupDir = resolve(
  process.env.DEJOTACODE_BACKUP_DIR || resolve(root, '.backups', 'd1'),
);
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const sqlPath = resolve(backupDir, `dejotacode-production-${timestamp}.sql`);
const manifestPath = `${sqlPath}.json`;

const wranglerArgs = [
  '--no-install',
  'wrangler',
  'd1',
  'export',
  'DB',
  '--env',
  'production',
  '--remote',
  '--output',
  sqlPath,
];
const printableCommand = ['npx', ...wranglerArgs]
  .map((part) => (part.includes(' ') ? JSON.stringify(part) : part))
  .join(' ');

if (dryRun) {
  console.log('[backup:d1] DRY RUN');
  console.log(`[backup:d1] diretório: ${backupDir}`);
  console.log(`[backup:d1] arquivo SQL: ${sqlPath}`);
  console.log(`[backup:d1] comando: ${printableCommand}`);
  process.exit(0);
}

await mkdir(backupDir, { recursive: true });
console.log('[backup:d1] iniciando export remoto do D1 de produção');
console.log(`[backup:d1] destino local: ${sqlPath}`);
console.log('[backup:d1] nenhuma restauração será executada');

const result = spawnSync('npx', wranglerArgs, {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
if (result.error || result.status !== 0) {
  console.error('[backup:d1] export falhou; nenhum manifesto foi criado');
  process.exit(result.status || 1);
}

const sql = await readFile(sqlPath);
const fileStat = await stat(sqlPath);
const sha256 = createHash('sha256').update(sql).digest('hex');
const git = spawnSync('git', ['rev-parse', 'HEAD'], {
  cwd: root,
  encoding: 'utf8',
});
const gitCommit = git.status === 0 ? git.stdout.trim() : null;

const manifest = {
  createdAt: new Date().toISOString(),
  environment: 'production',
  databaseBinding: 'DB',
  gitCommit,
  outputFile: basename(sqlPath),
  bytes: fileStat.size,
  sha256,
  restoreExecuted: false,
};

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`[backup:d1] export concluído: ${sqlPath}`);
console.log(`[backup:d1] sha256: ${sha256}`);
console.log(`[backup:d1] manifesto: ${manifestPath}`);
