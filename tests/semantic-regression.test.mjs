import test from 'node:test';
import assert from 'node:assert/strict';
import { checkDraft } from '../src/safety.mjs';
import { loadKnowledge } from '../src/knowledge.mjs';
import { loadCases, scoreCase } from '../src/evaluation.mjs';
import { runPipeline } from '../src/pipeline.mjs';
import { DemoProvider } from '../src/providers/demo.mjs';

const knowledge = await loadKnowledge();
const dataset = await loadCases();
const article = id => knowledge.articles.find(item => item.id === id);
const grounding = id => ({ supported: true, evidence: [{ article_id: id, quote: article(id).content }],
  actions: article(id).steps.map(instruction => ({ article_id: id, instruction })), missing_information: [] });
const issues = (message, id) => checkDraft({ message, source_ids: [id] }, grounding(id), [article(id)]);

// Trechos sintéticos das respostas 1.1.2 preservadas, sem depender dos relatórios locais.
const observed = [
  ['C05', 'KB-004', 'Nesse caso, solicite ao administrador da sua empresa que confirme ou ajuste suas permissões.', 'unsupported_permission_change'],
  ['C10', 'KB-002', 'Consultaremos a área Financeiro > Faturas e identificaremos a competência afetada.', 'unavailable_operation'],
  ['C13', 'KB-004', 'Nesse caso, solicite ao administrador da sua empresa que confirme ou ajuste sua permissão.', 'unsupported_permission_change'],
  ['C15', 'KB-002', 'Aguarde a análise da equipe financeira, que entrará em contato com a decisão sobre eventual reembolso ou estorno.', 'unsupported_followup'],
  ['C18', 'KB-001', 'Caso não tenha acesso ao e-mail cadastrado, informe ao suporte para que possamos verificar a titularidade conforme o procedimento interno.', 'incomplete_verification_step'],
  ['C19', 'KB-004', 'Solicite ao administrador da sua empresa que verifique e, se necessário, conceda a permissão de leitura do relatório.', 'unsupported_permission_change'],
];

for (const [id, source, message, code] of observed) {
  test(`${id}: detecta a ressalva observada mesmo com fonte correta`, () => {
    assert.ok(issues(message, source).includes(code));
  });
}

test('procedimentos aprovados continuam permitidos, sem inventar mudança de permissão', () => {
  for (const item of knowledge.articles) assert.deepEqual(issues(item.steps.join('\n'), item.id), []);
  assert.deepEqual(issues('Peça ao administrador que confira sua permissão de leitura do relatório.', 'KB-004'), []);
  assert.deepEqual(issues('Não altere as permissões. Confira a permissão com o administrador.', 'KB-004'), []);
  assert.deepEqual(issues('Você relatou que o administrador ajustou sua permissão.', 'KB-004'), []);
});

test('variações de concessão e troca de ordem da permissão são bloqueadas', () => {
  for (const message of ['Peça para liberar a permissão.', 'Solicite a alteração das permissões ao administrador.',
    'As permissões devem ser ajustadas pelo administrador.', 'Habilite a permissão de leitura.',
    'Não altere a permissão, mas conceda a permissão de exportação.']) {
    assert.ok(issues(message, 'KB-004').includes('unsupported_permission_change'), message);
  }
});

test('orientar o cliente não equivale a prometer uma consulta operacional', () => {
  for (const message of ['Vamos consultar sua fatura.', 'Iremos acessar a sua conta para analisar a cobrança.',
    'Verificaremos os dados na área Financeiro > Faturas.', 'Não consultaremos a fatura, mas vamos acessar sua conta.']) {
    assert.ok(issues(message, 'KB-002').includes('unavailable_operation'), message);
  }
  for (const message of ['Consulte a área Financeiro > Faturas.', 'Não podemos consultar sua fatura. Consulte a área Financeiro > Faturas.',
    'Não consultaremos sua conta. Descreva a divergência para análise financeira.', 'Vou orientar os próximos passos.']) {
    assert.deepEqual(issues(message, 'KB-002'), [], message);
  }
});

