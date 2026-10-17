import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { GroqProvider, integerSetting } from './providers/groq.mjs';
import { DemoProvider } from './providers/demo.mjs';
import { runPipeline } from './pipeline.mjs';
import { evaluate, reportMarkdown } from './evaluation.mjs';
import { loadPrompts } from './prompts.mjs';

const help = `Suporte em Etapas — capstone Módulo 2\n\nUso:\n  npm run demo\n  npm test\n  npm run evaluate -- --repeat 3\n  npm start -- run --provider groq --input examples/chamado.json\n  npm start -- evaluate --provider groq --limit 1 --output reports/groq-smoke\n  npm run prompts\n\nOpções: --provider demo|groq, --input arquivo.json, --output caminho, --repeat 1..5, --limit N\nSem --provider, usa demo. O modo groq exige GROQ_API_KEY; nunca cai silenciosamente em demo.\nO comando run grava um JSON com --output. evaluate grava <caminho>.json e <caminho>.md.\n`;

async function save(path, value) {
  await mkdir(dirname(resolve(path)), { recursive: true });
  await writeFile(path, value, { encoding: 'utf8', mode: 0o600 });
}

export async function main(args = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    provider: { type: 'string', default: 'demo' }, input: { type: 'string' }, output: { type: 'string' },
    repeat: { type: 'string' }, limit: { type: 'string' }, help: { type: 'boolean', short: 'h' },
  } });
  if (values.help || !positionals.length) { console.log(help); return 0; }
  const [command] = positionals;
  if (positionals.length !== 1 || !['run', 'evaluate', 'prompts'].includes(command)) throw new Error('invalid_command');
  if (command === 'prompts') {
    const bundle = await loadPrompts();
    console.log(JSON.stringify({ version: bundle.version, hash: bundle.hash, stages: Object.keys(bundle.prompts) }, null, 2));
    return 0;
  }
  if (!['demo', 'groq'].includes(values.provider)) throw new Error('invalid_provider');
  const provider = values.provider === 'groq' ? new GroqProvider() : new DemoProvider();
  const timeoutMs = integerSetting(process.env.PIPELINE_TIMEOUT_MS, 120000, 1000, 600000);
  if (command === 'run') {
    if (!values.input) throw new Error('input_required');
    const raw = await readFile(values.input, 'utf8');
    if (Buffer.byteLength(raw) > 64000) throw new Error('input_too_large');
    const result = await runPipeline(JSON.parse(raw.replace(/^\uFEFF/, '')), { provider, timeoutMs });
    const json = JSON.stringify(result, null, 2) + '\n';
    if (values.output) await save(values.output, json);
    console.log(json);
    return result.operational_error ? 1 : 0;
  }
  const repeat = integerSetting(values.repeat, 1, 1, 5);
  const limit = values.limit === undefined ? undefined : integerSetting(values.limit, 1, 1, 1000);
  const report = await evaluate({ provider, repeat, limit, timeoutMs,
    onProgress: ({ id, run, passed }) => console.error(`${id} · repetição ${run}: ${passed ? 'passou' : 'falhou'}`),
  });
  if (values.output) {
    await save(`${values.output}.json`, JSON.stringify(report, null, 2) + '\n');
    await save(`${values.output}.md`, reportMarkdown(report));
  }
  console.log(JSON.stringify({ provider: report.provider, simulation: report.simulation, passed: report.passed, runs: report.runs, rates: report.rates, thresholds_passed: report.thresholds_passed }, null, 2));
  return report.thresholds_passed ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    // Não ecoar mensagens do provedor, caminhos arbitrários, dados do chamado ou segredos.
    const known = new Set(['missing_groq_key', 'invalid_configuration', 'invalid_command', 'invalid_provider', 'input_required', 'input_too_large', 'invalid_repeat', 'invalid_limit', 'empty_dataset', 'invalid_ticket', 'invalid_ticket_id', 'invalid_ticket_subject', 'invalid_ticket_message', 'unexpected_ticket_fields']);
    const code = known.has(error.code ?? error.message) ? (error.code ?? error.message) : error instanceof SyntaxError ? 'invalid_json_file' : 'command_failed';
    console.error(`Erro: ${code}. Consulte README.md e docs/OPERACAO.md. Nenhuma mensagem foi enviada ao cliente.`);
    process.exitCode = 1;
  });
}
