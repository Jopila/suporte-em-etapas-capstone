# Progresso auditado — pipeline 1.1.2

Gerado: 2026-10-17T04:58:55.726Z. Consolidação offline; nenhuma chamada à API.

20/20 casos concluídos; 20 aprovados entre os concluídos. Matriz concluída.

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
| C15 | concluido | Sim | 24.479 |
| C16 | concluido | Sim | 0 |
| C17 | concluido | Sim | 0 |
| C18 | concluido | Sim | 15.277 |
| C19 | concluido | Sim | 6.772 |
| C20 | concluido | Sim | 6.845 |

## Consumo do ciclo de correções e retomadas

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
| 1.1.2 retomada adicional 5 | 5 | 6.153 | 961 | 7.114 |
| 1.1.2 retomada adicional 6 | 2 | 1.562 | 166 | 1.728 |
| 1.1.2 retomada adicional 7 | 3 | 2.996 | 389 | 3.385 |
| 1.1.2 retomada adicional 8 | 3 | 1.567 | 128 | 1.695 |
| 1.1.2 retomada adicional 9 | 8 | 10.785 | 1.280 | 12.065 |
| 1.1.2 retomada adicional 10 | 12 | 18.444 | 2.012 | 20.456 |
| **Total** | **154** | **215.887** | **24.467** | **240.354** |

Tokens informados em usage. Respostas HTTP 429 não forneceram usage; não se presume custo monetário nem consumo nulo de tentativas rejeitadas.

A última solicitação corresponde apenas à retomada adicional 10: **20.456 tokens**, em 12 chamadas HTTP 200, com C18, C19 e C20 aprovados e os 17 resultados anteriores preservados. O total da tabela inclui todas as solicitações do ciclo de correções.

Os 20 resultados concluídos da versão 1.1.2 consumiram **87.230 tokens**; suas tentativas interrompidas somaram **34.162**, totalizando **121.392** nessa versão. A matriz original (73.625) e o teste isolado anterior (6.242) não integram o total de 240.354 da tabela. Incluindo-os, o histórico documentado soma **320.221 tokens**. A [comparação final](groq-comparison-v1.1.2-final-2026-10-17.md) mostra a evolução 17/20 → 19/20 → 20/20. Detalhes das ressalvas semânticas e reprodução offline: [relatório das correções](../docs/COMPARACAO_GROQ_CORRECOES.md).
