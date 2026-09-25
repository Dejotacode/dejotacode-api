import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const backupDir = resolve(
  process.env.DEJOTACODE_BACKUP_DIR || resolve(root, '.backups', 'd1'),
);

let entries;
try {
  entries = await readdir(backupDir, { withFileTypes: true });
} catch (error) {
  if (error?.code === 'ENOENT') {
    console.error(`[verify:d1] diretório inexistente: ${backupDir}`);
    process.exit(2);
  }
  throw error;
}

const manifests = entries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.sql.json'))
  .map((entry) => entry.name)
  .sort();

if (manifests.length === 0) {
  console.error('[verify:d1] nenhum manifesto de backup encontrado');
  process.exit(2);
}

let failures = 0;
for (const manifestName of manifests) {
  const manifestPath = resolve(backupDir, manifestName);
  let manifest;

  try {
    manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  } catch (error) {
    failures += 1;
    console.error(`[verify:d1] FALHA manifesto inválido: ${manifestName}`);
    continue;
  }

  const required = ['outputFile', 'bytes', 'sha256', 'createdAt', 'environment'];
  const missing = required.filter((key) => manifest[key] === undefined || manifest[key] === null);
  if (missing.length > 0) {
    failures += 1;
    console.error(`[verify:d1] FALHA ${manifestName}: campos ausentes: ${missing.join(', ')}`);
    continue;
  }

  const sqlPath = resolve(backupDir, manifest.outputFile);
  try {
    const [sql, sqlStat] = await Promise.all([readFile(sqlPath), stat(sqlPath)]);
    const sha256 = createHash('sha256').update(sql).digest('hex');

    const sizeOk = sqlStat.size === Number(manifest.bytes);
    const hashOk = sha256 === manifest.sha256;

    if (!sizeOk || !hashOk) {
      failures += 1;
      console.error(
        `[verify:d1] FALHA ${manifest.outputFile}: tamanho=${sizeOk ? 'ok' : 'divergente'}, sha256=${hashOk ? 'ok' : 'divergente'}`,
      );
      continue;
    }

    console.log(
      `[verify:d1] OK ${manifest.outputFile} | ${sqlStat.size} bytes | ${sha256}`,
    );
  } catch (error) {
    failures += 1;
    console.error(`[verify:d1] FALHA ${manifest.outputFile}: arquivo SQL ausente ou ilegível`);
  }
}

if (failures > 0) {
  console.error(`[verify:d1] ${failures} backup(s) com falha`);
  process.exit(1);
}

console.log(`[verify:d1] PASSOU: ${manifests.length} backup(s) íntegros`);
