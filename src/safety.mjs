export const normalize = text => text.normalize('NFKD').replace(/\p{M}/gu, '').replace(/[\u2010-\u2015\u2212]/g, '-').toLowerCase();

const patterns = [
  ['CHAVE', /\b(?:gsk_|sk-(?:proj-)?)[A-Za-z0-9_-]{10,}\b/g],
  ['EMAIL', /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
  ['CPF', /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g],
  ['CARTAO', /\b(?:\d[ -]?){15}\d\b/g],
  ['TELEFONE', /(?:\+55\s?)?(?:\(\d{2}\)|\b\d{2})[ -]?9?\d{4}[ -]?\d{4}\b/g],
];

const secretValue = /\b((?:senha|password|token|api[_ -]?key)\s*([:=]|é\s+|e\s+|is\s+)\s*)([^\s,;]+)/gi;
const ordinaryValue = /^(?:nao|nunca|jamais|o|a|os|as|eu|voce|preciso|quero|devo|consigo|login|incorreta|invalida|errada|fraca|forte|obrigatoria|necessaria|desconhecida)\b/;

export function redact(text) {
  let cleaned = text;
  const types = new Set();
  for (const [type, pattern] of patterns) {
    cleaned = cleaned.replace(pattern, () => { types.add(type); return `[${type}_REMOVIDO]`; });
  }
  cleaned = cleaned.replace(secretValue, (match, prefix, separator, value) => {
    if (/^\[[A-Z_]+_REMOVIDO\]/.test(value)) return match;
    const normalized = normalize(value.replace(/^["'“]/, ''));
    // "senha e não..." é uma conjunção; "senha é inválida" é uma descrição.
    // O "e" sem acento só indica valor quando este tem sinal de credencial.
    if (!/[:=]/.test(separator) && (ordinaryValue.test(normalized)
      || (separator.trim() === 'e' && !/[\d_@!#$%*&+\-]/.test(value)))) return match;
    types.add('SEGREDO');
    return `${prefix}[SEGREDO_REMOVIDO]`;
  });
  return { text: cleaned, types: [...types].sort() };
}

export function inspectTicket(ticket) {
  const original = normalize(`${ticket.subject}\n${ticket.message}`);
  const injection = /ignore\s+(?:todas?\s+)?(?:as\s+)?(?:regras|instrucoes)|ignore\s+(?:all\s+)?previous|system\s*prompt|prompt\s+(?:do\s+)?sistema|finja\s+ser|revele\s+(?:as?\s+)?(?:chaves?|segredos?)|<\|(?:system|im_start)/i.test(original);
  const security = /vazamento|invasao|invadid[oa]|acesso nao autorizado|conta comprometida|dados expostos|roubo de dados|data breach|hacked/.test(original);
  const outage = /todos|toda a (?:equipe|empresa)|nenhum usuario|empresa inteira/.test(original) && /indisponivel|fora do ar|nao (?:consegue|conseguimos)|parad[oa]|erro 50[0234]/.test(original);
  const subject = redact(ticket.subject);
  const message = redact(ticket.message);
  return {
    ticket: { id: ticket.id, subject: subject.text, message: message.text },
    flags: { injection, security, outage },
    redactions: [...new Set([...subject.types, ...message.types])].sort(),
  };
}

const clauses = text => text.split(/[.!?;\n]+|\b(?:mas|porem|contudo|entretanto)\b/).map(part => part.trim()).filter(Boolean);
const requestVerb = /\b(?:envie|enviar|informe|informar|forneca|fornecer|mande|mandar|anexe|anexar|compartilhe|compartilhar|encaminhe|encaminhar|indique|indicar|precisamos|preciso|qual)\b/;
const personalIdentifier = /\b(?:e-?mail|telefone|cpf|identificador|id da conta|numero da conta)\b/;
const attachment = /\b(?:comprovante|extrato|documento pessoal|pdf do boleto)\b/;
function positiveRequests(text) {
  // Propague a introdução de uma solicitação para cada item da lista, incluindo
  // a negação. "Informe:\n- e-mail;\n- comprovante" não são frases independentes.
  let introduction = '';
  const expanded = text.split('\n').map(line => {
    if (!line.trim()) return line;
    if (introduction && /^\s*(?:[-*•]|\d+[.)])\s+/.test(line)) return `${introduction} ${line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '')}`;
    introduction = /:\s*$/.test(line) && requestVerb.test(line) ? line : '';
    return line;
  }).join('\n');
  return clauses(expanded).flatMap(part => {
    const matches = [...part.matchAll(new RegExp(requestVerb.source, 'g'))];
    return matches.flatMap((match, index) => {
      const prefix = part.slice(0, match.index);
      if (/\b(?:nao|nunca|jamais)\s+(?:(?:e necessario|precisa|deve|solicite|solicitamos)\s+)?$/.test(prefix)) return [];
      return [part.slice(match.index, matches[index + 1]?.index ?? part.length)];
    });
  });
}

function affirmativeClaim(text, pattern) {
  return [...text.matchAll(new RegExp(pattern.source, 'g'))].some(match => {
    const prefix = text.slice(0, match.index);
    // Negação limitada ao verbo/compromisso seguinte. Não remove a frase inteira,
    // pois uma instrução positiva posterior precisa continuar sendo verificada.
    const directNegation = /\b(?:nao|nunca|jamais)\s+(?:(?:podemos|posso|vamos|vou|deve|devemos|devo|solicite|peca)\s+)?(?:a |o )?$/;
    const deniedPromise = /\bnao (?:podemos|posso) (?:prometer|garantir|confirmar) que (?:a equipe(?: financeira| de suporte)?|o suporte)\s+$/;
    return !directNegation.test(prefix) && !deniedPromise.test(prefix);
  });
}

function checkOperationalGuidance(text, grounding, articles) {
  const errors = [];
  const plain = normalize(text).replace(/\*\*|__/g, '').replace(/[ \t]+/g, ' ');
  const unapproved = grounding.actions.reduce((body, action) => body.replaceAll(normalize(action.instruction), ' '), plain);
  const permissionChange = /\b(?:ajust(?:e|ar|em)|alter(?:e|ar|em)|conced(?:a|am|er)|liber(?:e|ar|em)|habilit(?:e|ar|em)|ativ(?:e|ar|em)|alteracao|concessao|liberacao|habilitacao|ativacao)\b|\b(?:deve(?:m)?|sera(?:o)?|precisa(?:m)?|pode(?:m)?)\s+(?:ser\s+)?(?:ajustad[ao]s?|alterad[ao]s?|concedid[ao]s?|liberad[ao]s?|habilitad[ao]s?)\b/;
  const unavailableOperation = /\b(?:consultarei|consultaremos|verificarei|verificaremos|acessarei|acessaremos|analisarei|analisaremos|alterarei|alteraremos|cancelarei|cancelaremos)\b|\b(?:vou|vamos|irei|iremos)\s+(?:consultar|verificar|acessar|analisar|alterar|cancelar)\b/;
  const followup = /\b(?:entrarei|entraremos|entrara|entrarao)\s+em contato\b|\b(?:retornara|retornarao|retornaremos|avisara|avisarao|avisaremos|notificara|notificarao|notificaremos)\b|\b(?:vou|vamos|vai|vao|irei|iremos|irao)\s+(?:entrar em contato|retornar|avisar|notificar)\b|\b(?:recebera|receberao)\s+(?:um |uma |o |a )?(?:retorno|resposta|notificacao|contato)\b/;
  for (const part of clauses(unapproved)) {
    if (/\bpermiss(?:ao|oes)\b/.test(part) && affirmativeClaim(part, permissionChange)) errors.push('unsupported_permission_change');
    if (affirmativeClaim(part, unavailableOperation)) errors.push('unavailable_operation');
    if (affirmativeClaim(part, followup)) errors.push('unsupported_followup');
  }
  // Quando houver orientação de titularidade, preserve o passo condicional
  // completo da base citada, com seu canal. Um passo correto não libera outro vago.
  const cited = new Set(grounding.evidence.map(item => item.article_id));
  const verificationSteps = articles.filter(item => cited.has(item.id)).flatMap(item => item.steps)
    .map(normalize).filter(step => /titularidade/.test(step) && /canal aprovado/.test(step));
  for (const part of clauses(plain)) {
    if (verificationSteps.length && /titularidade/.test(part)
      && !verificationSteps.some(step => part.includes(step.replace(/[.!?;]+$/, '')))) errors.push('incomplete_verification_step');
  }
  return errors;
}

function checkEditorialGuidance(text, grounding, articles) {
  const errors = [];
  const plain = normalize(text).replace(/\*\*|__/g, '');
  // As referências continuam em source_ids/evidence; só o texto ao cliente é verificado.
  if (/\bkb[ -]?\d{3,}\b/.test(plain)) errors.push('internal_reference_in_message');
  const cited = new Set(grounding.evidence.map(e => e.article_id));
  const directConsultation = articles.some(a => cited.has(a.id) && a.steps.some(s => normalize(s).startsWith('consulte a area financeiro > faturas')));
  const consultation = /\b(?:consulte|consultar|acesse|acessar|abra|abrir|verifique|verificar)\b.{0,70}\bfinanceiro\s*>\s*faturas\b/;
  const first = consultation.exec(plain);
  const informationRequested = value => positiveRequests(value.replace(/\b(?:descreva|descrever|responda|responder)\b/g, 'informe'))
    .some(part => /\b(?:competencia|divergencia|informacoes|dados|respostas?|boleto|cobranca)\b/.test(part));
  if (directConsultation && first) {
    // Apresente a consulta independente antes das perguntas para análise.
    if (informationRequested(plain.slice(0, first.index))) errors.push('self_service_prerequisite');
    for (const part of clauses(plain)) {
      const match = consultation.exec(part);
      if (!match) continue;
      const prefix = part.slice(0, match.index);
      const after = part.slice(match.index + match[0].length);
      if (/\b(?:com|apos|depois de|mediante|assim que)\b.{0,100}\b(?:informacoes|dados|respostas?|envio|responder|informar|fornecer)\b/.test(prefix)
        || (/\bpara\s+(?:poder\s+)?$/.test(prefix) && informationRequested(after))) errors.push('self_service_prerequisite');
    }
  }
  return errors;
}

export function checkDraft(draft, grounding, articles = []) {
  const errors = [];
  const allowed = new Set(grounding.evidence.map(item => item.article_id));
  if (!draft.source_ids.length || draft.source_ids.some(id => !allowed.has(id))) errors.push('invalid_citation');
  const n = normalize(draft.message);
  // Instruções copiadas literalmente da base aprovada podem mencionar uma
  // aprovação em contexto condicional. Exclua só esses trechos deste detector.
  const claims = grounding.actions.reduce((body, action) => body.replaceAll(normalize(action.instruction), ' '), n);
  // Remova apenas a afirmação negada, nunca o restante da frase: uma promessa
  // posterior ("..., mas/e seu estorno foi aprovado") deve continuar bloqueada.
  const positiveClaims = claims
    .replace(/\bnao (?:podemos|posso|e possivel) (?:confirmar|garantir) que (?:o |seu )?(?:reembolso|estorno)(?: foi| esta)? aprovado\b/g, 'RECUSA')
    .replace(/\b(?:aguarde|aguardar|espere|esperar) a analise (?:da equipe )?financeira antes de considerar (?:qualquer |o |seu )?(?:reembolso(?: ou estorno)?|estorno(?: ou reembolso)?) aprovado\b/g, 'CONDICAO_FINANCEIRA');
  if (/\b(?:garantimos|garanto|(?:reembolso|estorno)(?: foi| esta)? aprovado|problema resolvido|ja (?:realizamos|efetuamos|cancelamos))\b/.test(positiveClaims)) errors.push('unsupported_commitment');
  const requests = n.replace(/\b(?:nao|nunca|jamais)\s+(?:envie|informe|compartilhe|mande|digite)\b/g, 'AVISO');
  if (/\b(?:envie|informe|compartilhe|mande|digite).{0,45}(?:sua senha|a senha|codigo de verificacao|numero completo do cartao|seu token|chave de api)/.test(requests)) errors.push('secret_request');
  if (redact(draft.message).types.length) errors.push('sensitive_output');
  const evidenceText = normalize([
    ...articles.filter(article => allowed.has(article.id)).map(article => article.content),
    ...grounding.evidence.map(item => item.quote ?? ''),
    ...grounding.actions.map(item => item.instruction),
  ].join('\n'));
  for (const channel of [/\bsms\b|mensagem de texto/, /\bwhatsapp\b/]) {
    if (channel.test(n) && !channel.test(evidenceText)) errors.push('unsupported_channel');
  }
  // O pipeline não consulta sistemas: estes verbos afirmam uma verificação inexistente.
  if (/\b(?:identificamos|constatamos|verificamos|confirmamos|detectamos|consultamos|analisamos)\b/.test(n)) errors.push('unverified_confirmation');
  const approvedRequests = grounding.actions.flatMap(action => positiveRequests(normalize(action.instruction)));
  for (const part of positiveRequests(n)) {
    if (personalIdentifier.test(part) && !approvedRequests.some(action => personalIdentifier.test(action) && part.includes(action))) errors.push('unnecessary_personal_data');
    if (attachment.test(part) && !approvedRequests.some(action => attachment.test(action) && part.includes(action))) errors.push('unauthorized_attachment_request');
  }
  if (/\b(?:informando|informe|indique)\s+(?:qual e\s+)?o canal aprovado\b/.test(n)) errors.push('ambiguous_verification_channel');
  errors.push(...checkOperationalGuidance(draft.message, grounding, articles));
  errors.push(...checkEditorialGuidance(draft.message, grounding, articles));
  // A revisão humana continua obrigatória: estes padrões não cobrem toda linguagem natural.
  return [...new Set(errors)];
}
