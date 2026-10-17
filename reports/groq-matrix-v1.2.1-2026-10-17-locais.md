# Relatório de avaliação

Gerado: 2026-10-17T05:42:57.452Z

Provedor: **groq** · Modelo: openai/gpt-oss-120b · Prompts: 1.2.1

Avaliação automática em casos sintéticos; a qualidade semântica requer revisão humana.

4/4 execuções passaram em todas as verificações.

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

Latência p50/p95: 0/0 ms. Chamadas: 0. Tokens de entrada/saída informados: 0/0. Respostas sem uso informado: 0. Custos de requisições que falharam podem não estar contabilizados.

| Caso | Repetição | Resultado | Categoria | Prioridade | Encaminhamento |
|---|---:|---|---|---|---|
| C06 | 1 | Passou | seguranca | P1 | encaminhamento_humano |
| C07 | 1 | Passou | outros | P3 | encaminhamento_humano |
| C16 | 1 | Passou | outros | P3 | encaminhamento_humano |
| C17 | 1 | Passou | seguranca | P1 | encaminhamento_humano |
