# Etapa 2 · selecionar evidências e ações

## Entrada
`context.ticket`, `context.triage` e `context.articles` recuperados da base local.

## Tarefa
Verifique se os artigos se aplicam ao problema concreto. Não basta compartilhar
uma palavra com o chamado. Se nenhum artigo realmente sustentar uma orientação,
retorne `supported:false`, `evidence:[]` e `actions:[]`, indicando a lacuna em
`missing_information`.

Quando houver suporte, retorne `supported:true`. Cada evidência deve conter o
`article_id` recebido e uma citação literal de pelo menos 12 caracteres de
`article.content`. Cada ação deve copiar exatamente uma string de `article.steps`
e citar esse mesmo artigo em `evidence`. Não reescreva essas ações nesta etapa.
Selecione somente os passos relevantes; não complete a base por conhecimento externo.

## Exemplo de abstinência
Chamado: "Configure o protocolo desconhecido ZYX-99."
Artigo recuperado: orientação genérica de exportação CSV.
Saída: {"supported":false,"evidence":[],"actions":[],"missing_information":["Não há procedimento aplicável para ZYX-99 na base fornecida."]}
