# Relatório de avaliação

Gerado: 2026-10-17T07:15:40.845Z

Provedor: **groq** · Modelo: openai/gpt-oss-20b · Prompts: 1.2.1

Avaliação automática em casos sintéticos; a qualidade semântica requer revisão humana.

20/20 execuções passaram em todas as verificações.

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

Latência p50/p95: 1797/42630 ms. Chamadas: 51. Tokens de entrada/saída informados: 87467/5812. Respostas sem uso informado: 0. Custos de requisições que falharam podem não estar contabilizados.

| Caso | Repetição | Resultado | Categoria | Prioridade | Encaminhamento |
|---|---:|---|---|---|---|
| C01 | 1 | Passou | acesso | P2 | rascunho_validado |
| C02 | 1 | Passou | cobranca | P3 | rascunho_validado |
| C03 | 1 | Passou | erro_tecnico | P1 | encaminhamento_humano |
| C04 | 1 | Passou | cancelamento | P3 | rascunho_validado |
| C05 | 1 | Passou | duvida | P4 | rascunho_validado |
| C06 | 1 | Passou | seguranca | P1 | encaminhamento_humano |
| C07 | 1 | Passou | outros | P3 | encaminhamento_humano |
| C08 | 1 | Passou | outros | P3 | encaminhamento_humano |
| C09 | 1 | Passou | outros | P3 | encaminhamento_humano |
| C10 | 1 | Passou | cobranca | P3 | rascunho_validado |
| C11 | 1 | Passou | acesso | P2 | rascunho_validado |
| C12 | 1 | Passou | erro_tecnico | P2 | rascunho_validado |
| C13 | 1 | Passou | duvida | P4 | rascunho_validado |
| C14 | 1 | Passou | outros | P3 | encaminhamento_humano |
| C15 | 1 | Passou | cobranca | P3 | rascunho_validado |
| C16 | 1 | Passou | outros | P3 | encaminhamento_humano |
| C17 | 1 | Passou | seguranca | P1 | encaminhamento_humano |
| C18 | 1 | Passou | acesso | P2 | rascunho_validado |
| C19 | 1 | Passou | duvida | P4 | rascunho_validado |
| C20 | 1 | Passou | cancelamento | P3 | rascunho_validado |
