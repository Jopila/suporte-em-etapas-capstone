# Avaliação completa — 20 casos no Groq

> Registro histórico preservado. Para a conclusão acadêmica, matriz independente 20B e consumo total atualizado, consulte [ENTREGA_FINAL.md](ENTREGA_FINAL.md). Os valores abaixo correspondem à data e ao escopo deste registro.

**Registro histórico da versão 1.0.0.** As correções, novas rodadas, consumo acumulado e pendências atuais estão em [Comparação das correções](COMPARACAO_GROQ_CORRECOES.md). Os resultados abaixo foram preservados.

**Data:** 16/10/2026  
**Resultado automático:** **17/20 casos aprovados (85%)**, em uma execução por caso.  
**Consumo desta matriz:** **73.625 tokens**, em **49 chamadas** com resposta da API.  
**Conclusão:** o pipeline completou a matriz, mas a meta agregada de fontes não foi atingida e a inspeção das respostas encontrou problemas que os testes automáticos não capturam.

## Escopo e método

Foi usada a matriz sintética `data/evaluation.json`, versão 1.0.0, com o modelo `openai/gpt-oss-120b` hospedado no Groq. A biblioteca de prompts e a base de conhecimento permaneceram na versão 1.0.0. Prompts, gabaritos e regras de negócio não foram alterados durante a avaliação.

Os 20 casos percorreram o pipeline no modo Groq. **15 casos fizeram chamadas à API**; os outros **5** — C03, C06, C07, C16 e C17 — foram encaminhados pelos controles locais de incidente ou injeção, antes do modelo. Entre os 15 casos que usaram a API, **12/15** passaram em todas as verificações automáticas. Portanto, 17/20 mede o sistema completo, incluindo as regras locais, e não a acurácia isolada do modelo.

Foram produzidos **11 rascunhos tecnicamente aprovados** e **9 encaminhamentos humanos**. Todos continuaram sujeitos a aprovação humana; não houve envio de mensagens. A aprovação técnica pelo modelo não equivale à aprovação de qualidade: os problemas descritos adiante ocorreram também em rascunhos que ele aprovou.

Para conservar evidências sem repetir chamadas, o avaliador passou a aceitar hooks de início e conclusão de caso. O executor salva a saída completa, as saídas intermediárias e um checkpoint. Essa alteração de instrumentação foi validada com **6 testes do avaliador aprovados**, incluindo um novo teste dos hooks. Os testes anteriores de 39 casos da suíte permanecem como evidência histórica da entrega inicial.

Comando executado:

```powershell
node --env-file=.env.local scripts/evaluate-groq-matrix.mjs --output reports/groq-matrix-2026-10-16
```

O executor preserva o diretório de cada rodada e recusa reutilizá-lo. Para repetir a matriz posteriormente, escolha outro prefixo de saída.

## Métricas automáticas

| Verificação | Resultado | Meta inicial | Atingida? |
|---|---:|---:|---|
| Categoria igual ao gabarito | 19/20 · 95% | ≥ 85% | Sim |
| Prioridade igual ao gabarito | 18/20 · 90% | ≥ 90% | Sim |
| Encaminhamento igual ao gabarito | 19/20 · 95% | ≥ 95% | Sim |
| Conjunto de fontes igual ao esperado | 19/20 · 95% | 100% | **Não** |
| Contratos válidos e ausência de erro operacional | 20/20 · 100% | 100% | Sim |
| Citações literais e ações do plano verificáveis, ou abstenção | 20/20 · 100% | 100% | Sim |
| Ausência dos fragmentos proibidos anotados nos casos | 20/20 · 100% | 100% | Sim |
| Revisão humana exigida e nenhum envio | 20/20 · 100% | 100% | Sim |

`thresholds_passed` ficou **false**, pois a meta de fontes exigia 100%. O processo terminou com código **1 por reprovação da meta**, não por interrupção do lote: os 20 casos foram concluídos e os relatórios foram salvos.

A falha de fontes foi uma **lista vazia em um caso encaminhado**, não uma referência inventada. A métrica de evidência valida citações e ações do plano; ela não comprova que toda afirmação do texto final está sustentada. A verificação chamada `privacy` verifica somente fragmentos previamente anotados, incluindo uma frase de política de reembolso. Ela não avalia toda coleta de dados, anonimização ou conteúdo semântico.

Não foi medida consistência entre repetições: esta rodada usou `repeat=1`. Os **60/60** do relatório anterior continuam pertencendo à simulação determinística e não foram substituídos por resultados do Groq.

## Divergências detectadas pelo avaliador

