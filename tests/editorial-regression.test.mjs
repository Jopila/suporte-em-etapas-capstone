import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDraft } from '../src/safety.mjs';
import { loadKnowledge } from '../src/knowledge.mjs';
import { loadCases, scoreCase, evaluate } from '../src/evaluation.mjs';
import { runPipeline, PIPELINE_VERSION } from '../src/pipeline.mjs';
import { DemoProvider } from '../src/providers/demo.mjs';

const knowledge = await loadKnowledge();
const dataset = await loadCases();
const article = id => knowledge.articles.find(a => a.id === id);
const plan = id => ({ supported: true, evidence: [{ article_id: id, quote: article(id).content }],
  actions: article(id).steps.map(instruction => ({ article_id: id, instruction })), missing_information: [] });
const issues = (message, id = 'KB-002') => checkDraft({ message, source_ids: [id] }, plan(id), [article(id)]);
const examples = [
  { id: 'C10', source: 'KB-002', code: 'self_service_prerequisite', message: 'Por favor informe:\n1. Qual a competência do boleto?\n2. Descreva a divergência.\nCom essas informações, você poderá consultar a área Financeiro > Faturas e identificar a competência afetada.' },
  { id: 'C19', source: 'KB-004', code: 'internal_reference_in_message', message: 'Conforme o artigo KB-004, a exportação CSV está disponível em Relatórios > Exportar CSV.' },
];

for (const e of examples) test(`${e.id}: detecta o problema editorial observado na versão anterior`, () => {
  assert.ok(issues(e.message, e.source).includes(e.code));
});

test('consulta de faturas não depende de resposta prévia nem de dados enviados', () => {
  for (const message of ['Informe a competência e depois consulte Financeiro > Faturas.',
    'Com essas informações, você poderá consultar Financeiro > Faturas.',
    'Após responder, acesse Financeiro > Faturas.',
    'Para consultar Financeiro > Faturas, primeiro forneça a competência da cobrança.',
    'Não envie dados pessoais, mas informe a competência antes de consultar Financeiro > Faturas.']) {
    assert.ok(issues(message).includes('self_service_prerequisite'), message);
  }
});

test('autoatendimento direto permite análise posterior e proibições de envio', () => {
  for (const message of ['Consulte a área Financeiro > Faturas e identifique a competência. Depois descreva a divergência para análise.',
    'Não envie dados pessoais. Consulte a área Financeiro > Faturas. Para análise, informe a competência afetada.',
    'Você não precisa enviar informações para consultar a área Financeiro > Faturas. Descreva a divergência para análise.',
    'Consulte Financeiro > Faturas. Com a competência identificada, descreva a divergência para análise.']) {
    assert.deepEqual(issues(message), [], message);
  }
});

test('condições autorizadas de outros procedimentos continuam permitidas', () => {
  for (const a of knowledge.articles) assert.deepEqual(issues(a.steps.join('\n'), a.id), [], a.id);
});

test('IDs internos no texto são rejeitados, preservando códigos de erro e menus', () => {
  for (const reference of ['KB-004', 'kb-004', 'KB‑004', '**KB-004**', '[artigo](KB-004)', 'KB 004']) {
    assert.ok(issues(`Consulte ${reference} para exportar.`, 'KB-004').includes('internal_reference_in_message'));
  }
  assert.deepEqual(issues('Abra Relatórios > Exportar CSV. Se ocorrer HTTP 500, descreva o erro.', 'KB-004'), []);
});

test('editoriais persistentes são bloqueados mesmo com revisor permissivo', async () => {
  for (const e of examples) {
    let reviews = 0;
    const demo = new DemoProvider();
    const provider = { name: 'demo', model: 'editorial-regression', complete: async request => {
      if (request.stage === 'revisao') { reviews++; return { approved: true, grounded: true, safe: true, complete: true, issues: [] }; }
      const data = await demo.complete(request);
      return request.stage === 'resposta' ? { message: e.message, source_ids: [e.source] } : data;
    } };
    const result = await runPipeline(dataset.cases.find(c => c.id === e.id).ticket, { provider });
    assert.equal(result.status, 'encaminhamento_humano');
    assert.deepEqual(result.reasons, ['review_rejected']);
    assert.equal(result.metrics.revisions, 1);
    assert.equal(reviews, 0);
    assert.ok(result.trace.some(t => t.issues?.includes(e.code)));
    assert.ok(!result.response.includes(e.message));
  }
});

test('correção editorial mantém fontes estruturadas, evidência e aprovação humana', async () => {
  for (const e of examples) {
    const demo = new DemoProvider(); let feedback;
    const provider = { name: 'demo', model: 'editorial-repair', complete: async request => {
      const data = await demo.complete(request);
      if (request.stage !== 'resposta') return data;
      if (!request.context.previous_draft) return { message: e.message, source_ids: [e.source] };
      feedback = request.context.review_feedback; return data;
    } };
    const item = dataset.cases.find(c => c.id === e.id);
    const result = await runPipeline(item.ticket, { provider });
    assert.equal(result.status, 'rascunho_validado');
    assert.equal(result.metrics.revisions, 1);
    assert.ok(feedback.includes(e.code));
    assert.deepEqual(result.source_ids, [e.source]);
    assert.ok(result.grounding.evidence.some(x => x.article_id === e.source));
    assert.ok(!result.response.includes(e.source));
    assert.equal(result.requires_human_approval, true); assert.equal(result.auto_sent, false);
    assert.equal(scoreCase(item, result, knowledge).passed, true);
    assert.equal(scoreCase(item, { ...result, response: e.message }, knowledge).checks.content, false);
  }
});

test('relatório identifica a versão ativa do avaliador de conteúdo', async () => {
  const report = await evaluate({ provider: new DemoProvider(), limit: 1 });
  assert.equal(report.evaluator_version, PIPELINE_VERSION);
});
