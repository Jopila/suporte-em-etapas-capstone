# Roteiro de apresentação — cinco minutos

## 0:00–0:45 · Problema e objetivo

“Equipes de suporte precisam classificar chamados e responder de acordo com procedimentos. Este projeto prepara um rascunho para o atendente, com aprovação humana obrigatória. A empresa Nexo Gestão e os dados são fictícios; o problema representa uma necessidade real de suporte.”

Mostre `examples/chamado.json`. Objetivo: criar um sistema de prompts modular, testável e reutilizável.

## 0:45–1:40 · Técnicas e arquitetura

Mostre `prompts/v1.2.1/` e o diagrama em `docs/ARQUITETURA.md`. Explique triagem, fundamentação, resposta e revisão. Mostre um exemplo few-shot e a exigência de citação literal. Destaque JSON Schema, validação local, crítica com uma correção e encaminhamento quando falta evidência.

## 1:40–2:40 · Demonstração

Execute `npm run demo`. Mostre categoria, prioridade, fonte, rascunho, `requires_human_approval:true` e `auto_sent:false`. Explique que a demonstração ao vivo é simulada e não depende de internet.

Depois abra as saídas reais de C10 e C19 em `reports/groq-matrix-v1.2.1-20b-entrega-2026-10-17-cases/`. Identifique o modelo Groq 20B. C10 orienta consultar faturas antes de pedir dados da análise. C19 mantém KB-004 no campo estruturado e o omite do texto. Não abra `.env.local` durante a apresentação.

## 2:40–3:40 · Evidências e aprendizado

“A versão 1.2.1 passou em 79 testes locais, 60 execuções simuladas e 20/20 casos da matriz Groq 20B. Quinze casos usaram API e cinco foram resolvidos por controles locais. Foram 93.279 tokens nessa matriz. O histórico de desenvolvimento inteiro soma 473.205.”

Mostre `docs/ENTREGA_FINAL.md`. Explique uma regressão: C10 não deve tornar a consulta de faturas dependente de responder perguntas. Sete dos nove testes editoriais falhavam antes; os nove passaram depois.

“O 120B esbarrou em cota; fiz uma matriz independente no 20B, preservando todas as tentativas. Não misturei resultados. A inspeção ainda encontrou ajustes de clareza em respostas aprovadas, por isso o atendente continua necessário.”

## 3:40–4:25 · Decisões de engenharia

Compare prompt único e pipeline: o modular faz mais chamadas, mas permite verificar contratos e localizar erros por etapa. Explique versionamento, checkpoint, espera de cota, contabilização de tokens e preservação por hash. Nenhuma mensagem é enviada automaticamente.

## 4:25–5:00 · Limitações e recomendação

“Os casos são sintéticos e foram usados para desenvolver o sistema. A pontuação automática não mede generalização nem qualidade humana independente. A busca usa palavras-chave e o revisor pode repetir erros do gerador. O próximo passo é um piloto com base empresarial aprovada, conjunto reservado e avaliação de atendentes.”

Finalize apontando os quatro entregáveis: biblioteca, documentação, testes e exemplos. O ZIP contém código e evidências; o PDF apresenta a síntese acadêmica.

## Respostas curtas para perguntas do avaliador

- **Por que Groq?** Foi o provedor escolhido para o projeto; o cliente usa HTTP nativo e contratos estruturados.
- **O 20B é melhor que o 120B?** O experimento não demonstra isso; faltam comparação controlada e repetições.
- **Está em produção?** É um protótipo supervisionado. Não integra helpdesk nem envia respostas.
- **20/20 significa sem erros?** Significa aprovação nas regras dessa amostra. As ressalvas editoriais estão documentadas.
- **Como reproduzir sem chave?** `npm test` e `npm run demo`; as saídas reais já estão no pacote.
