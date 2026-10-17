# Relatório de avaliação

Gerado: 2026-10-17T04:58:30.985Z

Provedor: **groq** · Modelo: openai/gpt-oss-120b · Prompts: 1.1.1

Avaliação automática em casos sintéticos; a qualidade semântica requer revisão humana.

3/3 execuções passaram em todas as verificações.

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

Latência p50/p95: 38542/43723 ms. Chamadas: 12. Tokens de entrada/saída informados: 18444/2012. Respostas sem uso informado: 0. Custos de requisições que falharam podem não estar contabilizados.

| Caso | Repetição | Resultado | Categoria | Prioridade | Encaminhamento |
|---|---:|---|---|---|---|
| C18 | 1 | Passou | acesso | P2 | rascunho_validado |
| C19 | 1 | Passou | duvida | P4 | rascunho_validado |
| C20 | 1 | Passou | cancelamento | P3 | rascunho_validado |
