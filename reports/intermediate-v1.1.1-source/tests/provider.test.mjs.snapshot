import test from 'node:test';
import assert from 'node:assert/strict';
import { GroqProvider, retryAfterMs, integerSetting } from '../src/providers/groq.mjs';
import { schemas } from '../src/contracts.mjs';

const data = { message: 'Olá!', source_ids: ['KB-001'] };
const envelope = (content = JSON.stringify(data), finish = 'stop') => ({ choices: [{ finish_reason: finish, message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 5 } });
const request = { stage: 'resposta', schema: schemas.resposta, messages: [{ role: 'system', content: 'Retorne JSON.' }] };
const response = (body = envelope(), status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });
const client = options => new GroqProvider({ apiKey: 'unit-test-key-not-a-real-secret', maxRetries: 2, sleep: async () => {}, random: () => 0, ...options });

test('cliente exige credencial e valida limites de configuração', () => {
  assert.throws(() => new GroqProvider({ apiKey: '' }), /missing_groq_key/);
  for (const value of ['', '0', 'NaN', '2.5', '-1']) assert.throws(() => integerSetting(value, 2, 1, 3));
  assert.throws(() => client({ format: 'text' }), /invalid_configuration/);
});

test('requisição usa apenas Groq, schema estrito e não serializa a chave no cliente', async () => {
  let sent;
  const provider = client({ fetchImpl: async (url, init) => { sent = { url, init }; return response(); } });
  assert.deepEqual(await provider.complete(request), data);
  assert.equal(sent.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(sent.init.redirect, 'error');
  const body = JSON.parse(sent.init.body);
  assert.equal(body.response_format.json_schema.strict, true);
  assert.deepEqual(body.response_format.json_schema.schema, schemas.resposta);
  assert.equal(body.include_reasoning, false);
  assert.ok(!JSON.stringify(provider).includes('unit-test-key'));
});

test('modo JSON object é uma opção explícita', async () => {
  const provider = client({ format: 'json_object', model: 'modelo-configurado', fetchImpl: async (_, init) => {
    const body = JSON.parse(init.body);
    assert.deepEqual(body.response_format, { type: 'json_object' });
    assert.equal(body.reasoning_effort, undefined);
    return response();
  } });
  await provider.complete(request);
});

test('429 respeita Retry-After e recupera com número limitado de tentativas', async () => {
  let attempts = 0; const sleeps = [];
  const provider = client({ sleep: async ms => { sleeps.push(ms); }, fetchImpl: async () => ++attempts === 1 ? response({}, 429, { 'retry-after': '2' }) : response() });
  assert.deepEqual(await provider.complete(request), data);
  assert.equal(attempts, 2);
  assert.deepEqual(sleeps, [2000]);
});

test('Retry-After longo retorna à fila sem repetir antes do prazo', async () => {
  let attempts = 0;
  const provider = client({ fetchImpl: async () => { attempts++; return response({}, 429, { 'retry-after': '60' }); } });
  await assert.rejects(() => provider.complete(request), /groq_retry_later/);
  assert.equal(attempts, 1);
  assert.equal(retryAfterMs('Thu, 01 Jan 1970 00:00:02 GMT', 0), 2000);
  assert.equal(retryAfterMs('invalid'), null);
});

test('401 não repete e não expõe corpo de erro', async () => {
  let attempts = 0;
  const provider = client({ fetchImpl: async () => { attempts++; return response({ error: 'SENSITIVE_BODY_MARKER' }, 401); } });
  await assert.rejects(() => provider.complete(request), error => error.message === 'groq_http_401' && !JSON.stringify(error).includes('SENSITIVE_BODY_MARKER'));
  assert.equal(attempts, 1);
});

test('503 esgota exatamente três tentativas', async () => {
  let attempts = 0;
  await assert.rejects(() => client({ fetchImpl: async () => { attempts++; return response({}, 503); } }).complete(request), /groq_http_503/);
  assert.equal(attempts, 3);
});

test('erros de rede são resumidos e têm repetição limitada', async () => {
  let attempts = 0;
  await assert.rejects(() => client({ fetchImpl: async () => { attempts++; throw new Error('SENSITIVE_NETWORK_MARKER'); } }).complete(request), /groq_network_error/);
  assert.equal(attempts, 3);
});

test('timeout cancela o fetch', async () => {
  const provider = client({ timeoutMs: 100, maxRetries: 0, fetchImpl: async (_, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  }) });
  await assert.rejects(() => provider.complete(request), /groq_timeout/);
});

test('JSON inválido, truncamento e recusa não viram uma resposta aprovada', async () => {
  await assert.rejects(() => client({ fetchImpl: async () => response(envelope('```json {} ```')) }).complete(request), /invalid_json/);
  await assert.rejects(() => client({ fetchImpl: async () => response(envelope('{}', 'length')) }).complete(request), /incomplete_completion/);
  await assert.rejects(() => client({ fetchImpl: async () => response({ choices: [{ message: { refusal: 'Não posso.' } }] }) }).complete(request), /model_refusal/);
});

test('uso é contabilizado mesmo quando o conteúdo JSON é inválido', async () => {
  const events = [];
  await assert.rejects(() => client({ fetchImpl: async () => response(envelope('{')) }).complete({ ...request, onEvent: event => events.push(event) }));
  assert.deepEqual(events, [{ type: 'attempt' }, { type: 'usage', prompt_tokens: 10, completion_tokens: 5 }]);
});
