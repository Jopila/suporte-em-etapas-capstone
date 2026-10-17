// Subconjunto de JSON Schema suficiente para todos os contratos deste projeto.
// Não é um validador genérico de todos os drafts da especificação.
const text = { type: 'string' };
const strings = { type: 'array', items: text };
const enumeration = (...values) => ({ type: 'string', enum: values });
const object = properties => ({
  type: 'object', properties, required: Object.keys(properties), additionalProperties: false,
});

export const schemas = {
  triagem: object({
    summary: text,
    category: enumeration('acesso', 'cobranca', 'erro_tecnico', 'duvida', 'cancelamento', 'seguranca', 'outros'),
    priority: enumeration('P1', 'P2', 'P3', 'P4'),
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    facts: strings, missing_information: strings, security_risk: { type: 'boolean' },
  }),
  fundamentacao: object({
    supported: { type: 'boolean' },
    evidence: { type: 'array', items: object({ article_id: text, quote: text }) },
    actions: { type: 'array', items: object({ article_id: text, instruction: text }) },
    missing_information: strings,
  }),
  resposta: object({ message: text, source_ids: strings }),
  revisao: object({
    approved: { type: 'boolean' },
    grounded: { type: 'boolean' },
    safe: { type: 'boolean' },
    complete: { type: 'boolean' },
    issues: strings,
  }),
};

export class ContractError extends Error {
  constructor(code, details = []) {
    super(code);
    this.name = 'ContractError';
    this.code = code;
    this.details = details;
  }
}

export function validateSchema(value, schema, path = '$') {
  const errors = [];
  const kind = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
  if (kind !== schema.type) return [`${path}: tipo esperado ${schema.type}`];
  if (schema.enum && !schema.enum.includes(value)) errors.push(`${path}: valor fora do enum`);
  if (kind === 'number' && (!Number.isFinite(value) || value < (schema.minimum ?? -Infinity) || value > (schema.maximum ?? Infinity))) {
    errors.push(`${path}: número fora do intervalo`);
  }
  if (kind === 'object') {
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) errors.push(`${path}.${key}: campo obrigatório`);
    }
    for (const key of Object.keys(value)) {
      if (Object.hasOwn(schema.properties, key)) errors.push(...validateSchema(value[key], schema.properties[key], `${path}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${path}: campo adicional`);
    }
  }
  if (kind === 'array') value.forEach((item, index) => errors.push(...validateSchema(item, schema.items, `${path}[${index}]`)));
  return errors;
}

export function assertContract(stage, data) {
  if (!Object.hasOwn(schemas, stage)) throw new ContractError('unknown_stage');
  const errors = validateSchema(data, schemas[stage]);
  if (errors.length) throw new ContractError('invalid_schema', errors);
  if (stage === 'triagem' && (!data.summary.trim() || data.summary.length > 600)) throw new ContractError('invalid_summary');
  if (stage === 'resposta' && (!data.message.trim() || data.message.length > 2500)) throw new ContractError('invalid_message');
  if (stage === 'revisao' && data.approved && (!data.grounded || !data.safe || !data.complete || data.issues.length)) {
    throw new ContractError('inconsistent_review');
  }
  return data;
}

export function validateTicket(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ContractError('invalid_ticket');
  if (typeof input.id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(input.id)) throw new ContractError('invalid_ticket_id');
  for (const [field, max] of [['subject', 200], ['message', 8000]]) {
    if (typeof input[field] !== 'string' || !input[field].trim() || input[field].length > max) throw new ContractError(`invalid_ticket_${field}`);
  }
  const extra = Object.keys(input).filter(key => !['id', 'subject', 'message'].includes(key));
  if (extra.length) throw new ContractError('unexpected_ticket_fields');
  return { id: input.id, subject: input.subject.trim(), message: input.message.trim() };
}
