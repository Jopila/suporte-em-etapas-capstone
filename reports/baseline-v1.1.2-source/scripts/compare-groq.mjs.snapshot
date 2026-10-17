// Comparação offline: nenhuma chamada à API e nenhum acesso ao conteúdo de .env.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import { loadCases, scoreCase } from '../src/evaluation.mjs';
import { loadKnowledge } from '../src/knowledge.mjs';
import { digest } from '../src/prompts.mjs';

const { values } = parseArgs({ options: {
  baseline: { type: 'string' }, candidate: { type: 'string' }, partial: { type: 'string' },
  manifest: { type: 'string' }, output: { type: 'string' },
  intermediate: { type: 'string' },
} });
for (const field of ['baseline', 'candidate', 'partial', 'manifest', 'output']) assert.ok(values[field], `missing_${field}`);
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const [baseline, candidate, oldDetails, newDetails, partial, manifest, dataset, knowledge] = await Promise.all([
  read(`${values.baseline}.json`), read(`${values.candidate}.json`),
  read(`${values.baseline}-details.json`), read(`${values.candidate}-details.json`),
  read(values.partial), read(values.manifest), loadCases(), loadKnowledge(),
]);
assert.equal(baseline.model, candidate.model);
assert.equal(baseline.repeat, 1); assert.equal(candidate.repeat, 1);
assert.equal(digest(dataset), manifest.dataset_hash);
assert.equal(digest(knowledge), manifest.knowledge_hash);
assert.equal(candidate.prompt_hash, manifest.prompt_hash);
for (const [file, expected] of Object.entries(manifest.files)) assert.equal(digest(await fs.readFile(file, 'utf8')), expected, `code_changed:${file}`);
const core = Object.keys(baseline.rates);
const intermediate = values.intermediate ? await read(`${values.intermediate}.json`) : null;
const sumUsage = cases => cases.reduce((sum, item) => {
  for (const key of Object.keys(sum)) sum[key] += item.result.metrics[key];
  return sum;
}, { requests: 0, prompt_tokens: 0, completion_tokens: 0, responses_without_usage: 0 });
function verify(report, details) {
  assert.equal(details.cases.length, 20);
  assert.deepEqual(details.cases.map(x => x.id), dataset.cases.map(x => x.id));
  assert.equal(new Set(details.cases.map(x => x.id)).size, 20);
  const usage = sumUsage(details.cases);
  for (const [key, value] of Object.entries(usage)) assert.equal(report.usage[key], value);
  assert.equal(usage.requests, details.http_attempts.length);
  assert.equal(report.usage.total_tokens, usage.prompt_tokens + usage.completion_tokens);
  return details.cases.map((saved, index) => {
    assert.deepEqual(saved.expected, dataset.cases[index].expected);
    assert.equal(saved.result.prompt_hash, report.prompt_hash);
    assert.equal(saved.result.knowledge_hash, manifest.knowledge_hash);
    assert.equal(saved.result.simulation, false);
    assert.equal(saved.result.requires_human_approval, true);
    assert.equal(saved.result.auto_sent, false);
    const score = scoreCase(dataset.cases[index], saved.result, knowledge);
    for (const field of core) assert.equal(score.checks[field], saved.checks[field], `${saved.id}:${field}`);
    return { id: saved.id, ...score, core_passed: core.every(key => score.checks[key]),
      tokens: saved.result.metrics.prompt_tokens + saved.result.metrics.completion_tokens,
      requests: saved.result.metrics.requests, revisions: saved.result.metrics.revisions,
      status: saved.result.status };
  });
}
const oldRows = verify(baseline, oldDetails), newRows = verify(candidate, newDetails);
for (const [index, row] of newRows.entries()) assert.deepEqual(row.checks, newDetails.cases[index].checks);
assert.equal(candidate.passed, newRows.filter(x => x.passed).length);
assert.equal(baseline.passed, oldRows.filter(x => x.core_passed).length);
const round = value => Math.round(value * 100) / 100;
const extraUsage = {};
for (const key of ['requests', 'prompt_tokens', 'completion_tokens', 'total_tokens']) extraUsage[key] = candidate.usage[key] + partial.usage[key] + (intermediate?.usage[key] ?? 0);
const result = {
  generated_at: new Date().toISOString(), model: candidate.model, dataset_hash: manifest.dataset_hash,
  knowledge_hash: manifest.knowledge_hash, same_cases_and_labels: true, source_hashes_verified: true,
  baseline: { version: baseline.prompt_version, original_passed: baseline.passed, rescored_passed: oldRows.filter(x => x.passed).length,
    content_passed: oldRows.filter(x => x.checks.content).length, usage: baseline.usage, rows: oldRows },
  candidate: { version: candidate.pipeline_version ?? candidate.prompt_version, prompt_version: candidate.prompt_version, passed: candidate.passed, core_passed: newRows.filter(x => x.core_passed).length,
    content_passed: newRows.filter(x => x.checks.content).length, usage: candidate.usage,
    thresholds_passed: candidate.thresholds_passed, failed: newRows.filter(x => !x.passed), rows: newRows },
  token_delta: candidate.usage.total_tokens - baseline.usage.total_tokens,
  token_delta_percent: round((candidate.usage.total_tokens / baseline.usage.total_tokens - 1) * 100),
  partial_iteration: partial, intermediate_iteration: intermediate ? { version: intermediate.prompt_version, passed: intermediate.passed, cases: intermediate.cases, usage: intermediate.usage } : null, total_this_request: extraUsage,
  timings_ms: { baseline_batch: baseline.batch_wall_ms, candidate_batch: candidate.batch_wall_ms,
    baseline_pacing: baseline.pacing_wait_ms, candidate_pacing: candidate.pacing_wait_ms,
    candidate_stage_pacing: candidate.stage_pacing_wait_ms,
    candidate_pipeline_sum: newDetails.cases.reduce((sum, x) => sum + x.result.metrics.duration_ms, 0) },
};
const fmt = value => value.toLocaleString('pt-BR');
const outcome = row => row.core_passed ? 'Passou' : Object.entries(row.checks).filter(([name, ok]) => core.includes(name) && !ok).map(([name]) => name).join(', ');
const markdown = `# Comparação das matrizes no Groq

Modelo: ${candidate.model}. Mesmos 20 casos, gabaritos e base. Uma execução por caso em cada rodada completa.

| Indicador | Original ${baseline.prompt_version} | Corrigida ${result.candidate.version} |
|---|---:|---:|
| Casos aprovados pelas oito métricas originais | ${baseline.passed}/20 | ${result.candidate.core_passed}/20 |
| Casos aprovados pelo avaliador ampliado atual | ${result.baseline.rescored_passed}/20 (reanálise offline) | ${candidate.passed}/20 |
| Chamadas | ${baseline.usage.requests} | ${candidate.usage.requests} |
| Tokens de entrada | ${fmt(baseline.usage.prompt_tokens)} | ${fmt(candidate.usage.prompt_tokens)} |
| Tokens de saída | ${fmt(baseline.usage.completion_tokens)} | ${fmt(candidate.usage.completion_tokens)} |
| Tokens totais | ${fmt(baseline.usage.total_tokens)} | ${fmt(candidate.usage.total_tokens)} |

Variação de tokens entre rodadas completas: ${fmt(result.token_delta)} (${fmt(result.token_delta_percent)}%). Metas agregadas da nova rodada: ${candidate.thresholds_passed ? 'atingidas' : 'não atingidas'}.

O avaliador ampliado acrescenta padrões de conteúdo às verificações originais. É uma triagem conservadora que compartilha regras com o pipeline; não é avaliação semântica independente. A pontuação original não foi alterada.

## Resultado e tokens por caso

| Caso | Critérios originais antes | Critérios originais depois | Tokens antes | Tokens depois | Diferença |
|---|---|---|---:|---:|---:|
${newRows.map((row, i) => `| ${row.id} | ${outcome(oldRows[i])} | ${outcome(row)} | ${fmt(oldRows[i].tokens)} | ${fmt(row.tokens)} | ${fmt(row.tokens - oldRows[i].tokens)} |`).join('\n')}

## Consumo da correção

A rodada parcial 1.1.0 foi encerrada entre casos, após ${partial.cases} casos e ${partial.usage.requests} chamadas. Consumiu ${fmt(partial.usage.total_tokens)} tokens, preservados no checkpoint. Esses valores não entram na comparação das matrizes completas.

${intermediate ? `A rodada completa intermediária ${intermediate.prompt_version} registrou ${intermediate.passed}/20 aprovações e ${fmt(intermediate.usage.total_tokens)} tokens em ${intermediate.usage.requests} chamadas. Foi preservada após a identificação do falso positivo de C15.\n` : ''}
**Total desta solicitação (iterações de correção + rodada completa final): ${fmt(extraUsage.total_tokens)} tokens**, sendo ${fmt(extraUsage.prompt_tokens)} de entrada e ${fmt(extraUsage.completion_tokens)} de saída, em ${extraUsage.requests} chamadas. Exclui a matriz original e o teste isolado anterior.

## Auditoria

Os 20 IDs, rótulos, pontuações, chamadas, tokens e hashes foram reconciliados. Arquivos de código, prompts e testes da versão avaliada correspondem ao manifesto salvo antes da execução. Os resultados originais foram preservados.

Veja também a [análise das correções e das respostas](../docs/COMPARACAO_GROQ_CORRECOES.md).
`;
await fs.writeFile(`${values.output}.json`, JSON.stringify(result, null, 2) + '\n');
await fs.writeFile(`${values.output}.md`, markdown);
console.log(JSON.stringify({ baseline_passed: baseline.passed, candidate_passed: candidate.passed,
  baseline_rescored: result.baseline.rescored_passed, candidate_usage: candidate.usage,
  token_delta: result.token_delta, token_delta_percent: result.token_delta_percent,
  total_this_request: extraUsage, failed: result.candidate.failed, audit: 'passed' }, null, 2));
