# Comparação final — Groq / pipeline 1.1.2

Gerado em 2026-10-17T05:00:14.648Z. Consolidação offline; nenhuma chamada à API.

**20/20 casos aprovados nas nove verificações automáticas.** São 15 casos com API e cinco encaminhamentos locais. A versão final foi consolidada de resultados concluídos em 16 e 17/10/2026, com os mesmos casos, gabaritos, base, modelo e versão de código.

| Indicador | Original 1.0.0 | Intermediária 1.1.1 | Final 1.1.2 consolidada |
|---|---:|---:|---:|
| Aprovações nas oito métricas originais | 17/20 | 19/20 | 20/20 |
| Aprovações pelo avaliador ampliado atual | 8/20 (offline) | 19/20 (offline) | 20/20 |
| Chamadas nas execuções concluídas | 49 | 51 | 51 |
| Tokens de entrada | 65.127 | 78.794 | 78.751 |
| Tokens de saída | 8.498 | 8.886 | 8.479 |
| Tokens nas execuções concluídas | 73.625 | 87.680 | 87.230 |

As oito métricas originais passaram de 85% para 100% (+15 pontos percentuais). Os tokens dos 20 resultados concluídos aumentaram 13.605 (+18,48%) em relação à original. Essa comparação exclui apenas desta coluna as tentativas interrompidas, que estão integralmente contabilizadas abaixo.

## Consumo preservado

- Execuções concluídas da versão 1.1.2: **87.230 tokens**.
- Tentativas interrompidas da mesma versão: **34.162 tokens**.
- Todas as tentativas da versão 1.1.2: **121.392 tokens**.
- Ciclo completo de correções e retomadas: **240.354 tokens**.
- Histórico com matriz original e teste isolado anterior: **320.221 tokens**.

Tokens informados em usage. Os 14 HTTP 429 históricos não forneceram uso; não se presume custo ou consumo nulo.

## Comparação por caso

| Caso | Original (oito métricas) | Final (nove métricas) | Tokens original | Tokens final concluído | Tokens em todas as tentativas 1.1.2 |
|---|---|---|---:|---:|---:|
| C01 | Passou | Passou | 6.034 | 6.714 | 6.714 |
| C02 | Passou | Passou | 6.198 | 7.071 | 7.071 |
| C03 | Passou | Passou | 0 | 0 | 0 |
| C04 | Passou | Passou | 6.093 | 6.729 | 6.729 |
| C05 | Passou | Passou | 5.674 | 6.535 | 6.535 |
| C06 | Passou | Passou | 0 | 0 | 0 |
| C07 | Passou | Passou | 0 | 0 | 0 |
| C08 | Passou | Passou | 1.482 | 1.687 | 1.687 |
| C09 | Falhou | Passou | 1.491 | 1.789 | 1.789 |
| C10 | Passou | Passou | 6.191 | 6.911 | 6.911 |
| C11 | Passou | Passou | 6.087 | 7.014 | 7.014 |
| C12 | Passou | Passou | 6.215 | 6.921 | 6.921 |
| C13 | Passou | Passou | 5.748 | 6.666 | 14.944 |
| C14 | Falhou | Passou | 1.461 | 1.704 | 1.704 |
| C15 | Falhou | Passou | 2.881 | 7.033 | 24.479 |
| C16 | Passou | Passou | 0 | 0 | 0 |
| C17 | Passou | Passou | 0 | 0 | 0 |
| C18 | Passou | Passou | 6.021 | 6.839 | 15.277 |
| C19 | Passou | Passou | 6.052 | 6.772 | 6.772 |
| C20 | Passou | Passou | 5.997 | 6.845 | 6.845 |

## Limitações

A pontuação não comprova prontidão para produção. Os casos foram usados no desenvolvimento, o detector de conteúdo não é independente e há observações semânticas nas respostas aprovadas. Todos os rascunhos continuam exigindo revisão humana. Consulte o [relatório das correções e ressalvas](../docs/COMPARACAO_GROQ_CORRECOES.md) e o [registro de consumo completo](groq-progress-v1.1.2-retomada-10-consumo.json).