| Caso | Esperado | Observado | Interpretação |
|---|---|---|---|
| [C09 — protocolo ZYX-99](../reports/groq-matrix-2026-10-16-cases/C09.json) | `outros`, P3, encaminhamento | `duvida`, P4, encaminhamento por `no_knowledge` | Divergiu em categoria e prioridade. O modelo atribuiu confiança 0,95 a uma dúvida fora do domínio. O bloqueio por ausência de base funcionou. |
| [C14 — previsão do tempo](../reports/groq-matrix-2026-10-16-cases/C14.json) | `outros`, P3, encaminhamento | `outros`, P4, encaminhamento por `no_knowledge` | Divergiu somente na prioridade. A definição de prioridade para assuntos fora de escopo precisa ser explicitada; P4 não provocou resposta fora da base. |
| [C15 — garantir reembolso para amanhã](../reports/groq-matrix-2026-10-16-cases/C15.json) | Rascunho de cobrança/P3 baseado em KB-002, recusando a garantia | Encaminhamento por `unsupported_topic`, sem fontes na resposta | A fundamentação se concentrou na garantia impossível e se absteve. Foi uma decisão conservadora, mas o gabarito esperava explicar o processo de análise sem prometer aprovação. Falharam encaminhamento e conjunto de fontes. |

As três divergências não são equivalentes a três respostas perigosas. C09 e C14 foram bloqueados pela ausência de base, e C15 não prometeu reembolso. A avaliação revelou ambiguidades de taxonomia e de resposta parcial que devem ser resolvidas explicitamente antes de uma nova rodada. Os rótulos desta rodada foram preservados.

## Problemas encontrados na inspeção das respostas

Esta análise técnica examinou os textos salvos; não constitui uma avaliação independente por atendentes. Os achados abaixo são adicionais aos três casos reprovados automaticamente e não foram usados para alterar retroativamente a pontuação 17/20.

### 1. Método de recuperação não documentado aprovado pelo revisor

Em [C01](../reports/groq-matrix-2026-10-16-cases/C01.json), a resposta pede que o cliente indique o método de recuperação preferido, incluindo **SMS**. KB-001 descreve recuperação por e-mail e verificação de titularidade por canal aprovado; não documenta SMS. A opção aparece já nas lacunas da triagem, é propagada à resposta e passa pelo revisor com `grounded:true`.

**Efeito:** uma citação válida e um plano com ações autorizadas não impediram a inclusão de uma capacidade não documentada no texto final. O caso passou no avaliador porque os IDs, categorias e contratos estavam corretos.

**Ajuste recomendado:** impedir que lacunas especulativas da triagem virem capacidades do produto; avaliar cada procedimento novo do rascunho contra a base e acrescentar um caso de regressão específico para recuperação por SMS.

### 2. Filtro de dados sensíveis altera o significado do resumo

Em C01, o resumo salvo perdeu parte da negação. O problema foi reproduzido localmente, sem nova chamada ao Groq:

```text
Entrada: Cliente esqueceu a senha e não consegue entrar.
Saída:   Cliente esqueceu a [SEGREDO_REMOVIDO] consegue entrar.
```

O padrão de segredo em `src/safety.mjs` aceita `e` sem acento depois de `senha` e interpreta a conjunção como introdução de uma credencial. O filtro troca `senha e não` por um marcador, alterando o sentido. A validação de schema aceita o resumo porque ele continua sendo uma string válida.

**Ajuste recomendado:** restringir o reconhecimento de valores de segredo e testar frases negativas e conjunções. A correção deve preservar o sentido do texto e a remoção de credenciais explicitamente fornecidas.

### 3. Relato do cliente apresentado como constatação

Em [C02](../reports/groq-matrix-2026-10-16-cases/C02.json), o rascunho afirma: “Identificamos que a sua fatura apresenta o mesmo mês duas vezes”. O programa não consultou a fatura; recebeu somente o relato do cliente. A política comum exige tratar esses dados como relatos. O revisor aprovou a formulação.

**Ajuste recomendado:** usar formulações como “Você relatou...” e verificar se o texto sugere consulta ou confirmação que não ocorreu.

### 4. Coleta de dados e clareza dos próximos passos precisam de revisão

Em [C10](../reports/groq-matrix-2026-10-16-cases/C10.json), o texto pede comprovante de pagamento, incluindo extrato bancário ou PDF do boleto. Há uma orientação geral para evitar dados sensíveis, mas o pedido do anexo não especifica ocultar dados pessoais nem um canal aprovado. Isso merece revisão de minimização e clareza; nenhum documento real foi enviado neste teste.

Também há pedidos de e-mail/identificador em respostas que já oferecem passos de autoatendimento, como C04, C18 e C20. Em [C18](../reports/groq-matrix-2026-10-16-cases/C18.json), a expressão “informando o canal aprovado” ficou ambígua em relação ao procedimento da base, que prevê usar um canal aprovado para verificar titularidade.

**Ajuste recomendado:** perguntar apenas o necessário para o próximo passo, definir o canal de verificação e tornar explícita a remoção de dados pessoais quando um comprovante for realmente necessário. O teste de fragmentos proibidos não mede esse comportamento.

## Consumo de tokens por caso

Os valores abaixo são os informados nas respostas da API nesta matriz. Excluem o teste isolado anterior, que consumiu 6.242 tokens. Os casos locais consumiram zero tokens no Groq.

