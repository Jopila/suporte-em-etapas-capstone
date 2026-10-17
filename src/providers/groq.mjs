import { setTimeout as delay } from 'node:timers/promises';
import { ContractError } from '../contracts.mjs';

export class ProviderError extends Error {
  constructor(code) { super(code); this.name = 'ProviderError'; this.code = code; }
}

export function integerSetting(value, fallback, min, max) {
  const result = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(result) || result < min || result > max) throw new ProviderError('invalid_configuration');
  return result;
}

export function retryAfterMs(value, now = Date.now()) {
  if (value === null || value === undefined) return null;
  if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value) * 1000;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : null;
}

export class GroqProvider {
  #apiKey;
  constructor({ apiKey = process.env.GROQ_API_KEY, model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    format = process.env.GROQ_RESPONSE_FORMAT || 'json_schema',
    timeoutMs = integerSetting(process.env.GROQ_TIMEOUT_MS, 25000, 100, 120000),
    maxRetries = integerSetting(process.env.GROQ_MAX_RETRIES, 2, 0, 3),
    fetchImpl = globalThis.fetch, sleep = delay, random = Math.random } = {}) {
    if (!apiKey?.trim()) throw new ProviderError('missing_groq_key');
    if (!['json_schema', 'json_object'].includes(format) || !model.trim()) throw new ProviderError('invalid_configuration');
    this.#apiKey = apiKey.trim();
    this.name = 'groq'; this.model = model; this.format = format;
    this.timeoutMs = integerSetting(timeoutMs, 25000, 100, 120000);
    this.maxRetries = integerSetting(maxRetries, 2, 0, 3);
    this.fetch = fetchImpl; this.sleep = sleep; this.random = random;
  }

  async complete({ stage, messages, schema, signal, onEvent = () => {} }) {
    const responseFormat = this.format === 'json_schema'
      ? { type: 'json_schema', json_schema: { name: stage, strict: true, schema } }
      : { type: 'json_object' };
    const payload = {
      model: this.model, messages, temperature: 0.1, max_completion_tokens: 4096,
      stream: false, response_format: responseFormat,
      ...(this.model.startsWith('openai/gpt-oss-') ? { reasoning_effort: 'low', include_reasoning: false } : {}),
    };
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (signal?.aborted) throw new ProviderError('pipeline_timeout');
      const timer = new AbortController();
      const timerId = setTimeout(() => timer.abort(), this.timeoutMs);
      const requestSignal = signal ? AbortSignal.any([signal, timer.signal]) : timer.signal;
      let waitMs;
      onEvent({ type: 'attempt' });
      try {
        const response = await this.fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST', redirect: 'error', signal: requestSignal,
          headers: { 'Authorization': `Bearer ${this.#apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          const requestedDelay = retryAfterMs(response.headers.get('retry-after'));
          await response.body?.cancel();
          if (!retryable || attempt === this.maxRetries) throw new ProviderError(`groq_http_${response.status}`);
          // Nunca tenta antes do Retry-After; esperas longas voltam para a fila humana.
          if (requestedDelay !== null && requestedDelay > 10000) throw new ProviderError('groq_retry_later');
          waitMs = requestedDelay ?? (500 * 2 ** attempt + Math.floor(this.random() * 200));
        } else {
          let envelope;
          try { envelope = await response.json(); }
          catch { throw new ProviderError(requestSignal.aborted ? 'groq_timeout' : 'invalid_provider_response'); }
          const usage = envelope.usage;
          if (usage && Number.isFinite(usage.prompt_tokens) && Number.isFinite(usage.completion_tokens)) {
            onEvent({ type: 'usage', prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens });
          } else onEvent({ type: 'usage_unknown' });
          const choice = envelope.choices?.[0];
          if (choice?.message?.refusal) throw new ProviderError('model_refusal');
          if (choice?.finish_reason !== 'stop') throw new ContractError('incomplete_completion');
          const content = choice?.message?.content;
          if (typeof content !== 'string' || content.length > 50000) throw new ContractError('invalid_completion');
          try { return JSON.parse(content); }
          catch { throw new ContractError('invalid_json'); }
        }
      } catch (error) {
        if (signal?.aborted) throw new ProviderError('pipeline_timeout');
        if (error instanceof ContractError || error instanceof ProviderError) throw error;
        if (attempt === this.maxRetries) throw new ProviderError(timer.signal.aborted ? 'groq_timeout' : 'groq_network_error');
        waitMs = 500 * 2 ** attempt + Math.floor(this.random() * 200);
      } finally { clearTimeout(timerId); }
      try { await this.sleep(waitMs, undefined, { signal }); }
      catch { throw new ProviderError('pipeline_timeout'); }
    }
    throw new ProviderError('groq_unavailable');
  }
}
