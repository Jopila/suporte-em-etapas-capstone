// Auditoria offline das correções. Não cria provedor nem faz chamadas de rede.
// Acrescente novos checkpoints da MESMA versão com --additional-checkpoint.
import assert from 'node:assert/strict';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { loadCases, scoreCase } from '../src/evaluation.mjs';
import { loadKnowledge } from '../src/knowledge.mjs';
import { digest, loadPrompts } from '../src/prompts.mjs';
import { PIPELINE_VERSION } from '../src/pipeline.mjs';

const json = async path => JSON.parse(await readFile(path, 'utf8'));
const fileHash = async path => createHash('sha256').update(await readFile(path)).digest('hex');
const sumUsage = entries => {
  const usage = { requests: 0, prompt_tokens: 0, completion_tokens: 0, responses_without_usage: 0 };
  for (const item of entries) for (const key of Object.keys(usage)) usage[key] += item.result.metrics[key] ?? 0;
  return { ...usage, total_tokens: usage.prompt_tokens + usage.completion_tokens };
};
const statusCounts = attempts => {
  const counts = {};
  for (const attempt of attempts) counts[attempt.status] = (counts[attempt.status] ?? 0) + 1;
  return counts;
};
const display = value => value.toLocaleString('pt-BR');

async function main() {
  const { values } = parseArgs({ options: {
    output: { type: 'string', default: 'reports/groq-progress-v1.1.2' },
    'additional-checkpoint': { type: 'string', multiple: true, default: [] },
  } });
  const manifestPath = 'reports/groq-v1.1.2-run-manifest.json';
  const [manifest, dataset, knowledge, bundle] = await Promise.all([json(manifestPath), loadCases(), loadKnowledge(), loadPrompts()]);
  assert.equal(PIPELINE_VERSION, manifest.pipeline_version);
  assert.equal(bundle.hash, manifest.prompt_hash);
  assert.equal(digest(dataset), manifest.dataset_hash);
  assert.equal(digest(knowledge), manifest.knowledge_hash);
  for (const [path, expected] of Object.entries(manifest.files)) assert.equal(await fileHash(path), expected, `Arquivo alterado: ${path}`);
  const definitions = [
    { label: '1.1.0 parcial', checkpoint: 'reports/groq-matrix-v1.1.0-2026-10-16-checkpoint.json', current: false },
    { label: '1.1.1 completa', checkpoint: 'reports/groq-matrix-v1.1.1-2026-10-16-checkpoint.json', current: false },
    { label: '1.1.2 tentativa integral', checkpoint: 'reports/groq-matrix-v1.1.2-2026-10-16-checkpoint.json', current: true },
    { label: '1.1.2 retomada de C13', checkpoint: 'reports/groq-remainder-v1.1.2-2026-10-16-checkpoint.json', current: true },
    ...values['additional-checkpoint'].map((checkpoint, i) => ({ label: `1.1.2 retomada adicional ${i + 1}`, checkpoint, current: true })),
  ];
  assert.equal(new Set(definitions.map(item => item.checkpoint)).size, definitions.length, 'Checkpoint duplicado');
  const segments = [];
  const allEntries = [], allAttempts = [], currentEntries = [], currentAttempts = [];
  const completed = new Map();
  for (const definition of definitions) {
    const checkpoint = await json(definition.checkpoint);
    assert.equal(checkpoint.completed_cases, checkpoint.cases.length);
    assert.equal(new Set(checkpoint.cases.map(item => item.id)).size, checkpoint.cases.length);
    for (const entry of checkpoint.cases) {
      const testCase = dataset.cases.find(item => item.id === entry.id);
      assert.ok(testCase, 'Caso desconhecido');
      assert.deepEqual(entry.expected, testCase.expected, 'Gabarito modificado');
      assert.equal(entry.result.requires_human_approval, true);
      assert.equal(entry.result.auto_sent, false);
      const artifact = definition.checkpoint.replace(/-checkpoint\.json$/, `-cases/${entry.id}.json`);
      assert.deepEqual(await json(artifact), entry, 'Arquivo por caso difere do checkpoint');
      if (definition.current) {
        assert.equal(entry.result.pipeline_version, manifest.pipeline_version);
        assert.equal(entry.result.prompt_hash, manifest.prompt_hash);
        assert.equal(entry.result.knowledge_hash, manifest.knowledge_hash);
        assert.equal(entry.result.model, manifest.model);
        const score = scoreCase(testCase, entry.result, knowledge);
        assert.deepEqual(score.checks, entry.checks, 'Pontuação salva não reproduzida');
        assert.equal(score.passed, entry.passed);
        currentEntries.push({ ...entry, checkpoint: definition.checkpoint, artifact });
        // Falhas operacionais continuam no consumo; não concluem a validação.
        // Uma divergência de qualidade sem erro operacional conclui e REPROVA.
        if (!entry.result.operational_error) {
          assert.ok(!completed.has(entry.id), `Caso já concluído: ${entry.id}. Não selecionar o melhor resultado.`);
          completed.set(entry.id, { ...entry, checkpoint: definition.checkpoint, artifact });
        }
      }
    }
    const usage = sumUsage(checkpoint.cases);
    assert.equal(usage.requests, checkpoint.http_attempts.length, 'Requisições não reconciliadas');
    for (const attempt of checkpoint.http_attempts) assert.ok(checkpoint.cases.some(item => item.id === attempt.case_id), 'Chamada sem caso salvo');
    allEntries.push(...checkpoint.cases);
    allAttempts.push(...checkpoint.http_attempts);
    if (definition.current) currentAttempts.push(...checkpoint.http_attempts);
    segments.push({ ...definition, started_at: checkpoint.started_at, checkpoint_sha256: await fileHash(definition.checkpoint),
      recorded_cases: checkpoint.cases.length, passed_cases: checkpoint.cases.filter(item => item.passed).length,
      operational_error_cases: checkpoint.cases.filter(item => item.result.operational_error).map(item => item.id),
      usage, http_status_counts: statusCounts(checkpoint.http_attempts) });
  }
  const [baseline, intermediate] = await Promise.all([json('reports/groq-matrix-2026-10-16.json'), json('reports/groq-matrix-v1.1.1-2026-10-16.json')]);
  const originalTokens = baseline.usage.prompt_tokens + baseline.usage.completion_tokens;
  const intermediateTokens = intermediate.usage.prompt_tokens + intermediate.usage.completion_tokens;
  assert.equal(intermediateTokens, segments[1].usage.total_tokens);
  assert.equal(intermediate.usage.requests, segments[1].usage.requests);
  const pending = dataset.cases.filter(item => !completed.has(item.id)).map(item => item.id);
  const rows = dataset.cases.map(item => {
    const result = completed.get(item.id);
    const attempts = currentEntries.filter(entry => entry.id === item.id);
    return { id: item.id, validation_status: result ? 'concluido' : attempts.length ? 'pendente_apos_erro_operacional' : 'nao_executado',
      passed: result?.passed ?? null, checks: result?.checks ?? null, canonical_artifact: result?.artifact ?? null,
      recorded_attempts: attempts.map(entry => ({ artifact: entry.artifact, operational_error: entry.result.operational_error, passed: entry.passed, reasons: entry.result.reasons, usage: sumUsage([entry]) })),
      usage_all_attempts: sumUsage(attempts) };
  });
  const generatedAt = new Date().toISOString();
  const ledger = { generated_at: generatedAt, scope: 'Ciclo de correções, regressões e retomadas; inclui todas as tentativas preservadas.',
    segments, total_this_request: sumUsage(allEntries), http_status_counts: statusCounts(allAttempts),
    excluded: [{ label: 'Matriz original anterior', tokens: originalTokens }, { label: 'Smoke test anterior', tokens: 6242 }],
    caveat: 'Tokens informados em usage. Respostas HTTP 429 não forneceram usage; não se presume custo monetário nem consumo nulo de tentativas rejeitadas.' };
  const progress = { generated_at: generatedAt, scope: 'Consolidação de segmentos da mesma versão, sem substituir tentativas falhas.',
    pipeline_version: PIPELINE_VERSION, prompt_version: bundle.version, prompt_hash: bundle.hash, knowledge_hash: manifest.knowledge_hash,
    dataset_hash: manifest.dataset_hash, model: manifest.model, manifest: manifestPath, manifest_verified: true,
    complete: pending.length === 0, planned_cases: dataset.cases.length, completed_cases: completed.size,
    passed_completed_cases: [...completed.values()].filter(item => item.passed).length,
    completed_locally: [...completed.values()].filter(item => item.result.metrics.requests === 0).map(item => item.id),
    pending_case_ids: pending,
    full_matrix_rates: pending.length ? null : Object.fromEntries(Object.keys(rows[0].checks).map(key => [key, rows.filter(row => row.checks[key]).length / rows.length])),
    usage_all_current_version_attempts: sumUsage(currentEntries), http_status_counts: statusCounts(currentAttempts),
    rate_limit_events: currentAttempts.filter(item => item.status === 429).map(item => ({ case_id: item.case_id, stage: item.stage,
      observed_at: new Date(item.observed_at_ms).toISOString(), retry_after_ms: item.retry_after_ms,
      earliest_retry_indicated_at: item.retry_after_ms === null ? null : new Date(item.observed_at_ms + item.retry_after_ms).toISOString() })),
    comparison_of_complete_matrices: { baseline_version: '1.0.0', intermediate_version: '1.1.1', cases: 20,
      baseline_passed: baseline.passed, intermediate_passed: intermediate.passed, baseline_tokens: originalTokens, intermediate_tokens: intermediateTokens,
      token_delta: intermediateTokens - originalTokens, token_delta_percent: Number(((intermediateTokens / originalTokens - 1) * 100).toFixed(2)) },
    rows,
    limitations: ['Não há pontuação da matriz de 20 casos enquanto houver pendências.', 'Caso local não representa chamada ao LLM.',
      'Aprovação automática não substitui inspeção semântica; C05 e C10 têm observações no relatório.',
      'Não foi realizada nova execução pelo script de consolidação.'] };
  const selection = `--cases ${pending.join(',')} --manifest ${manifestPath}`;
  // Cada retomada precisa de um prefixo novo e de todos os checkpoints anteriores.
  const nextPrefix = `reports/groq-pendentes-v1.1.2-retomada-${values['additional-checkpoint'].length + 1}`;
  const nextCheckpointArgs = [...values['additional-checkpoint'], `${nextPrefix}-checkpoint.json`]
    .map(checkpoint => `--additional-checkpoint "${checkpoint}"`).join(' ');
  const resumePlan = { generated_at: generatedAt, status: pending.length ? 'aguardando_cota_sem_agendamento' : 'concluido',
    pipeline_version: PIPELINE_VERSION, model: manifest.model, prompt_version: bundle.version, prompt_hash: bundle.hash,
    dataset_hash: manifest.dataset_hash, knowledge_hash: manifest.knowledge_hash, manifest: manifestPath,
    completed_case_ids: [...completed.keys()], pending_case_ids: pending,
    source_checkpoints: definitions.filter(item => item.current).map(item => item.checkpoint),
    dry_run_command: pending.length ? `node scripts/evaluate-groq-remainder.mjs ${selection} --dry-run` : null,
    resume_command: pending.length ? `node --env-file=.env.local scripts/evaluate-groq-remainder.mjs ${selection} --output ${nextPrefix}` : null,
    consolidate_command: pending.length ? `node scripts/consolidate-groq-progress.mjs ${nextCheckpointArgs} --output ${values.output}-atualizado` : null,
    instructions: ['Executar manualmente somente quando houver cota e decisão de retomar.', 'Usar prefixo de saída novo; preservar todos os checkpoints.',
      'Reiniciar cada caso pendente desde a triagem; não reutilizar etapas isoladas de uma tentativa interrompida.',
      'Não repetir casos concluídos para selecionar uma resposta melhor.',
      'Se a retomada for parcial, consolidar seu checkpoint e usar a NOVA lista de pendências.',
      'Em consolidações posteriores, informar todos os checkpoints adicionais; os quatro originais já são incluídos.',
      'Interromper a comparação se o manifesto não corresponder; versões diferentes exigem relatórios separados.',
      'Retry-After indica espera mínima observada, não garantia de cota futura.'],
    runner_sha256: await fileHash('scripts/evaluate-groq-remainder.mjs'),
    original_remainder_runner_snapshot: 'reports/groq-remainder-v1.1.2-2026-10-16-runner.mjs.snapshot',
    original_remainder_runner_sha256: await fileHash('reports/groq-remainder-v1.1.2-2026-10-16-runner.mjs.snapshot') };
  const markdown = `# Progresso auditado — pipeline ${PIPELINE_VERSION}\n\nGerado: ${generatedAt}. Consolidação offline; nenhuma chamada à API.\n\n${progress.completed_cases}/${progress.planned_cases} casos concluídos; ${progress.passed_completed_cases} aprovados entre os concluídos. ${pending.length ? `Pendentes: **${pending.join(', ')}**. A matriz final permanece incompleta.` : 'Matriz concluída.'}\n\nCinco casos da matriz são tratados pelos controles locais; a pontuação não mede apenas o LLM.\n\n| Caso | Estado da validação | Aprovado | Tokens em todas as tentativas 1.1.2 |\n|---|---|---|---:|\n${rows.map(row => `| ${row.id} | ${row.validation_status} | ${row.passed === null ? 'Pendente' : row.passed ? 'Sim' : 'Não'} | ${display(row.usage_all_attempts.total_tokens)} |`).join('\n')}\n\n## Consumo desta solicitação\n\n| Segmento | Chamadas | Entrada | Saída | Total |\n|---|---:|---:|---:|---:|\n${segments.map(item => `| ${item.label} | ${item.usage.requests} | ${display(item.usage.prompt_tokens)} | ${display(item.usage.completion_tokens)} | ${display(item.usage.total_tokens)} |`).join('\n')}\n| **Total** | **${ledger.total_this_request.requests}** | **${display(ledger.total_this_request.prompt_tokens)}** | **${display(ledger.total_this_request.completion_tokens)}** | **${display(ledger.total_this_request.total_tokens)}** |\n\n${ledger.caveat}\n\nA matriz original (73.625 tokens) e o teste isolado anterior (6.242) não integram esse total. Detalhes de falhas, limitações e comandos: [relatório das correções](../docs/COMPARACAO_GROQ_CORRECOES.md).\n`;
  const outputs = [[`${values.output}.json`, progress], [`${values.output}-consumo.json`, ledger], [`${values.output}-resume-plan.json`, resumePlan], [`${values.output}.md`, markdown]];
  for (const [path] of outputs) { try { await stat(path); throw new Error(`Saída já existe: ${path}`); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
  for (const [path, data] of outputs) {
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n';
    if (process.env.GROQ_API_KEY && content.includes(process.env.GROQ_API_KEY)) throw new Error('secret_detected_in_artifact');
    await writeFile(path, content, { flag: 'wx', encoding: 'utf8', mode: 0o600 });
  }
  console.log(JSON.stringify({ output: values.output, complete: progress.complete, completed: progress.completed_cases, pending, usage: ledger.total_this_request, http_status_counts: ledger.http_status_counts, manifest_verified: true }, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
