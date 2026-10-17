# Relatório de avaliação

Gerado: 2026-10-16T14:48:26.612Z

Provedor: **demo** · Modelo: simulador-deterministico-v1 · Prompts: 1.0.0

Simulação determinística: valida a engenharia; não mede a qualidade de um LLM.

60/60 execuções passaram em todas as verificações.

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

Concordância de categoria, prioridade e encaminhamento entre repetições: 100.0%. Não mede igualdade textual nem correção das decisões.

Latência p50/p95: 0/1 ms. Chamadas: 153. Tokens de entrada/saída informados: 0/0. Respostas sem uso informado: 0. Custos de requisições que falharam podem não estar contabilizados.

| Caso | Repetição | Resultado | Categoria | Prioridade | Encaminhamento |
|---|---:|---|---|---|---|
| C01 | 1 | Passou | acesso | P2 | rascunho_validado |
| C01 | 2 | Passou | acesso | P2 | rascunho_validado |
| C01 | 3 | Passou | acesso | P2 | rascunho_validado |
| C02 | 1 | Passou | cobranca | P3 | rascunho_validado |
| C02 | 2 | Passou | cobranca | P3 | rascunho_validado |
| C02 | 3 | Passou | cobranca | P3 | rascunho_validado |
| C03 | 1 | Passou | erro_tecnico | P1 | encaminhamento_humano |
| C03 | 2 | Passou | erro_tecnico | P1 | encaminhamento_humano |
| C03 | 3 | Passou | erro_tecnico | P1 | encaminhamento_humano |
| C04 | 1 | Passou | cancelamento | P3 | rascunho_validado |
| C04 | 2 | Passou | cancelamento | P3 | rascunho_validado |
| C04 | 3 | Passou | cancelamento | P3 | rascunho_validado |
| C05 | 1 | Passou | duvida | P4 | rascunho_validado |
| C05 | 2 | Passou | duvida | P4 | rascunho_validado |
| C05 | 3 | Passou | duvida | P4 | rascunho_validado |
| C06 | 1 | Passou | seguranca | P1 | encaminhamento_humano |
| C06 | 2 | Passou | seguranca | P1 | encaminhamento_humano |
| C06 | 3 | Passou | seguranca | P1 | encaminhamento_humano |
| C07 | 1 | Passou | outros | P3 | encaminhamento_humano |
| C07 | 2 | Passou | outros | P3 | encaminhamento_humano |
| C07 | 3 | Passou | outros | P3 | encaminhamento_humano |
| C08 | 1 | Passou | outros | P3 | encaminhamento_humano |
| C08 | 2 | Passou | outros | P3 | encaminhamento_humano |
| C08 | 3 | Passou | outros | P3 | encaminhamento_humano |
| C09 | 1 | Passou | outros | P3 | encaminhamento_humano |
| C09 | 2 | Passou | outros | P3 | encaminhamento_humano |
| C09 | 3 | Passou | outros | P3 | encaminhamento_humano |
| C10 | 1 | Passou | cobranca | P3 | rascunho_validado |
| C10 | 2 | Passou | cobranca | P3 | rascunho_validado |
| C10 | 3 | Passou | cobranca | P3 | rascunho_validado |
| C11 | 1 | Passou | acesso | P2 | rascunho_validado |
| C11 | 2 | Passou | acesso | P2 | rascunho_validado |
| C11 | 3 | Passou | acesso | P2 | rascunho_validado |
| C12 | 1 | Passou | erro_tecnico | P2 | rascunho_validado |
| C12 | 2 | Passou | erro_tecnico | P2 | rascunho_validado |
| C12 | 3 | Passou | erro_tecnico | P2 | rascunho_validado |
| C13 | 1 | Passou | duvida | P4 | rascunho_validado |
| C13 | 2 | Passou | duvida | P4 | rascunho_validado |
| C13 | 3 | Passou | duvida | P4 | rascunho_validado |
| C14 | 1 | Passou | outros | P3 | encaminhamento_humano |
| C14 | 2 | Passou | outros | P3 | encaminhamento_humano |
| C14 | 3 | Passou | outros | P3 | encaminhamento_humano |
| C15 | 1 | Passou | cobranca | P3 | rascunho_validado |
| C15 | 2 | Passou | cobranca | P3 | rascunho_validado |
| C15 | 3 | Passou | cobranca | P3 | rascunho_validado |
| C16 | 1 | Passou | outros | P3 | encaminhamento_humano |
| C16 | 2 | Passou | outros | P3 | encaminhamento_humano |
| C16 | 3 | Passou | outros | P3 | encaminhamento_humano |
| C17 | 1 | Passou | seguranca | P1 | encaminhamento_humano |
| C17 | 2 | Passou | seguranca | P1 | encaminhamento_humano |
| C17 | 3 | Passou | seguranca | P1 | encaminhamento_humano |
| C18 | 1 | Passou | acesso | P2 | rascunho_validado |
| C18 | 2 | Passou | acesso | P2 | rascunho_validado |
| C18 | 3 | Passou | acesso | P2 | rascunho_validado |
| C19 | 1 | Passou | duvida | P4 | rascunho_validado |
| C19 | 2 | Passou | duvida | P4 | rascunho_validado |
| C19 | 3 | Passou | duvida | P4 | rascunho_validado |
| C20 | 1 | Passou | cancelamento | P3 | rascunho_validado |
| C20 | 2 | Passou | cancelamento | P3 | rascunho_validado |
| C20 | 3 | Passou | cancelamento | P3 | rascunho_validado |
