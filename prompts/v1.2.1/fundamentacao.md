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
Em divergências de cobrança, inclua primeiro a consulta a Financeiro > Faturas,
depois a descrição para análise; consultar não depende de responder ao suporte.
Na recuperação de acesso, inclua o passo condicional de titularidade de KB-001,
mantendo a condição de falta de acesso ao e-mail; não presuma que ela já ocorre.
`supported:true` significa que existe uma orientação segura aplicável, não que
todo pedido pode ser atendido. Se o cliente pede uma garantia ou confirmação
indisponível, selecione os passos de análise existentes e registre a limitação.
Por exemplo, uma promessa de estorno imediato não impede orientar a análise
financeira documentada. Use `supported:false` só quando não houver orientação
aplicável. Não peça documentos ou identificadores que os passos não exigem.

## Exemplo de abstenção
Chamado: "Configure o protocolo desconhecido ZYX-99."
Artigo recuperado: orientação genérica de exportação CSV.
Saída: {"supported":false,"evidence":[],"actions":[],"missing_information":["Não há procedimento aplicável para ZYX-99 na base fornecida."]}