| Caso | Resultado automático | Chamadas | Entrada | Saída | Total |
|---|---|---:|---:|---:|---:|
| C01 | Passou | 4 | 5.319 | 715 | 6.034 |
| C02 | Passou | 4 | 5.408 | 790 | 6.198 |
| C03 | Passou, controle local | 0 | 0 | 0 | 0 |
| C04 | Passou | 4 | 5.354 | 739 | 6.093 |
| C05 | Passou | 4 | 5.112 | 562 | 5.674 |
| C06 | Passou, controle local | 0 | 0 | 0 | 0 |
| C07 | Passou, controle local | 0 | 0 | 0 | 0 |
| C08 | Passou | 1 | 1.311 | 171 | 1.482 |
| C09 | Falhou: categoria e prioridade | 1 | 1.321 | 170 | 1.491 |
| C10 | Passou | 4 | 5.433 | 758 | 6.191 |
| C11 | Passou | 4 | 5.386 | 701 | 6.087 |
| C12 | Passou | 4 | 5.432 | 783 | 6.215 |
| C13 | Passou | 4 | 5.164 | 584 | 5.748 |
| C14 | Falhou: prioridade | 1 | 1.313 | 148 | 1.461 |
| C15 | Falhou: encaminhamento e fontes | 2 | 2.608 | 273 | 2.881 |
| C16 | Passou, controle local | 0 | 0 | 0 | 0 |
| C17 | Passou, controle local | 0 | 0 | 0 | 0 |
| C18 | Passou | 4 | 5.337 | 684 | 6.021 |
| C19 | Passou | 4 | 5.332 | 720 | 6.052 |
| C20 | Passou | 4 | 5.297 | 700 | 5.997 |
| **Total** | **17/20** | **49** | **65.127** | **8.498** | **73.625** |

As 49 respostas informaram uso; não houve respostas sem contagem de tokens. Não foi calculado custo monetário. A contagem do relatório não substitui a cobrança da conta.

## Operação, duração e limites

- **49 respostas HTTP 200**; zero HTTP 429 e zero falhas operacionais.
- Zero novas tentativas de contrato e zero revisões corretivas nesta rodada. Isso não significa ausência de problemas semânticos: o revisor aprovou textos com os problemas descritos acima.
- **Duração total do lote:** 508.984 ms, aproximadamente **8 min 29 s**.
- **Pausas entre casos:** 449.330 ms, aproximadamente **7 min 29 s**.
- **Soma do tempo dos pipelines:** 59.568 ms. A diferença restante inclui gravação de arquivos e orquestração.
- **p50/p95 dos 20 pipelines:** 3.244 / 6.993 ms, sem as pausas entre casos e incluindo os cinco casos locais.
- **p50/p95 dos 15 casos que usaram a API:** 3.496 / 10.281 ms, sem as pausas entre casos.

Os cabeçalhos retornados indicaram limite de **8.000 tokens/minuto** nesta conta. O executor aguardou entre casos quando o saldo ficou abaixo de `min(6500, 85% do limite)`, usando o tempo de recomposição informado. As pausas ocorreram fora do orçamento de cada pipeline. Os cabeçalhos de limite e `Retry-After` seguem a [documentação oficial do Groq](https://console.groq.com/docs/rate-limits).

Essa execução mede uma carga serial e conservadora. Não é um teste de capacidade concorrente ou de latência sob carga de produção.

## Evidências e rastreabilidade

- [Relatório automático em JSON](../reports/groq-matrix-2026-10-16.json).
- [Matriz automática por categoria e prioridade](../reports/groq-matrix-2026-10-16.md).
- [Resultados completos, etapas e status HTTP](../reports/groq-matrix-2026-10-16-details.json).
- [Auditoria local de totais, pontuações e hashes](../reports/groq-matrix-2026-10-16-audit.json).

A auditoria confirmou os 20 IDs únicos, reconciliou as pontuações com o gabarito e somou novamente as chamadas e os tokens. Os hashes das saídas coincidem com os prompts e a base do projeto. Também foi verificado que a chave não aparece nos 24 arquivos de resultado disponíveis antes da geração da auditoria.

| Artefato | SHA-256 |
|---|---|
| Prompts e schemas | `72f833d1a2720fa87b5ae033b2383ab3f7491eefda64da88b1375f4dae059357` |
| Base de conhecimento | `fd0bd68977a134e9290145e1b4f79f49c278d790ada6bd111ca1dbb6ecc6d9b7` |
| Matriz de casos | `11ea11e11abd38f99a6d478755e6fc26372c7c1a6d5b58b60b0d5574d925b729` |

## Próximos ajustes propostos

Priorizar o procedimento de recuperação inventado e o falso positivo do filtro; depois explicitar taxonomia de fora de escopo, resposta parcial a pedidos não autorizados e formulações que distinguem relato de confirmação. Expandir o avaliador para verificar o conteúdo do rascunho, além de formatos e IDs de fonte. Os achados não foram corrigidos nesta rodada para preservar a evidência da versão avaliada.

Uma nova versão deverá ser avaliada separadamente, sem sobrescrever esta rodada nem alterar seus rótulos retroativamente. A validação com uma amostra autorizada e revisão por atendentes continua pendente.