test('análise prevista não autoriza promessa de retorno ou notificação', () => {
  for (const message of ['A equipe financeira retornará com a decisão.', 'Vamos entrar em contato quando a análise terminar.',
    'Você receberá um retorno da equipe financeira.', 'Não entraremos em contato, mas a equipe avisará o resultado.']) {
    assert.ok(issues(message, 'KB-002').includes('unsupported_followup'), message);
  }
  for (const message of ['A equipe financeira precisa analisar a divergência.', 'Aguarde a análise financeira.',
    'Não podemos prometer que a equipe entrará em contato.', 'Não vamos entrar em contato.']) {
    assert.deepEqual(issues(message, 'KB-002'), [], message);
  }
});

test('titularidade preserva canal e condição no mesmo passo, inclusive com formatação', () => {
  const step = article('KB-001').steps[2];
  assert.deepEqual(issues(step.replace('canal aprovado', '**canal aprovado**'), 'KB-001'), []);
  for (const message of ['Solicite ao suporte a verificação de titularidade pelo canal aprovado.',
    'Se não tiver acesso ao e-mail cadastrado, solicite a verificação de titularidade pelo canal de sua preferência.',
    `${step}\nTambém confirme a titularidade por um procedimento interno.`]) {
    assert.ok(issues(message, 'KB-001').includes('incomplete_verification_step'), message);
  }
  assert.deepEqual(issues('Verifique as instruções no e-mail cadastrado e na pasta de spam.', 'KB-001'), []);
});

test('Aguardar análise não é aprovação; promessas depois da condição continuam bloqueadas', () => {
  for (const verb of ['Aguardar', 'Aguarde', 'Esperar']) {
    const safe = `${verb} a análise da equipe financeira antes de considerar qualquer reembolso ou estorno aprovado.`;
    assert.deepEqual(issues(safe, 'KB-002'), [], safe);
    for (const connector of [' E ', ' Mas ', '\n']) {
      assert.ok(issues(`${safe}${connector}Seu estorno foi aprovado.`, 'KB-002').includes('unsupported_commitment'));
    }
  }
});

test('controle local bloqueia ressalvas persistentes antes de um revisor permissivo', async () => {
  for (const [id, source, message, code] of observed) {
    let reviews = 0;
    const demo = new DemoProvider();
    const provider = { name: 'demo', model: 'semantic-regression', complete: async request => {
      if (request.stage === 'revisao') { reviews++; return { approved: true, grounded: true, safe: true, complete: true, issues: [] }; }
      const result = await demo.complete(request);
      return request.stage === 'resposta' ? { message, source_ids: [source] } : result;
    } };
    const result = await runPipeline(dataset.cases.find(c => c.id === id).ticket, { provider });
    assert.equal(result.status, 'encaminhamento_humano', id);
    assert.deepEqual(result.reasons, ['review_rejected']);
    assert.equal(result.metrics.revisions, 1);
    assert.equal(reviews, 0);
    assert.ok(result.trace.some(t => t.issues?.includes(code)));
    assert.equal(result.requires_human_approval, true);
    assert.equal(result.auto_sent, false);
    assert.ok(!result.response.includes(message));
  }
});

test('feedback permite reparar cada ressalva e reavaliar o rascunho corrigido', async () => {
  for (const [id, source, message, code] of observed) {
    const demo = new DemoProvider();
    let feedback;
    const provider = { name: 'demo', model: 'semantic-repair', complete: async request => {
      const result = await demo.complete(request);
      if (request.stage !== 'resposta') return result;
      if (!request.context.previous_draft) return { message, source_ids: [source] };
      feedback = request.context.review_feedback;
      return result;
    } };
    const item = dataset.cases.find(c => c.id === id);
    const result = await runPipeline(item.ticket, { provider });
    assert.equal(result.status, 'rascunho_validado', id);
    assert.equal(result.metrics.revisions, 1);
    assert.ok(feedback.includes(code));
    assert.equal(scoreCase(item, result, knowledge).passed, true);
    assert.equal(scoreCase(item, { ...result, response: message }, knowledge).checks.content, false);
  }
});
