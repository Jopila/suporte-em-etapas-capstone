# Comparação das matrizes no Groq

**Registro histórico encerrado na rodada 1.1.1.** O total de 118.962 tokens abaixo corresponde àquele momento. As tentativas posteriores da versão 1.1.2 e o total atualizado estão no [relatório das correções](../docs/COMPARACAO_GROQ_CORRECOES.md).

Modelo: openai/gpt-oss-120b. Mesmos 20 casos, gabaritos e base. Uma execução por caso em cada rodada completa.

| Indicador | Original 1.0.0 | Corrigida 1.1.1 |
|---|---:|---:|
| Casos aprovados pelas oito métricas originais | 17/20 | 19/20 |
| Casos aprovados pelo avaliador ampliado atual | 8/20 (reanálise offline) | 19/20 |
| Chamadas | 49 | 51 |
| Tokens de entrada | 65.127 | 78.794 |
| Tokens de saída | 8.498 | 8.886 |
| Tokens totais | 73.625 | 87.680 |

Variação de tokens entre rodadas completas: 14.055 (19,09%). Metas agregadas da nova rodada: não atingidas.

O avaliador ampliado acrescenta padrões de conteúdo às verificações originais. É uma triagem conservadora que compartilha regras com o pipeline; não é avaliação semântica independente. A pontuação original não foi alterada.

## Resultado e tokens por caso

| Caso | Critérios originais antes | Critérios originais depois | Tokens antes | Tokens depois | Diferença |
|---|---|---|---:|---:|---:|
| C01 | Passou | Passou | 6.034 | 6.681 | 647 |
| C02 | Passou | Passou | 6.198 | 7.078 | 880 |
| C03 | Passou | Passou | 0 | 0 | 0 |
| C04 | Passou | Passou | 6.093 | 6.861 | 768 |
| C05 | Passou | Passou | 5.674 | 6.535 | 861 |
| C06 | Passou | Passou | 0 | 0 | 0 |
| C07 | Passou | Passou | 0 | 0 | 0 |
| C08 | Passou | Passou | 1.482 | 1.691 | 209 |
| C09 | category, priority | Passou | 1.491 | 1.788 | 297 |
| C10 | Passou | Passou | 6.191 | 6.940 | 749 |
| C11 | Passou | Passou | 6.087 | 7.007 | 920 |
| C12 | Passou | Passou | 6.215 | 7.063 | 848 |
| C13 | Passou | Passou | 5.748 | 6.660 | 912 |
| C14 | priority | Passou | 1.461 | 1.678 | 217 |
| C15 | routing, citations | routing, citations | 2.881 | 7.294 | 4.413 |
| C16 | Passou | Passou | 0 | 0 | 0 |
| C17 | Passou | Passou | 0 | 0 | 0 |
| C18 | Passou | Passou | 6.021 | 6.797 | 776 |
| C19 | Passou | Passou | 6.052 | 6.804 | 752 |
| C20 | Passou | Passou | 5.997 | 6.803 | 806 |

## Consumo da correção

A rodada parcial 1.1.0 foi encerrada entre casos, após 7 casos e 18 chamadas. Consumiu 31.282 tokens, preservados no checkpoint. Esses valores não entram na comparação das matrizes completas.

**Total desta solicitação (rodada parcial + rodada completa nova): 118.962 tokens**, sendo 106.786 de entrada e 12.176 de saída, em 69 chamadas. Exclui a matriz original e o teste isolado anterior.

## Auditoria

Os 20 IDs, rótulos, pontuações, chamadas, tokens e hashes foram reconciliados. Arquivos de código, prompts e testes da versão avaliada correspondem ao manifesto salvo antes da execução. Os resultados originais foram preservados.

Veja também a [análise das correções e das respostas](../docs/COMPARACAO_GROQ_CORRECOES.md).
