// Retomada explícita de um trecho da matriz; não substitui um relatório completo.
// Avaliação serial com arquivo por caso, evidências das etapas e pausas entre
// casos. Não altera prompts, rótulos, parâmetros do modelo ou regras do pipeline.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { GroqProvider, integerSetting, retryAfterMs } from '../src/providers/groq.mjs';
import { evaluate, reportMarkdown, loadCases } from '../src/evaluation.mjs';
import { inspectTicket, redact } from '../src/safety.mjs';
import { loadKnowledge } from '../src/knowledge.mjs';
import { digest, loadPrompts } from '../src/prompts.mjs';
import { PIPELINE_VERSION } from '../src/pipeline.mjs';

function durationMs(value) {
  if (!value) return 0;
  const parts = [...value.matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h)/g)];
  const factors = { ms: 1, s: 1000, m: 60000, h: 3600000 };
  return parts.reduce((sum, match) => sum + Number(match[1]) * factors[match[2]], 0);
}

function scrub(value) {
  if (typeof value === 'string') return redact(value).text;
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrub(item)]));
  return value;
}

async function main() {
  const { values } = parseArgs({ options: {
    output: { type: 'string' }, 'from-case': { type: 'string' },
    cases: { type: 'string' }, manifest: { type: 'string' }, 'dry-run': { type: 'boolean' },
  } });
  const dataset = await loadCases();
  if (Boolean(values.cases) === Boolean(values['from-case'])) throw new Error('choose_cases_or_from_case');
  let selectedCases;
  if (values.cases) {
    const ids = values.cases.split(',').map(id => id.trim());
    if (new Set(ids).size !== ids.length || ids.some(id => !dataset.cases.some(item => item.id === id))) throw new Error('invalid_case_selection');
    selectedCases = dataset.cases.filter(item => ids.includes(item.id));
  } else {
    const first = dataset.cases.findIndex(item => item.id === values['from-case']);
    if (first < 0) throw new Error('invalid_start_case');
    selectedCases = dataset.cases.slice(first);
  }
  const selected = { ...dataset, cases: selectedCases };
  const bundle = await loadPrompts();
  if (values.manifest) {
    const manifest = JSON.parse(await readFile(values.manifest, 'utf8'));
    const knowledge = await loadKnowledge();
    for (const [path, expected] of Object.entries(manifest.files)) {
      const actual = createHash('sha256').update(await readFile(path)).digest('hex');
      if (actual !== expected) throw new Error('manifest_mismatch');
    }
    if (manifest.pipeline_version !== PIPELINE_VERSION || manifest.prompt_hash !== bundle.hash
      || manifest.dataset_hash !== digest(dataset) || manifest.knowledge_hash !== digest(knowledge)
      || manifest.model !== (process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b')
      || (process.env.GROQ_RESPONSE_FORMAT ?? 'json_schema') !== 'json_schema') throw new Error('manifest_mismatch');
  }
  // A seleção e a versão podem ser conferidas sem credencial, provedor ou escrita.
  if (values['dry-run']) {
    console.log(JSON.stringify({ dry_run: true, network_calls: 0, case_ids: selectedCases.map(item => item.id), pipeline_version: PIPELINE_VERSION, prompt_version: bundle.version, prompt_hash: bundle.hash, manifest_verified: Boolean(values.manifest) }, null, 2));
    return;
  }
  if (!values.output) throw new Error('output_required');
  const prefix = resolve(values.output);
  const caseDirectory = `${prefix}-cases`;
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const timeoutMs = integerSetting(process.env.PIPELINE_TIMEOUT_MS, 120000, 1000, 600000);
  const archive = [];
  const httpAttempts = [];
  let activeCase = null, activeStage = null, stageOutputs = [];
  let limits = null, blockedUntil = 0, pacingWaitMs = 0, stagePacingWaitMs = 0;
  const provider = new GroqProvider({ fetchImpl: async (url, init) => {
    const response = await fetch(url, init);
    const numeric = name => {
      const value = response.headers.get(name);
      return value !== null && Number.isFinite(Number(value)) ? Number(value) : null;
    };
    const wait = retryAfterMs(response.headers.get('retry-after'));
    if (response.status === 429 && wait !== null) blockedUntil = Math.max(blockedUntil, Date.now() + wait);
    limits = {
      observed_at_ms: Date.now(),
      token_limit: numeric('x-ratelimit-limit-tokens'),
      tokens_remaining: numeric('x-ratelimit-remaining-tokens'),
      token_reset_ms: durationMs(response.headers.get('x-ratelimit-reset-tokens')),
      requests_remaining: numeric('x-ratelimit-remaining-requests'),
    };
    httpAttempts.push({ case_id: activeCase, stage: activeStage, status: response.status, retry_after_ms: wait, ...limits });
    return response;
  } });
  const observedProvider = {
    name: provider.name, model: provider.model,
    complete: async request => {
      activeStage = request.stage;
      try {
        // Correções podem acrescentar etapas e exceder um minuto de cota.
        // Aguarde antes de iniciar o timeout HTTP, respeitando o timeout do pipeline.
        if (limits?.token_limit > 0 && limits.tokens_remaining !== null) {
          const estimatedTokens = Math.ceil(JSON.stringify({ messages: request.messages, schema: request.schema }).length / 2.5) + 768;
          const target = Math.min(estimatedTokens, limits.token_limit * 0.95);
          const readyAt = Math.max(blockedUntil, limits.tokens_remaining < target ? limits.observed_at_ms + limits.token_reset_ms + 500 : 0);
          const waitMs = Math.max(0, Math.ceil(readyAt - Date.now()));
          if (waitMs > 120000) throw new Error('rate_limit_wait_exceeds_batch_budget');
          if (waitMs > 0) {
            console.error(`${activeCase}/${activeStage}: aguardando ${Math.ceil(waitMs / 1000)} s para recompor a cota.`);
            const waitStart = performance.now();
            try {
              let remaining = waitMs;
              while (remaining > 0) { const chunk = Math.min(remaining, 30000); await delay(chunk, undefined, { signal: request.signal }); remaining -= chunk; }
            } finally { stagePacingWaitMs += Math.round(performance.now() - waitStart); }
          }
        }
        const output = await provider.complete(request);
        stageOutputs.push({ stage: request.stage, output: scrub(output) });
        return output;
      } catch (error) {
        stageOutputs.push({ stage: request.stage, error_code: error.code ?? 'unexpected_failure' });
        throw error;
      }
    },
  };
  await mkdir(dirname(prefix), { recursive: true });
  // Não sobrescrever uma avaliação anterior por acidente.
  await mkdir(caseDirectory);
  const save = async (path, data) => {
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n';
    if (process.env.GROQ_API_KEY && content.includes(process.env.GROQ_API_KEY)) throw new Error('secret_detected_in_artifact');
    await writeFile(path, content, { encoding: 'utf8', mode: 0o600 });
  };
  const report = await evaluate({
    provider: observedProvider, dataset: selected, repeat: 1, timeoutMs,
    beforeCase: async ({ testCase }) => {
      activeCase = testCase.id;
      activeStage = null;
      stageOutputs = [];
      if (Object.values(inspectTicket(testCase.ticket).flags).some(Boolean)) return;
      let readyAt = blockedUntil;
      if (limits?.token_limit > 0 && limits.tokens_remaining !== null) {
        const target = Math.min(6500, limits.token_limit * 0.85);
        if (limits.tokens_remaining < target) readyAt = Math.max(readyAt, limits.observed_at_ms + limits.token_reset_ms + 500);
      }
      const waitMs = Math.max(0, Math.ceil(readyAt - Date.now()));
      if (waitMs > 120000) throw new Error('rate_limit_wait_exceeds_batch_budget');
      if (waitMs > 0) {
        console.error(`${testCase.id}: aguardando ${Math.ceil(waitMs / 1000)} s antes do caso, conforme limites da API.`);
        const waitStart = performance.now();
        let remaining = waitMs;
        while (remaining > 0) { const chunk = Math.min(remaining, 30000); await delay(chunk); remaining -= chunk; }
        pacingWaitMs += Math.round(performance.now() - waitStart);
      }
    },
    onResult: async ({ testCase, run, result, score }) => {
      const entry = { id: testCase.id, run, expected: testCase.expected, ...score, result, stage_outputs: stageOutputs };
      await save(`${caseDirectory}/${testCase.id}.json`, entry);
      archive.push(entry);
      await save(`${prefix}-checkpoint.json`, { started_at: startedAt, completed_cases: archive.length, cases: archive, http_attempts: httpAttempts });
      const failedChecks = Object.entries(score.checks).filter(([, ok]) => !ok).map(([name]) => name);
      console.error(`${testCase.id}: ${score.passed ? 'passou' : `falhou (${failedChecks.join(', ')})`} | ${result.metrics.requests} chamadas | ${result.metrics.prompt_tokens + result.metrics.completion_tokens} tokens | motivos: ${result.reasons.join(', ') || 'nenhum'}`);
    },
  });
  report.scope = 'retomada_parcial';
  report.case_ids = selectedCases.map(item => item.id);
  report.from_case = values['from-case'] ?? null;
  report.manifest_verified = values.manifest ?? null;
  report.started_at = startedAt;
  report.batch_wall_ms = Math.round(performance.now() - started);
  report.pacing_wait_ms = pacingWaitMs + stagePacingWaitMs;
  report.between_case_pacing_wait_ms = pacingWaitMs;
  report.stage_pacing_wait_ms = stagePacingWaitMs;
  report.pacing_strategy = 'Pausa entre casos abaixo de min(6500, 85% do limite TPM) e antes de etapas quando a estimativa conservadora de entrada mais 768 tokens de saída excede o saldo. Respeita reset e Retry-After. Sem reexecução integral de casos.';
  report.cases_with_api_calls = archive.filter(item => item.result.metrics.requests > 0).length;
  report.cases_handled_locally = archive.filter(item => item.result.metrics.requests === 0).map(item => item.id);
  report.operational_errors = archive.filter(item => item.result.operational_error).map(item => ({ id: item.id, reasons: item.result.reasons }));
  report.usage.total_tokens = report.usage.prompt_tokens + report.usage.completion_tokens;
  report.http_status_counts = Object.fromEntries([...new Set(httpAttempts.map(item => item.status))].map(status => [status, httpAttempts.filter(item => item.status === status).length]));
  await save(`${prefix}.json`, report);
  await save(`${prefix}.md`, reportMarkdown(report));
  await save(`${prefix}-details.json`, { started_at: startedAt, generated_at: report.generated_at, cases: archive, http_attempts: httpAttempts });
  console.log(JSON.stringify({ output: values.output, passed: report.passed, runs: report.runs, rates: report.rates, thresholds_passed: report.thresholds_passed, usage: report.usage, batch_wall_ms: report.batch_wall_ms, pacing_wait_ms: report.pacing_wait_ms, stage_pacing_wait_ms: stagePacingWaitMs, cases_with_api_calls: report.cases_with_api_calls, cases_handled_locally: report.cases_handled_locally, operational_errors: report.operational_errors, http_status_counts: report.http_status_counts }, null, 2));
  process.exitCode = report.thresholds_passed ? 0 : 1;
}

main().catch(error => {
  // Nenhum corpo HTTP, cabeçalho de autenticação ou conteúdo de .env é exposto.
  const known = new Set(['output_required', 'invalid_start_case', 'choose_cases_or_from_case', 'invalid_case_selection', 'manifest_mismatch', 'secret_detected_in_artifact', 'rate_limit_wait_exceeds_batch_budget']);
  console.error(JSON.stringify({ error: known.has(error.message) ? error.message : error.code ?? 'matrix_execution_failed', checkpoint_preserved_if_available: true }));
  process.exitCode = 1;
});
