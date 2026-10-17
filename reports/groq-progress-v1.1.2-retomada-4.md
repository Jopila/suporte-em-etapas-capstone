# Progresso auditado — pipeline 1.1.2

Gerado: 2026-10-16T18:25:46.458Z. Consolidação offline; nenhuma chamada à API.

16/20 casos concluídos; 16 aprovados entre os concluídos. Pendentes: **C15, C18, C19, C20**. A matriz final permanece incompleta.

Cinco casos da matriz são tratados pelos controles locais; a pontuação não mede apenas o LLM.

| Caso | Estado da validação | Aprovado | Tokens em todas as tentativas 1.1.2 |
|---|---|---|---:|
| C01 | concluido | Sim | 6.714 |
| C02 | concluido | Sim | 7.071 |
| C03 | concluido | Sim | 0 |
| C04 | concluido | Sim | 6.729 |
| C05 | concluido | Sim | 6.535 |
| C06 | concluido | Sim | 0 |
| C07 | concluido | Sim | 0 |
| C08 | concluido | Sim | 1.687 |
| C09 | concluido | Sim | 1.789 |
| C10 | concluido | Sim | 6.911 |
| C11 | concluido | Sim | 7.014 |
| C12 | concluido | Sim | 6.921 |
| C13 | concluido | Sim | 14.944 |
| C14 | concluido | Sim | 1.704 |
| C15 | pendente_apos_erro_operacional | Pendente | 5.219 |
| C16 | concluido | Sim | 0 |
| C17 | concluido | Sim | 0 |
| C18 | pendente_apos_erro_operacional | Pendente | 1.711 |
| C19 | nao_executado | Pendente | 0 |
| C20 | nao_executado | Pendente | 0 |

## Consumo desta solicitação

| Segmento | Chamadas | Entrada | Saída | Total |
|---|---:|---:|---:|---:|
| 1.1.0 parcial | 18 | 27.992 | 3.290 | 31.282 |
| 1.1.1 completa | 51 | 78.794 | 8.886 | 87.680 |
| 1.1.2 tentativa integral | 31 | 46.387 | 4.984 | 51.371 |
| 1.1.2 retomada de C13 | 4 | 3.113 | 276 | 3.389 |
| 1.1.2 retomada adicional 1 | 4 | 4.400 | 498 | 4.898 |
| 1.1.2 retomada adicional 2 | 2 | 1.559 | 136 | 1.695 |
| 1.1.2 retomada adicional 3 | 8 | 10.568 | 1.317 | 11.885 |
| 1.1.2 retomada adicional 4 | 3 | 1.567 | 144 | 1.711 |
| **Total** | **121** | **174.380** | **19.531** | **193.911** |

Tokens informados em usage. Respostas HTTP 429 não forneceram usage; não se presume custo monetário nem consumo nulo de tentativas rejeitadas.

A matriz original (73.625 tokens) e o teste isolado anterior (6.242) não integram esse total. Detalhes de falhas, limitações e comandos: [relatório das correções](../docs/COMPARACAO_GROQ_CORRECOES.md).
