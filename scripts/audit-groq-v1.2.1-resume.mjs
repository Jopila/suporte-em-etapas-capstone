// Conferência offline da retomada; não chama o provedor nem altera evidências.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { parseArgs, parseEnv } from 'node:util';
import { loadCases, scoreCase } from '../src/evaluation.mjs';
import { loadKnowledge } from '../src/knowledge.mjs';
import { loadPrompts, digest } from '../src/prompts.mjs';

const { values } = parseArgs({ options: {
  comparison: { type: 'string' }, preservation: { type: 'string' },
  plan: { type: 'string', multiple: true }, output: { type: 'string' },
} });
for (const key of ['comparison', 'preservation', 'plan', 'output']) assert.ok(values[key], `missing_${key}`);
const read = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const hash = async p => createHash('sha256').update(await fs.readFile(p)).digest('hex');
const [comparison, preserved, previous, manifest, data, knowledge, prompts] = await Promise.all([
  read(values.comparison), read(values.preservation), read('reports/groq-v1.2.1-final-audit.json'),
  read('reports/groq-v1.2.1-report-manifest.json'), loadCases(), loadKnowledge(), loadPrompts(),
]);
assert.equal(comparison.prompt_hash, prompts.hash);
assert.equal(manifest.prompt_hash, prompts.hash);
assert.equal(manifest.dataset_hash, digest(data));
assert.equal(manifest.knowledge_hash, digest(knowledge));
for (const [p, h] of Object.entries(manifest.files)) assert.equal(await hash(p), h, p);
for (const [p, h] of Object.entries(preserved.historical_artifacts_sha256)) assert.equal(await hash(p), h, p);
for (const e of Object.values(preserved.document_snapshots)) assert.equal(await hash(e.snapshot), e.sha256, e.snapshot);

