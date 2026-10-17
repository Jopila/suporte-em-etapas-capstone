import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { evaluate, loadCases, scoreCase, reportMarkdown } from '../src/evaluation.mjs';
import { DemoProvider } from '../src/providers/demo.mjs';
import { runPipeline } from '../src/pipeline.mjs';
import { loadKnowledge } from '../src/knowledge.mjs';

test('20 cenários sintéticos passam e repetição mede concordância de decisões', async () => {
  const report = await evaluate({ provider: new DemoProvider(), repeat: 3 });
  assert.equal(report.cases, 20);
  assert.equal(report.runs, 60);
  assert.equal(report.passed, 60);
  assert.equal(report.thresholds_passed, true);
  assert.equal(report.decision_agreement, 1);
  assert.equal(report.simulation, true);
  assert.match(reportMarkdown(report), /não mede a qualidade de um LLM/);
});

test('avaliador detecta regressão de categoria, prioridade, fontes e aprovação humana', async () => {
  const dataset = await loadCases();
  const result = await runPipeline(dataset.cases[0].ticket, { provider: new DemoProvider() });
  const corrupted = { ...result, triage: { ...result.triage, category: 'cobranca', priority: 'P4' }, source_ids: ['KB-999'], requires_human_approval: false };
  const score = scoreCase(dataset.cases[0], corrupted, await loadKnowledge());
  assert.equal(score.passed, false);
  for (const key of ['category', 'priority', 'citations', 'human_gate']) assert.equal(score.checks[key], false);
});

test('avaliador não confunde erro operacional com abstinência correta', async () => {
  const dataset = await loadCases();
  const item = dataset.cases.find(item => item.id === 'C08');
  const result = await runPipeline(item.ticket, { provider: new DemoProvider() });
  const score = scoreCase(item, { ...result, operational_error: true }, await loadKnowledge());
  assert.equal(score.checks.contracts, false);
  assert.equal(score.passed, false);
});

test('uma execução não inventa métrica de consistência', async () => {
  const report = await evaluate({ provider: new DemoProvider(), limit: 1 });
  assert.equal(report.decision_agreement, null);
  await assert.rejects(() => evaluate({ provider: new DemoProvider(), repeat: 0 }), /invalid_repeat/);
});

test('avaliação aguarda os hooks e preserva a saída de cada caso sem repetir chamadas', async () => {
  const order = [];
  const saved = [];
  const report = await evaluate({
    provider: new DemoProvider(), limit: 2,
    beforeCase: async ({ testCase }) => { order.push(`before:${testCase.id}`); },
    onResult: async ({ testCase, result, score }) => {
      await Promise.resolve();
      order.push(`saved:${testCase.id}`);
      saved.push({ id: testCase.id, result, score });
    },
  });
  assert.deepEqual(order, ['before:C01', 'saved:C01', 'before:C02', 'saved:C02']);
  assert.equal(saved.length, 2);
  assert.ok(saved.every(item => item.result.response && item.score.passed));
  assert.equal(report.usage.requests, saved.reduce((sum, item) => sum + item.result.metrics.requests, 0));
});

test('CLI recusa provedor desconhecido e chave ausente sem fallback silencioso', () => {
  const cwd = fileURLToPath(new URL('..', import.meta.url));
  for (const [provider, code] of [['desconhecido', 'invalid_provider'], ['groq', 'missing_groq_key']]) {
    const result = spawnSync(process.execPath, ['src/cli.mjs', 'run', '--provider', provider, '--input', 'examples/chamado.json'], { cwd, encoding: 'utf8', env: { ...process.env, GROQ_API_KEY: '' } });
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes(code));
    assert.equal(result.stdout, '');
  }
});
