// Comparação offline de uma seleção fixa; preserva falhas de transporte e consumo.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { loadCases, scoreCase } from '../src/evaluation.mjs';
import { loadKnowledge } from '../src/knowledge.mjs';
import { digest, loadPrompts } from '../src/prompts.mjs';
import { PIPELINE_VERSION } from '../src/pipeline.mjs';

const { values } = parseArgs({ options: {
  baseline: { type: 'string' }, manifest: { type: 'string' }, preservation: { type: 'string' },
  checkpoint: { type: 'string', multiple: true }, output: { type: 'string' },
} });
for (const key of ['baseline', 'manifest', 'preservation', 'checkpoint', 'output']) assert.ok(values[key], `missing_${key}`);
const read = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const hash = async p => createHash('sha256').update(await fs.readFile(p)).digest('hex');
const usage = entries => {
  const total = { requests: 0, prompt_tokens: 0, completion_tokens: 0, responses_without_usage: 0 };
  for (const e of entries) for (const k of Object.keys(total)) total[k] += e.result.metrics[k] ?? 0;
  return { ...total, total_tokens: total.prompt_tokens + total.completion_tokens };
};
const statusCounts = attempts => attempts.reduce((counts, a) => ({ ...counts, [a.status]: (counts[a.status] ?? 0) + 1 }), {});
const [baseline, manifest, preserved, dataset, knowledge, prompts] = await Promise.all([
  read(values.baseline), read(values.manifest), read(values.preservation), loadCases(), loadKnowledge(), loadPrompts(),
]);
assert.equal(manifest.pipeline_version, PIPELINE_VERSION);
assert.equal(manifest.prompt_hash, prompts.hash);
assert.equal(manifest.dataset_hash, digest(dataset));
assert.equal(manifest.knowledge_hash, digest(knowledge));
assert.equal(baseline.model, manifest.model);
assert.equal(baseline.dataset_hash, manifest.dataset_hash);
assert.equal(baseline.knowledge_hash, manifest.knowledge_hash);
for (const [p, h] of Object.entries(manifest.files)) assert.equal(await hash(p), h, p);
for (const [p, h] of Object.entries(preserved.historical_artifacts_sha256)) assert.equal(await hash(p), h, p);
const selected = manifest.selected_case_ids;
assert.ok(selected.length && new Set(selected).size === selected.length);
assert.deepEqual(selected, preserved.selected_case_ids);
assert.equal(new Set(values.checkpoint).size, values.checkpoint.length);
const before = new Map();
for (const id of selected) {
  const row = baseline.rows.find(r => r.id === id);
  assert.ok(row?.canonical_artifact);
  const entry = await read(row.canonical_artifact);
  assert.equal(await hash(row.canonical_artifact), preserved.previous_completed_artifacts[row.canonical_artifact]);
  assert.deepEqual(entry.expected, dataset.cases.find(c => c.id === id).expected);
  before.set(id, { entry, artifact: row.canonical_artifact, rescored: scoreCase(dataset.cases.find(c => c.id === id), entry.result, knowledge) });
}
const segments = [], allEntries = [], allHttp = [], completed = new Map();
for (const checkpoint of values.checkpoint) {
  const cp = await read(checkpoint);
  assert.equal(cp.completed_cases, cp.cases.length);
  assert.equal(new Set(cp.cases.map(e => e.id)).size, cp.cases.length);
  for (const e of cp.cases) {
    assert.ok(selected.includes(e.id));
    const testCase = dataset.cases.find(c => c.id === e.id);
    const artifact = checkpoint.replace(/-checkpoint\.json$/, `-cases/${e.id}.json`);
    assert.deepEqual(await read(artifact), e);
    assert.deepEqual(e.expected, testCase.expected);
    assert.equal(e.result.pipeline_version, manifest.pipeline_version);
    assert.equal(e.result.prompt_hash, manifest.prompt_hash);
    assert.equal(e.result.knowledge_hash, manifest.knowledge_hash);
    assert.equal(e.result.model, manifest.model);
    assert.equal(e.result.requires_human_approval, true);
    assert.equal(e.result.auto_sent, false);
    const score = scoreCase(testCase, e.result, knowledge);
    assert.deepEqual(score.checks, e.checks);
    assert.equal(score.passed, e.passed);
    assert.ok(e.result.metrics.requests >= cp.http_attempts.filter(a => a.case_id === e.id).length);
    if (!e.result.operational_error) {
      assert.ok(!completed.has(e.id), `duplicate_completed_case:${e.id}`);
      completed.set(e.id, { entry: e, artifact });
    }
  }
  for (const a of cp.http_attempts) assert.ok(cp.cases.some(e => e.id === a.case_id));
  const sum = usage(cp.cases);
  assert.ok(sum.requests >= cp.http_attempts.length);
  segments.push({ checkpoint, sha256: await hash(checkpoint), started_at: cp.started_at, usage: sum,
    recorded_cases: cp.cases.length, completed_case_ids: cp.cases.filter(e => !e.result.operational_error).map(e => e.id),
    http_status_counts: statusCounts(cp.http_attempts), attempts_without_http_response: sum.requests - cp.http_attempts.length });
  allEntries.push(...cp.cases); allHttp.push(...cp.http_attempts);
}
const rows = selected.map(id => {
  const old = before.get(id), current = completed.get(id);
  return { id, baseline_artifact: old.artifact, baseline_historical_passed: old.entry.passed,
    baseline_rescored_checks: old.rescored.checks, baseline_rescored_issues: old.rescored.content_issues,
    baseline_completed_usage: usage([old.entry]), candidate_artifact: current?.artifact ?? null,
    candidate_passed: current?.entry.passed ?? null, candidate_checks: current?.entry.checks ?? null,
    candidate_completed_usage: current ? usage([current.entry]) : null,
    candidate_all_attempts_usage: usage(allEntries.filter(e => e.id === id)) };
});
const pending = selected.filter(id => !completed.has(id));
const allUsage = usage(allEntries);
const completedUsage = usage([...completed.values()].map(e => e.entry));
const interruptedUsage = usage(allEntries.filter(e => e.result.operational_error));
for (const key of Object.keys(allUsage)) assert.equal(allUsage[key], completedUsage[key] + interruptedUsage[key]);
const beforeUsage = usage([...before.values()].map(e => e.entry));
const complete = pending.length === 0;
const result = {
  generated_at: new Date().toISOString(), network_calls_in_comparison: 0,
  scope: selected.length === dataset.cases.length
    ? `Escopo planejado: matriz de ${selected.length} casos na nova versão. Concluídos e pendentes são discriminados; resultados antigos servem apenas como comparação.`
    : `Somente os ${selected.length} casos selecionados na nova versão; os outros ${dataset.cases.length - selected.length} casos não foram reavaliados.`,
  baseline_version: baseline.pipeline_version, candidate_version: PIPELINE_VERSION, prompt_version: prompts.version,
  model: manifest.model, prompt_hash: prompts.hash, dataset_hash: manifest.dataset_hash, knowledge_hash: manifest.knowledge_hash,
  manifest: values.manifest, preservation: values.preservation, selected_case_ids: selected, complete,
  completed_cases: completed.size, passed_completed_cases: [...completed.values()].filter(e => e.entry.passed).length,
  pending_case_ids: pending, baseline_historical_passed: [...before.values()].filter(e => e.entry.passed).length,
  baseline_passed_by_current_evaluator: [...before.values()].filter(e => e.rescored.passed).length,
  baseline_completed_usage: beforeUsage, candidate_completed_usage: completedUsage, candidate_all_attempts_usage: allUsage,
  operationally_interrupted_usage: interruptedUsage, http_status_counts: statusCounts(allHttp),
  attempts_without_http_response: allUsage.requests - allHttp.length,
  token_delta_completed: complete ? completedUsage.total_tokens - beforeUsage.total_tokens : null,
  token_delta_percent_completed: complete ? Math.round((completedUsage.total_tokens / beforeUsage.total_tokens - 1) * 10000) / 100 : null,
  previous_correction_cycle_tokens: preserved.previous_cycle_tokens,
  correction_cycle_tokens_including_this_request: preserved.previous_cycle_tokens + allUsage.total_tokens,
  previous_historical_tokens: preserved.previous_historical_tokens,
  total_documented_historical_tokens: preserved.previous_historical_tokens + allUsage.total_tokens,
  historical_artifacts_verified: Object.keys(preserved.historical_artifacts_sha256).length,
  previous_completed_results_unchanged: Object.keys(preserved.previous_completed_artifacts).length,
  canonical_artifacts_sha256: Object.fromEntries(await Promise.all([...completed.values()].map(async e => [e.artifact, await hash(e.artifact)]))),
  comparison_script_sha256: await hash('scripts/compare-groq-selected.mjs'), segments, rows,
  caveats: ['Tokens informados pelo provedor; tentativas sem resposta HTTP ou sem usage não comprovam consumo ou custo nulo.',
    'A pontuação histórica permanece preservada. Reavaliação offline usa as novas regras compartilhadas com o pipeline, não um juiz independente.',
    'Uma execução concluída por caso não mede consistência ou generalização. Rascunhos exigem revisão humana.'],
};
const fmt = n => n.toLocaleString('pt-BR');
const lines = [
  `# Reavaliação ${selected.length === dataset.cases.length ? 'da matriz' : 'seletiva'} — Groq / ${PIPELINE_VERSION}`, '', `Gerado: ${result.generated_at}. Comparação offline, sem chamadas à API.`, '',
  `**${completed.size}/${selected.length} concluídos; ${result.passed_completed_cases} aprovados.** Pendentes: ${pending.join(', ') || 'nenhum'}.`, '',
  `Escopo: ${selected.join(', ')}. ${result.scope}`, '',
  `As respostas antigas mantêm ${result.baseline_historical_passed}/${selected.length} aprovações históricas; sob as novas regras, passam ${result.baseline_passed_by_current_evaluator}/${selected.length}.`, '',
  '| Caso | Ressalva detectada na saída antiga | Novo resultado | Tokens antigos concluídos | Tokens novos concluídos | Tokens em todas as novas tentativas |',
  '|---|---|---|---:|---:|---:|',
  ...rows.map(r => `| ${r.id} | ${r.baseline_rescored_issues.join(', ')} | ${r.candidate_passed === null ? 'Pendente' : r.candidate_passed ? 'Passou' : 'Falhou'} | ${fmt(r.baseline_completed_usage.total_tokens)} | ${r.candidate_completed_usage ? fmt(r.candidate_completed_usage.total_tokens) : '—'} | ${fmt(r.candidate_all_attempts_usage.total_tokens)} |`), '',
  '## Consumo', '',
  `- ${selected.length} resultados antigos concluídos: **${fmt(beforeUsage.total_tokens)} tokens**.`,
  `- Novos resultados concluídos: **${fmt(completedUsage.total_tokens)} tokens**.`,
  `- Todas as tentativas desta solicitação: **${fmt(allUsage.total_tokens)} tokens**.`,
  `- Ciclo de correções e retomadas atualizado: **${fmt(result.correction_cycle_tokens_including_this_request)} tokens**.`,
  `- Histórico completo atualizado: **${fmt(result.total_documented_historical_tokens)} tokens**.`, '',
  `Tentativas registradas pelo cliente: ${allUsage.requests}; respostas HTTP: ${allHttp.length}; tentativas sem resposta HTTP: ${result.attempts_without_http_response}.`, '',
  ...result.caveats.map(c => `- ${c}`), '',
];
await fs.writeFile(`${values.output}.json`, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
await fs.writeFile(`${values.output}.md`, lines.join('\n'), { flag: 'wx' });
console.log(JSON.stringify({ output: values.output, complete, passed: result.passed_completed_cases, pending,
  request_tokens: allUsage.total_tokens, historical_tokens: result.total_documented_historical_tokens }));
