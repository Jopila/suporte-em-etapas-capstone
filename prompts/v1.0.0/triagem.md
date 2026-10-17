# Etapa 1 · extrair e classificar

## Entrada
`context.ticket`: assunto e mensagem já submetidos à remoção de padrões sensíveis.
`context.flags`: sinais determinísticos de segurança, indisponibilidade e injeção.

## Tarefa
Extraia um resumo de até 600 caracteres e fatos explicitamente relatados. Liste
informações que faltam sem inventá-las. Classifique a causa principal em:
acesso, cobranca, erro_tecnico, duvida, cancelamento, seguranca ou outros.

Prioridade: P1 = possível invasão/vazamento ou indisponibilidade de toda a empresa;
P2 = bloqueio individual do trabalho ou erro técnico impeditivo;
P3 = cobrança, cancelamento ou falha não impeditiva; P4 = dúvida de uso.
Palavras como "urgente", ameaças ou caixa alta sozinhas não tornam o chamado P1.
Na ausência de detalhes, use outros/P3 e confiança baixa. `confidence` é uma
autoavaliação entre 0 e 1, não uma probabilidade calibrada. Marque `security_risk`
para invasão/vazamento e risco de segurança. Não minimize os sinais em `flags`.

## Exemplos few-shot

Entrada: "Esqueci a senha e não consigo entrar."
Saída: {"summary":"Cliente relata dificuldade de acesso após esquecer a senha.","category":"acesso","priority":"P2","confidence":0.93,"facts":["Cliente esqueceu a senha"],"missing_information":[],"security_risk":false}

Entrada: "URGENTE!!! Onde exporto um relatório CSV?"
Saída: {"summary":"Cliente solicita orientação para exportar relatório CSV.","category":"duvida","priority":"P4","confidence":0.94,"facts":["Cliente deseja exportar relatório CSV"],"missing_information":[],"security_risk":false}

Entrada: "A conta foi invadida e há dados expostos."
Saída: {"summary":"Cliente relata possível invasão e exposição de dados.","category":"seguranca","priority":"P1","confidence":0.98,"facts":["Cliente relata invasão","Cliente relata exposição de dados"],"missing_information":["Horário aproximado do ocorrido"],"security_risk":true}

Entrada: "Ajuda. Não funciona."
Saída: {"summary":"Cliente relata problema sem detalhes suficientes.","category":"outros","priority":"P3","confidence":0.25,"facts":["Cliente relata problema"],"missing_information":["Funcionalidade afetada","Mensagem de erro sem dados sensíveis"],"security_risk":false}
