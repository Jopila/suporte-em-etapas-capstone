// Auditoria offline: não chama APIs nem modifica resultados de experimentos.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { loadCases, scoreCase } from '../src/evaluation.mjs';
import { loadKnowledge } from '../src/knowledge.mjs';
import { loadPrompts, digest } from '../src/prompts.mjs';

const root = new URL('../', import.meta.url);
const prefix = 'reports/groq-matrix-v1.2.1-20b-entrega-2026-10-17';
const read = path => readFile(new URL(path, root));
const json = async path => JSON.parse(await read(path));
const hash = async path => createHash('sha256').update(await read(path)).digest('hex');
const save = async (path, value) => writeFile(new URL(path, root), JSON.stringify(value, null, 2) + '\n');
const [manifest, preservation, report, checkpoint, details, dataset, knowledge, prompts, demo, inspection] = await Promise.all([
  json('reports/groq-v1.2.1-20b-run-manifest.json'), json('reports/entrega-preservation-2026-10-17.json'),
  json(prefix + '.json'), json(prefix + '-checkpoint.json'), json(prefix + '-details.json'),
  loadCases(), loadKnowledge(), loadPrompts(), json('reports/demo-entrega-v1.2.1.json'),
  json('reports/entrega-response-inspection.json'),
]);
for (const [path, expected] of Object.entries(manifest.files)) assert.equal(await hash(path), expected, `frozen_file_changed:${path}`);
for (const [path, expected] of Object.entries(preservation.historical_artifacts_sha256)) assert.equal(await hash(path), expected, `historical_file_changed:${path}`);
for (const item of Object.values(preservation.document_snapshots)) assert.equal(await hash(item.snapshot), item.sha256, `snapshot_changed:${item.snapshot}`);
assert.equal(prompts.hash, manifest.prompt_hash);
assert.equal(digest(dataset), manifest.dataset_hash);
assert.equal(digest(knowledge), manifest.knowledge_hash);
assert.equal(report.model, manifest.model);
assert.equal(report.simulation, false);
assert.equal(report.prompt_hash, prompts.hash);
assert.equal(report.pipeline_version, '1.2.1');
assert.equal(report.evaluator_version, '1.2.1');
assert.equal(report.cases, 20);
assert.equal(report.runs, 20);
assert.equal(checkpoint.completed_cases, 20);
assert.equal(new Set(checkpoint.cases.map(x => x.id)).size, 20);
assert.deepEqual(checkpoint.cases.map(x => x.id), manifest.selected_case_ids);
assert.deepEqual(checkpoint.cases, details.cases);
assert.deepEqual(checkpoint.http_attempts, details.http_attempts);
assert.deepEqual(inspection.cases.map(x => x.id), manifest.selected_case_ids);

