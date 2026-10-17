// Retomada preparada: valida checkpoint, prazo mínimo, seleção e manifesto.
// Não agenda execução; uma segunda invocação real exige nova consolidação.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const { values } = parseArgs({ options: { 'dry-run': { type: 'boolean' } } });
const plan = JSON.parse(await fs.readFile(new URL('reports/groq-v1.2.1-resume-plan-retomada-2.json', root), 'utf8'));
for (const [path, expected] of Object.entries(plan.preserved_checkpoints)) {
  const actual = createHash('sha256').update(await fs.readFile(new URL(path, root))).digest('hex');
  if (actual !== expected) throw new Error('checkpoint_changed_reconsolidate_before_resuming');
}
if (!values['dry-run']) {
  if (Date.now() < Date.parse(plan.not_before_utc)) {
    console.error(JSON.stringify({ error: 'retry_after_not_elapsed', not_before: plan.not_before_local, network_calls: 0 }));
    process.exit(1);
  }
  for (const suffix of ['-cases', '-checkpoint.json', '.json', '.md']) {
    try {
      await fs.access(new URL(plan.output_prefix + suffix, root));
      throw new Error('resume_already_started_reconsolidate_remaining_cases');
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
const args = ['--env-file=.env.local', 'scripts/evaluate-groq-remainder.mjs',
  '--cases', plan.pending_case_ids.join(','), '--manifest', plan.manifest, '--output', plan.output_prefix];
if (values['dry-run']) args.push('--dry-run');
const result = spawnSync(process.execPath, args, { cwd: fileURLToPath(root), stdio: 'inherit', shell: false });
if (result.error) throw new Error('resume_process_failed');
process.exit(result.status ?? 1);
