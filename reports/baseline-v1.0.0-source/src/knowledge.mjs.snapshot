import { readFile } from 'node:fs/promises';
import { normalize } from './safety.mjs';
import { ContractError } from './contracts.mjs';

export async function loadKnowledge() {
  const base = JSON.parse(await readFile(new URL('../data/knowledge-base.json', import.meta.url), 'utf8'));
  const seen = new Set();
  for (const article of base.articles) {
    if (seen.has(article.id) || !article.id || !article.content || !Array.isArray(article.steps)) throw new Error('invalid_knowledge_base');
    seen.add(article.id);
  }
  return base;
}

export function retrieve(ticket, triage, articles, limit = 3) {
  const query = normalize(`${ticket.subject} ${ticket.message}`);
  return articles.map(article => {
    const hits = article.keywords.filter(word => query.includes(normalize(word))).length;
    return { article, score: hits ? hits + (article.category === triage.category ? 2 : 0) : 0 };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.article.id.localeCompare(b.article.id))
    .slice(0, limit).map(({ article }) => article);
}

export function checkGrounding(grounding, articles) {
  if (!grounding.supported) {
    if (grounding.evidence.length || grounding.actions.length) throw new ContractError('contradictory_grounding');
    return;
  }
  if (!grounding.evidence.length || !grounding.actions.length) throw new ContractError('empty_grounding');
  const available = new Map(articles.map(item => [item.id, item]));
  for (const evidence of grounding.evidence) {
    const article = available.get(evidence.article_id);
    if (!article || evidence.quote.trim().length < 12 || !article.content.includes(evidence.quote)) throw new ContractError('unverified_evidence');
  }
  const cited = new Set(grounding.evidence.map(item => item.article_id));
  for (const action of grounding.actions) {
    if (!cited.has(action.article_id) || !available.get(action.article_id)?.steps.includes(action.instruction)) throw new ContractError('unauthorized_action');
  }
}
