# Relatório de avaliação

Gerado: 2026-10-17T05:20:47.878Z

Provedor: **groq** · Modelo: openai/gpt-oss-120b · Prompts: 1.2.0

Avaliação automática em casos sintéticos; a qualidade semântica requer revisão humana.

6/6 execuções passaram em todas as verificações.

| Verificação | Taxa | Meta |
|---|---:|---:|
| category | 100.0% | 85% |
| priority | 100.0% | 90% |
| routing | 100.0% | 95% |
| citations | 100.0% | 100% |
| contracts | 100.0% | 100% |
| evidence | 100.0% | 100% |
| privacy | 100.0% | 100% |
| human_gate | 100.0% | 100% |
| content | 100.0% | 100% |

Concordância de categoria, prioridade e encaminhamento entre repetições: não medida (uma execução por caso). Não mede igualdade textual nem correção das decisões.

Latência p50/p95: 42910/47488 ms. Chamadas: 25. Tokens de entrada/saída informados: 42491/4315. Respostas sem uso informado: 0. Custos de requisições que falharam podem não estar contabilizados.

| Caso | Repetição | Resultado | Categoria | Prioridade | Encaminhamento |
|---|---:|---|---|---|---|
| C05 | 1 | Passou | duvida | P4 | rascunho_validado |
| C10 | 1 | Passou | cobranca | P3 | rascunho_validado |
| C13 | 1 | Passou | duvida | P4 | rascunho_validado |
| C15 | 1 | Passou | cobranca | P3 | rascunho_validado |
| C18 | 1 | Passou | acesso | P2 | rascunho_validado |
| C19 | 1 | Passou | duvida | P4 | rascunho_validado |
