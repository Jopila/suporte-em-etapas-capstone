# Relatório do capstone — Suporte em Etapas

**Módulo:** Engenharia de IA — Módulo 2  
**Atualizado em:** 17/10/2026  
**Provedor escolhido:** Groq  
**Escopo:** análise, prototipação, testes e recomendação para piloto supervisionado.

## 1. Problema e contexto

Equipes de suporte recebem solicitações com descrições incompletas, diferentes níveis de urgência e dúvidas recorrentes. A triagem manual pode aplicar critérios inconsistentes; a resposta depende da consulta a procedimentos e da experiência do atendente. Um erro de atendimento pode prometer uma condição inexistente, pedir dados sensíveis ou atrasar um incidente relevante.

O projeto aplica técnicas de engenharia de prompts a esse problema. Como não foram fornecidos dados nem políticas de uma empresa específica, o protótipo usa a empresa fictícia Nexo Gestão, um SaaS de gestão empresarial. Os procedimentos dos cinco artigos foram criados para o exercício. Eles não devem ser apresentados como políticas de um produto existente.

**Usuário do sistema:** atendente de primeiro nível.  
**Entrada:** assunto e descrição de um chamado.  
**Entrega de valor:** classificação, prioridade, referências e um rascunho revisável.  
**Decisão humana preservada:** aprovação do atendimento e execução de qualquer ação sobre a conta.

## 2. Objetivo e hipóteses

Construir um sistema de prompts modular, testável e reutilizável que padronize a análise de chamados e a elaboração de respostas fundamentadas.

Hipóteses a validar no piloto:

1. Separar triagem, fundamentação, redação e revisão facilita identificar onde ocorre um erro.
2. Exigir evidências da base reduz recomendações sem sustentação.
3. Uma rubrica de revisão explícita reduz respostas que violam políticas.
4. A assistência pode reduzir o tempo de preparação do atendimento, mantendo a qualidade.

Não foram medidos ganhos de produtividade, redução de custos ou qualidade geral do modelo. **20/20 casos aprovados na matriz independente Groq 20B**, com 15 casos que usaram API e cinco controles locais. A versão 1.2.1 passou novamente em **79 testes locais** e **60/60 execuções simuladas**. Os ajustes de C10 e C19 foram confirmados nas saídas reais. A inspeção assistida também registra ressalvas de clareza e completude, descritas em [ENTREGA_FINAL.md](ENTREGA_FINAL.md). A validação das hipóteses exige o piloto descrito em [TESTES.md](TESTES.md).

## 3. Escopo funcional

| Incluído | Resultado |
|---|---|
| Classificação | Acesso, cobrança, erro técnico, dúvida, cancelamento, segurança e outros |
| Priorização | P1 a P4, com critérios definidos no prompt |
| Extração | Resumo, fatos relatados e informações ausentes |
| Recuperação | Até três artigos de uma base local versionada |
| Fundamentação | Citação literal e ação presente na base |
| Redação | Português claro, sem compromissos operacionais inventados |
| Revisão | Fundamentação, segurança e completude; uma revisão corretiva |
| Contingência | Encaminhamento humano em risco, falta de base, baixa confiança ou falha |
| Avaliação | Casos rotulados, métricas, repetição e relatório JSON/Markdown |

Não há envio de e-mail, integração com helpdesk, alteração de conta, busca na internet, execução de ferramentas pelo modelo ou aprovação automática de reembolso.

## 4. Alternativas consideradas

| Alternativa | Vantagens | Limitações | Decisão |
|---|---|---|---|
| Atendimento inteiramente manual | Controle direto; dispensa API | Depende de consulta e padronização pela equipe | Referência de processo para o futuro piloto |
| Um prompt para classificar e responder | Menos chamadas e implementação simples | Dificulta localizar erros e verificar evidências separadamente | Comparação sugerida para experimento posterior |
| Pipeline modular com base e revisão | Contratos por etapa, rastreabilidade e reaproveitamento | Mais chamadas, latência e complexidade; revisor pode falhar | Implementado |
| Regras determinísticas completas | Previsibilidade e baixo custo | Cobertura limitada da linguagem natural | Usadas em controles e no simulador, não como substituição declarada do LLM |

