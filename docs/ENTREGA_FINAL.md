# Resultados finais da entrega

**Data:** 17/10/2026 · **pipeline/prompts/avaliador:** 1.2.1 · **provedor:** Groq · **modelo da matriz de entrega:** `openai/gpt-oss-20b`.

## Conclusão

**20/20 casos aprovados na matriz independente Groq 20B**, com 15 casos que usaram API e cinco controles locais. A versão 1.2.1 passou novamente em **79 testes locais** e **60/60 execuções simuladas**.

O capstone está organizado para entrega acadêmica: biblioteca, pipeline, documentação, testes, exemplos e evidências de execução. A matriz atual está completa no perfil 20B. O protótipo não foi implantado em produção, e o envio de respostas permanece dependente do atendente.

O 120B sofreu bloqueios recorrentes de cota. Foi executado um experimento independente no 20B, mantendo código, prompts, base, gabarito e rubrica 1.2.1. O Groq documenta suporte de ambos a JSON Schema estrito em [Structured Outputs](https://console.groq.com/docs/structured-outputs), consultado em 17/10/2026. A configuração local original não foi alterada.

## Evidências e integridade

- [Suíte local: 79/79](../reports/test-results-entrega-v1.2.1.tap).
- [Simulação atual: 60/60](../reports/demo-entrega-v1.2.1.md), 20 casos × três repetições.
- [Matriz 20B](../reports/groq-matrix-v1.2.1-20b-entrega-2026-10-17.md), [resumo JSON](../reports/groq-matrix-v1.2.1-20b-entrega-2026-10-17.json) e [saídas completas](../reports/groq-matrix-v1.2.1-20b-entrega-2026-10-17-details.json).
- [Auditoria final](../reports/entrega-evidence.json): resultados recalculados a partir das saídas, somas de tokens conciliadas, 25 arquivos congelados conferidos, 396 artefatos históricos e 13 snapshots de documentação preservados por SHA-256.
- [Inspeção assistida de todas as respostas](../reports/entrega-response-inspection.json). Não equivale a revisão humana independente.

O manifesto identifica hashes do código e dos prompts. Cada saída individual coincide com o checkpoint. Os relatórios antigos não foram reescritos; a documentação anterior está em `reports/baseline-entrega-2026-10-17/`.

## Matriz completa

Uma execução por caso, temperatura 0,1, saída máxima de 4.096 tokens, raciocínio baixo e JSON Schema estrito. As nove métricas automáticas alcançaram 100% nesta amostra. Não houve erro operacional ou HTTP 429 nesta rodada. Foram 51 chamadas, sem correção adicional de resposta.

| Caso | Categoria | Prioridade | Caminho | Resultado | Chamadas | Tokens |
|---|---|---|---|---|---:|---:|
| C01 | acesso | P2 | API | Passou | 4 | 7.208 |
| C02 | cobranca | P3 | API | Passou | 4 | 7.553 |
| C03 | erro_tecnico | P1 | Local | Passou | 0 | 0 |
| C04 | cancelamento | P3 | API | Passou | 4 | 7.121 |
| C05 | duvida | P4 | API | Passou | 4 | 7.097 |
| C06 | seguranca | P1 | Local | Passou | 0 | 0 |
| C07 | outros | P3 | Local | Passou | 0 | 0 |
| C08 | outros | P3 | API | Passou | 1 | 1.734 |
| C09 | outros | P3 | API | Passou | 1 | 1.807 |
| C10 | cobranca | P3 | API | Passou | 4 | 7.413 |
| C11 | acesso | P2 | API | Passou | 4 | 7.505 |
| C12 | erro_tecnico | P2 | API | Passou | 4 | 7.416 |
| C13 | duvida | P4 | API | Passou | 4 | 7.096 |
| C14 | outros | P3 | API | Passou | 1 | 1.771 |
| C15 | cobranca | P3 | API | Passou | 4 | 7.637 |
| C16 | outros | P3 | Local | Passou | 0 | 0 |
| C17 | seguranca | P1 | Local | Passou | 0 | 0 |
| C18 | acesso | P2 | API | Passou | 4 | 7.229 |
| C19 | duvida | P4 | API | Passou | 4 | 7.314 |
| C20 | cancelamento | P3 | API | Passou | 4 | 7.378 |

Os cinco controles locais são C03, C06, C07, C16 e C17. Eles validam o comportamento do sistema sem chamar o modelo. Nos casos C08, C09 e C14, uma chamada de triagem foi seguida de encaminhamento. Os outros 12 passaram pelas quatro etapas de IA.

As pausas de cota somaram 628.1 segundos em 652.8 segundos de duração total. As latências p50/p95 por caso foram 1797/42630 ms; incluem pausas dentro do pipeline, mas não pausas entre casos. Não representam tempo de geração puro.

## Correções e ressalvas

C10 confirmou o ajuste editorial: a consulta em Financeiro > Faturas aparece antes da descrição solicitada para análise. C19 confirmou a separação entre fontes e mensagem: KB-004 aparece em `source_ids`, sem exposição no texto ao cliente. As nove regressões editoriais continuam aprovadas; sete delas falhavam antes da correção.

A inspeção de C05 e C13 verificou a orientação de conferir permissões, sem determinar alteração pelo administrador. C18 preservou a condição de titularidade e não repetiu a senha sintética. C15 não aprovou reembolso nem prometeu prazo, mas ainda admite uma resposta mais direta à pergunta do cliente.

| Caso | Ressalva observada na inspeção assistida |
|---|---|
| C11 | Não repete e-mail ou CPF sintéticos, mas menciona desnecessariamente que esses tipos de dados foram fornecidos. O atendente pode remover essa introdução. |
| C12 | Pergunta pela funcionalidade embora o cliente já cite o painel; omite a alternativa documentada de recarregar após preservar o trabalho. Pode aproveitar o contexto e oferecer esse próximo passo condicional. |
| C14 | Encaminhamento correto pelas regras, mas a mensagem genérica pede funcionalidade afetada para uma pergunta sobre clima. Pode explicar diretamente o escopo do suporte. |
| C15 | Não aprova reembolso nem promete amanhã; condiciona a possibilidade à análise. Pode responder explicitamente que a aprovação e o prazo não podem ser garantidos e lembrar a minimização de dados. |
| C19 | KB-004 permanece somente em source_ids e o administrador é orientado a conferir a permissão. Há repetição do caminho de exportação cuja opção já foi relatada como indisponível; o atendente pode priorizar a conferência de permissão. |
| C20 | Não confirma cancelamento nem efeitos financeiros; orienta aguardar confirmação. Pode explicitar que a solicitação deve ser feita pelo titular, condição presente na base. |

Essas observações não alteraram a pontuação automática nem as respostas arquivadas. São evidência de que a rubrica por padrões não cobre toda a qualidade editorial. No piloto, o atendente deve revisar e adaptar o rascunho antes do uso.

## Comparação de experimentos

| Versão/modelo | Escopo e aprovação registrada | Tokens informados |
|---|---|---:|
| 1.0.0 / 120B | Matriz original: 17/20 | 73.625 |
| 1.1.1 / 120B | Matriz intermediária: 19/20 | 87.680 |
| 1.1.2 / 120B | 20/20 nas regras daquela versão | 87.230 nos resultados concluídos; 121.392 incluindo tentativas |
| 1.2.0 / 120B | Seleção C05/C10/C13/C15/C18/C19: 6/6 | 46.806 |
| 1.2.1 / 120B | C01 e cinco locais concluídos; 14 pendentes | 12.899 em todas as tentativas |
| 1.2.1 / 20B | Matriz independente: 20/20 | 93.279 |

As contagens históricas usam os avaliadores de cada versão. Sob as regras 1.2.1, as 20 respostas 1.1.2 passam em 11/20; as seis respostas 1.2.0 passam em 4/6. Essa reavaliação offline foi preservada no [comparativo anterior](../reports/groq-comparison-v1.2.1-2026-10-17-retomada-2.json). Ela não substitui as notas históricas.

Não se conclui superioridade de um modelo: parte dos experimentos difere em prompts, avaliador e escopo, e não há repetições reais nem conjunto reservado. A troca para 20B resolveu a viabilidade desta avaliação observada, não garante cota futura.

## Consumo total, sem duplicação

A matriz 20B consumiu **93.279 tokens informados** (87.467 de entrada e 5.812 de saída). O ciclo de correções mais a avaliação de entrega soma **393.338**; o histórico completo documentado soma **473.205**.

| Parcela | Tokens |
|---|---:|
| Ciclo de correções antes da matriz 20B | 300.059 |
| Nova matriz 20B | 93.279 |
| Ciclo de correções + avaliação de entrega | 393.338 |
| Matriz original + teste isolado anterior | 79.867 |
| Histórico completo documentado | **473.205** |

Conciliação: **379.926 + 93.279 = 473.205**. O total anterior já inclui tentativas interrompidas e reavaliações; essas parcelas não foram somadas novamente. Respostas sem `usage` não são estimadas. Tokens não foram convertidos em custo monetário.

## Limites e próximos passos

O conjunto é sintético, pequeno e usado durante o desenvolvimento. A revisão por modelo compartilha limitações do gerador; as regras locais têm cobertura parcial. A repetição local é determinística. Nenhuma das aprovações comprova ausência de alucinação, privacidade completa ou consistência em chamadas futuras.

Para o piloto, aprovar uma base empresarial, usar amostra autorizada e reservada, pedir avaliação independente de atendentes e medir tempo de correção. Autenticação, fila persistente, helpdesk, trilha de aprovação e gestão central de segredos fazem parte de uma implantação futura. Não há execução online ativa ou agendada ao final da entrega.

O experimento 120B mantém 14 pendências em seu próprio histórico. Seu plano de retomada é opcional e não foi executado nesta finalização; não é necessário para reproduzir a matriz 20B entregue.