const entries = [], newEntries = [], http = [], newHttp = [], inspectedSegments = [];
for (const segment of comparison.segments) {
  assert.equal(await hash(segment.checkpoint), segment.sha256, segment.checkpoint);
  const cp = await read(segment.checkpoint);
  for (const e of cp.cases) {
    assert.equal(e.result.pipeline_version, '1.2.1');
    assert.equal(e.result.prompt_hash, prompts.hash);
    assert.equal(e.result.knowledge_hash, manifest.knowledge_hash);
    assert.equal(e.result.model, manifest.model);
    assert.equal(e.result.requires_human_approval, true);
    assert.equal(e.result.auto_sent, false);
    const score = scoreCase(data.cases.find(c => c.id === e.id), e.result, knowledge);
    assert.deepEqual(e.checks, score.checks); assert.equal(e.passed, score.passed);
    assert.deepEqual(await read(segment.checkpoint.replace(/-checkpoint\.json$/, `-cases/${e.id}.json`)), e);
  }
  entries.push(...cp.cases); http.push(...cp.http_attempts);
  if (Date.parse(cp.started_at) >= Date.parse(preserved.created_at)) {
    assert.ok(cp.cases.every(e => preserved.requested_case_ids.includes(e.id)));
    newEntries.push(...cp.cases); newHttp.push(...cp.http_attempts);
    inspectedSegments.push(segment.checkpoint);
  }
}
assert.ok(inspectedSegments.length);
const done = entries.filter(e => !e.result.operational_error);
assert.equal(new Set(done.map(e => e.id)).size, done.length, 'completed_case_repeated');
assert.deepEqual(data.cases.map(c => c.id).filter(id => !done.some(e => e.id === id)), comparison.pending_case_ids);
const usage = items => {
  const total = { requests: 0, prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  for (const e of items) for (const k of ['requests', 'prompt_tokens', 'completion_tokens']) total[k] += e.result.metrics[k];
  total.total_tokens = total.prompt_tokens + total.completion_tokens; return total;
};
const currentUsage = usage(newEntries), versionUsage = usage(entries);
const cycle = Object.fromEntries(Object.keys(currentUsage).map(k => [k, previous.correction_cycle_usage[k] + currentUsage[k]]));
assert.equal(versionUsage.total_tokens, comparison.candidate_all_attempts_usage.total_tokens);
assert.equal(cycle.total_tokens, comparison.correction_cycle_tokens_including_this_request);
assert.equal(previous.total_documented_historical_tokens + currentUsage.total_tokens, comparison.total_documented_historical_tokens);
const counts = items => items.reduce((r, a) => ({ ...r, [a.status]: (r[a.status] ?? 0) + 1 }), {});
assert.deepEqual(counts(http), comparison.http_status_counts);
assert.ok(currentUsage.requests >= newHttp.length);
for (let i = 0; i < http.length - 1; i++) if (http[i].status === 429 && http[i].retry_after_ms) {
  assert.ok(http[i + 1].observed_at_ms >= http[i].observed_at_ms + http[i].retry_after_ms, 'retry_after_violated');
}
for (const p of values.plan) {
  const plan = await read(p), segment = comparison.segments.find(s => s.checkpoint === `${plan.output_prefix}-checkpoint.json`);
  assert.ok(segment, 'plan_segment_missing');
  const cp = await read(segment.checkpoint);
  assert.ok(Date.parse(cp.started_at) >= Date.parse(plan.not_before_utc));
  assert.ok(cp.cases.every(e => plan.pending_case_ids.includes(e.id)));
  for (const [file, h] of Object.entries(plan.preserved_checkpoints)) assert.equal(await hash(file), h, file);
}
assert.match(await fs.readFile('reports/test-results-v1.2.1.tap', 'utf8'), /# pass 79\r?\n# fail 0/);
const documents = ['README.md', ...(await fs.readdir('docs')).filter(p => p.endsWith('.md')).map(p => `docs/${p}`), values.comparison.replace(/\.json$/, '.md')];
let links = 0;
for (const p of documents) for (const m of (await fs.readFile(p, 'utf8')).matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
  const url = m[1].replace(/^<|>$/g, '').split('#')[0]; if (!url || /^[a-z]+:/i.test(url)) continue;
  const target = path.resolve(path.dirname(p), decodeURIComponent(url));
  if (target !== path.resolve(values.output)) await fs.access(target);
  links++;
}
async function walk(dir) {
  const files = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.env.local'].includes(e.name)) continue;
    const p = path.join(dir, e.name); if (e.isDirectory()) files.push(...await walk(p)); else files.push(p);
  }
  return files;
}
const key = parseEnv(await fs.readFile('.env.local', 'utf8')).GROQ_API_KEY;
assert.ok(key?.length > 15);
const files = await walk('.');
for (const p of files) assert.ok(!(await fs.readFile(p)).includes(Buffer.from(key)), `secret_detected:${p}`);
const currentCounts = counts(newHttp);
const audit = {
  generated_at: new Date().toISOString(), network_calls_in_audit: 0, pipeline_version: '1.2.1', prompt_hash: prompts.hash,
  comparison: values.comparison, comparison_sha256: await hash(values.comparison),
  historical_artifacts_unchanged: Object.keys(preserved.historical_artifacts_sha256).length,
  previous_document_snapshots_verified: Object.keys(preserved.document_snapshots).length,
  manifest_files_verified: Object.keys(manifest.files).length, local_tests_preserved: { passed: 79, failed: 0 },
  resumed_checkpoints: inspectedSegments, complete: comparison.complete, completed_cases: done.length,
  passed_completed_cases: done.filter(e => e.passed).length, new_completed_case_ids: newEntries.filter(e => !e.result.operational_error).map(e => e.id),
  completed_local_case_ids: done.filter(e => e.result.metrics.requests === 0).map(e => e.id),
  pending_case_ids: comparison.pending_case_ids, current_request_usage: currentUsage, version_all_attempts_usage: versionUsage,
  current_request_http_status_counts: currentCounts, current_request_attempts_without_http_response: currentUsage.requests - newHttp.length,
  correction_cycle_usage: cycle, correction_cycle_http_status_counts: Object.fromEntries(['200', '429'].map(k => [k, (previous.correction_cycle_http_status_counts[k] ?? 0) + (currentCounts[k] ?? 0)])),
  correction_cycle_attempts_without_http_response: previous.correction_cycle_attempts_without_http_response + currentUsage.requests - newHttp.length,
  total_documented_historical_tokens: comparison.total_documented_historical_tokens, retry_after_respected: true,
  local_document_links_checked: links, broken_links: 0, files_scanned_for_exact_key: files.length, exact_key_leaks: 0,
  document_hashes: Object.fromEntries(await Promise.all(documents.map(async p => [p, await hash(p)]))),
  audit_script_sha256: await hash('scripts/audit-groq-v1.2.1-resume.mjs'),
};
await fs.writeFile(values.output, JSON.stringify(audit, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ complete: audit.complete, completed: done.length, pending: audit.pending_case_ids,
  request_tokens: currentUsage.total_tokens, cycle_tokens: cycle.total_tokens, historical_tokens: audit.total_documented_historical_tokens,
  preserved_files: audit.historical_artifacts_unchanged, broken_links: 0, key_leaks: 0 }));