O Groq foi escolhido pelo usuário. O projeto utiliza HTTP nativo do Node para reduzir dependências. O modelo padrão aceita [Structured Outputs no Groq](https://console.groq.com/docs/structured-outputs). Seu uso real permanece condicionado à disponibilidade na conta e à avaliação de qualidade; não foi afirmada superioridade em relação a outros modelos.

## 5. Técnicas de engenharia de prompts

| Técnica | Aplicação concreta | Evidência |
|---|---|---|
| Papel, tarefa e restrições explícitas | Política comum separada das etapas | `prompts/v1.2.1/system.md`; versões anteriores preservadas |
| Few-shot | Exemplos rotulados de categorias, urgência e ambiguidade | `triagem.md` |
| Decomposição e prompt chaining | Saída validada alimenta a etapa seguinte | `src/pipeline.mjs` |
| Grounding com recuperação | Artigos são recuperados; evidências e ações são verificadas | `fundamentacao.md`, `src/knowledge.mjs` |
| Saídas estruturadas | Contratos JSON por etapa e validação local | `src/contracts.mjs` |
| Crítica e refinamento | Revisor aplica rubrica; gerador recebe feedback uma vez | `revisao.md`, `resposta.md` |
| Abstinência | Não produzir orientação específica sem base suficiente | Encaminhamentos testados no pipeline |
| Separação entre instruções e dados | Conteúdo do chamado fica em JSON na mensagem de usuário | `src/prompts.mjs` |

O sistema pede decisões e evidências verificáveis, sem solicitar a exposição de raciocínio interno. O processo de revisão é uma segunda etapa de modelo, não um agente independente com garantia de veracidade.

## 6. Critérios de aceitação e evidências

| Critério da atividade | Evidência entregue | Alcance da verificação |
|---|---|---|
| Técnica: estrutura clara | Política comum, entradas, regras, exemplos e contratos | Biblioteca inspecionável e composição testada |
| Técnica: uso correto das técnicas | Mapeamento anterior e guias de reutilização | Implementação presente; benefício empírico do prompting ainda pendente |
| Engenharia: modularidade | Prompts, provedor, base, validação e orquestração separados | Testes exercitam componentes e falhas isoladas |
| Engenharia: organização | README, comandos npm, exemplos, documentação e relatório | Execução local reproduzível |
| Qualidade: outputs consistentes | Schemas, limites, critérios de revisão e testes | Matriz independente 1.2.1/20B: 20/20; 15 casos com API e cinco controles locais. Históricos preservados. Uma execução por caso não mede consistência entre repetições |
| Qualidade: testes funcionando | Suíte automatizada e avaliação local de 20 cenários | 79 testes aprovados, incluindo nove regressões editoriais sobre os 70 anteriores; integração HTTP testada com respostas controladas |
| Aplicação: problema real | Apoio ao trabalho de triagem e redação de suporte | Problema operacional plausível, com validação organizacional ainda pendente |

## 7. Resultado e recomendação

**20/20 casos aprovados na matriz independente Groq 20B**, com 15 casos que usaram API e cinco controles locais. A versão 1.2.1 passou novamente em **79 testes locais** e **60/60 execuções simuladas**.

A matriz 20B consumiu **93.279 tokens informados** (87.467 de entrada e 5.812 de saída). O ciclo de correções mais a avaliação de entrega soma **393.338**; o histórico completo documentado soma **473.205**.

A confirmação de execução encontra-se em [ENTREGA_FINAL.md](ENTREGA_FINAL.md), com tabela por caso, comparação, ressalvas e fontes das evidências. A [simulação atual](../reports/demo-entrega-v1.2.1.md) e a [auditoria](../reports/entrega-evidence.json) identificam versão e hashes. A matriz 20B e o experimento parcial 120B permanecem separados.

As falhas históricas motivaram controles e testes de regressão para negação, exposição de credenciais, canais inventados, afirmações de consulta não realizada, pedido desnecessário de dados, condições financeiras, titularidade, ordem de instruções e exposição de códigos internos. Os relatos originais das falhas estão preservados em [COMPARACAO_GROQ_CORRECOES.md](COMPARACAO_GROQ_CORRECOES.md), [CORRECOES_SEMANTICAS_GROQ.md](CORRECOES_SEMANTICAS_GROQ.md) e [CORRECOES_EDITORIAIS_GROQ.md](CORRECOES_EDITORIAIS_GROQ.md).

O protótipo atende ao escopo acadêmico de análise, experimentação e recomendação. Os critérios de modularidade, organização, testes e aplicação são sustentados pelos artefatos. A consistência demonstrada é estrutural e restrita aos casos avaliados; generalização, ganho operacional e benefício causal das técnicas ainda exigem estudo independente.

Recomenda-se um piloto supervisionado após aprovação de base empresarial e avaliação com atendentes. O assistente prepara rascunhos; o profissional aprova mensagens e executa ações. O envio autônomo não integra a proposta.

## 8. Reprodução e entregáveis

Veja [LEIA-ME-ENTREGA.md](../LEIA-ME-ENTREGA.md) para executar localmente sem credencial. A biblioteca está em `prompts/v1.2.1/`, a implementação em `src/`, as regressões em `tests/`, os dados em `data/` e as evidências em `reports/`. O pacote inclui um relatório PDF e [roteiro de apresentação](APRESENTACAO.md).

O Groq foi escolhido pelo usuário. A avaliação final utiliza `openai/gpt-oss-20b`, documentado com suporte a [saída estruturada estrita](https://console.groq.com/docs/structured-outputs), consulta em 17/10/2026. A política de espera segue os cabeçalhos descritos em [Rate Limits](https://console.groq.com/docs/rate-limits). Disponibilidade de modelo e cota deve ser conferida antes de uma nova execução.
