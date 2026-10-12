import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../src/routes/media.ts', import.meta.url), 'utf8');

const checks = [
  ['confirmação EXCLUIR', "confirmation: z.literal('EXCLUIR')"],
  ['objectKey obrigatório', 'objectKey: z.string().trim().min(1).max(1024)'],
  ['dryRunToken obrigatório', 'dryRunToken: z.string().trim().min(20).max(256)'],
  ['snapshotId obrigatório', 'snapshotId: z.number().int().positive()'],
  ['DELETE exige admin', "media.delete('/cms/:id', requireAdmin"],
  ['dry-run exige admin', "media.post('/cms/:id/delete-dry-run', requireAdmin"],
  ['snapshot exige admin', "media.post('/cms/:id/delete-snapshot', requireAdmin"],
  ['candidate + cleanup approved', "row.reviewStatus !== 'candidate' || row.cleanupStatus !== 'approved'"],
  ['objectKey exato', 'row.objectKey !== parsed.data.objectKey'],
  ['dry-run com validade', 'new Date(row.deleteCheckExpiresAt).getTime() <= Date.now()'],
  ['token do dry-run validado', 'await hashToken(parsed.data.dryRunToken) !== row.deleteCheckHash'],
  ['snapshot obrigatório', "MEDIA_DELETE_SNAPSHOT_REQUIRED"],
  ['snapshot ligado ao dry-run atual', 'snapshot.dryRunHash !== row.deleteCheckHash'],
  ['snapshot dentro da janela do dry-run', 'snapshotCreatedAt > new Date(row.deleteCheckExpiresAt).getTime()'],
  ['revalidação final antes de excluir', 'inspection = await inspectDeletionEligibility(c.env, row.objectKey)'],
  ['bloqueio se surgir nova referência', "MEDIA_DELETE_BLOCKED"],
  ['remoção no R2', 'await c.env.MEDIA.delete(row.objectKey)'],
  ['remoção de metadados no D1', "await c.env.DB.prepare('DELETE FROM media WHERE id=?').bind(id).run()"],
];

let failed = 0;
for (const [name, snippet] of checks) {
  if (!source.includes(snippet)) {
    failed += 1;
    console.error(`FAIL ${name}`);
  } else {
    console.log(`PASS ${name}`);
  }
}

const r2DeleteIndex = source.indexOf('await c.env.MEDIA.delete(row.objectKey)');
const d1DeleteIndex = source.indexOf("await c.env.DB.prepare('DELETE FROM media WHERE id=?').bind(id).run()");
if (r2DeleteIndex < 0 || d1DeleteIndex < 0 || r2DeleteIndex > d1DeleteIndex) {
  failed += 1;
  console.error('FAIL ordem de remoção R2 -> D1');
} else {
  console.log('PASS ordem de remoção R2 -> D1');
}

if (failed) {
  console.error(`Guardrails de exclusão falharam em ${failed} verificação(ões).`);
  process.exit(1);
}

console.log(`Guardrails de exclusão aprovados: ${checks.length + 1} verificações.`);
