// Experimento independente; não altera .env.local nem os resultados do 120B.
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const { values } = parseArgs({ options: { 'dry-run': { type: 'boolean' }, output: { type: 'string' } } });
const root = fileURLToPath(new URL('../', import.meta.url));
const env = { ...process.env, GROQ_MODEL: 'openai/gpt-oss-20b', GROQ_RESPONSE_FORMAT: 'json_schema' };
const launch = args => {
  const run = spawnSync(process.execPath, ['--env-file=.env.local', ...args], { cwd: root, env, stdio: 'inherit', shell: false });
  if (run.error) throw new Error('evaluation_process_failed');
  if (run.status !== 0) process.exit(run.status ?? 1);
};
launch(['scripts/evaluate-groq-remainder.mjs', '--from-case', 'C01',
  '--manifest', 'reports/groq-v1.2.1-20b-run-manifest.json', '--dry-run']);
if (!values['dry-run']) launch(['scripts/evaluate-groq-matrix.mjs', '--output',
  values.output ?? 'reports/groq-matrix-v1.2.1-20b-entrega-2026-10-17']);