const rows = [];
for (const item of checkpoint.cases) {
  const original = dataset.cases.find(x => x.id === item.id);
  const result = item.result;
  assert.deepEqual(item.expected, original.expected);
  assert.deepEqual(await json(`${prefix}-cases/${item.id}.json`), item);
  assert.equal(result.model, manifest.model);
  assert.equal(result.pipeline_version, manifest.pipeline_version);
  assert.equal(result.prompt_hash, manifest.prompt_hash);
  assert.equal(result.knowledge_hash, manifest.knowledge_hash);
  assert.equal(result.requires_human_approval, true);
  assert.equal(result.auto_sent, false);
  const rescored = scoreCase(original, result, knowledge);
  assert.deepEqual(rescored, { checks: item.checks, content_issues: item.content_issues, passed: item.passed });
  const summary = report.rows.find(x => x.id === item.id);
  assert.deepEqual(summary.metrics, result.metrics);
  assert.deepEqual(summary.checks, item.checks);
  assert.equal(summary.passed, item.passed);
  assert.equal(checkpoint.http_attempts.filter(x => x.case_id === item.id).length, result.metrics.requests);
  rows.push({ id: item.id, category: result.triage?.category ?? null, priority: result.triage?.priority ?? null,
    status: result.status, passed: item.passed, checks: item.checks, operational_error: result.operational_error,
    requests: result.metrics.requests, prompt_tokens: result.metrics.prompt_tokens,
    completion_tokens: result.metrics.completion_tokens,
    tokens: result.metrics.prompt_tokens + result.metrics.completion_tokens,
    revisions: result.metrics.revisions, response: result.response, source_ids: result.source_ids,
    source_path: `${prefix}-cases/${item.id}.json`, source_sha256: await hash(`${prefix}-cases/${item.id}.json`) });
}
for (const key of ['requests', 'prompt_tokens', 'completion_tokens']) assert.equal(rows.reduce((s, x) => s + x[key], 0), report.usage[key]);
assert.equal(rows.reduce((s, x) => s + x.tokens, 0), report.usage.total_tokens);
assert.equal(rows.filter(x => x.passed).length, report.passed);
for (const key of Object.keys(report.rates)) assert.equal(rows.filter(x => x.checks[key]).length / rows.length, report.rates[key]);
const statuses = {};
for (const event of checkpoint.http_attempts) statuses[event.status] = (statuses[event.status] ?? 0) + 1;
assert.deepEqual(statuses, report.http_status_counts);
// Nesta rodada, ausência de 429 significa que nenhuma espera Retry-After foi exigida.
assert.equal(statuses[429] ?? 0, 0);
assert.equal(report.operational_errors.length, 0);
assert.equal(demo.simulation, true);
assert.equal(demo.prompt_hash, manifest.prompt_hash);
assert.equal(demo.passed, 60);
assert.equal(demo.runs, 60);
const tap = (await read('reports/test-results-entrega-v1.2.1.tap')).toString('utf8');
assert.match(tap, /^# tests 79$/m);
assert.match(tap, /^# pass 79$/m);
assert.match(tap, /^# fail 0$/m);

const old = await json(preservation.previous_120b_comparison);
assert.equal(old.total_documented_historical_tokens, preservation.previous_historical_tokens);
assert.equal(old.correction_cycle_tokens_including_this_request, preservation.previous_cycle_tokens);
const evidence = {
  generated_at: new Date().toISOString(), scope: 'Entrega acadêmica: avaliação independente do pipeline 1.2.1 no Groq 20B; histórico 120B preservado.',
  network_calls_in_audit: 0,
  tests: { passed: 79, failed: 0, path: 'reports/test-results-entrega-v1.2.1.tap' },
  demo: { cases: 20, runs: 60, passed: 60, simulation: true, path: 'reports/demo-entrega-v1.2.1.json' },
  matrix: { model: report.model, pipeline_version: report.pipeline_version, prompt_hash: report.prompt_hash,
    dataset_hash: manifest.dataset_hash, knowledge_hash: manifest.knowledge_hash,
    cases: report.cases, passed: report.passed, api_cases: report.cases_with_api_calls,
    local_case_ids: report.cases_handled_locally, rates: report.rates, thresholds_passed: report.thresholds_passed,
    usage: report.usage, http_status_counts: statuses, operational_errors: report.operational_errors,
    batch_wall_ms: report.batch_wall_ms, pacing_wait_ms: report.pacing_wait_ms, latency_ms: report.latency_ms,
    started_at: report.started_at, finished_at: report.generated_at, report_path: prefix + '.json' },
  historical_120b: { model: old.model, completed_cases: old.completed_cases, pending_case_ids: old.pending_case_ids,
    version_tokens: old.candidate_all_attempts_usage.total_tokens, comparison_path: preservation.previous_120b_comparison },
  consumption: { new_tokens: report.usage.total_tokens, cycle_before: preservation.previous_cycle_tokens,
    cycle_total: preservation.previous_cycle_tokens + report.usage.total_tokens,
    historical_before: preservation.previous_historical_tokens,
    historical_total: preservation.previous_historical_tokens + report.usage.total_tokens,
    historical_baseline_path: preservation.previous_120b_comparison,
    note: 'Somente tokens informados; tentativas sem usage não são estimadas. Totais não são custo monetário.' },
  integrity: { frozen_files_verified: Object.keys(manifest.files).length,
    historical_files_unchanged: Object.keys(preservation.historical_artifacts_sha256).length,
    documentation_snapshots_unchanged: Object.keys(preservation.document_snapshots).length,
    cases_rescored: rows.length, case_files_match_checkpoint: true, token_sums_reconciled: true,
    source_hashes: Object.fromEntries(await Promise.all([
      prefix + '.json', prefix + '-checkpoint.json', prefix + '-details.json',
      'reports/groq-v1.2.1-20b-run-manifest.json', 'reports/entrega-response-inspection.json',
      'scripts/evaluate-groq-20b.mjs', 'scripts/audit-capstone-delivery.mjs',
    ].map(async path => [path, await hash(path)]))) },
  inspection_summary: inspection.summary,
  cases: rows,
};
await save('reports/entrega-evidence.json', evidence);
console.log(JSON.stringify({ passed: report.passed, cases: report.cases, new_tokens: evidence.consumption.new_tokens,
  historical_total: evidence.consumption.historical_total, preserved_files: evidence.integrity.historical_files_unchanged,
  output: fileURLToPath(new URL('reports/entrega-evidence.json', root)) }, null, 2));
