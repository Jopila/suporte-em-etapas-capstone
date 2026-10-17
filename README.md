# Suporte em Etapas

**Capstone do Módulo 2 · biblioteca de prompts para triagem e elaboração de respostas de suporte · integração com Groq.**

[![Validação do capstone](https://github.com/Jopila/suporte-em-etapas-capstone/actions/workflows/validacao.yml/badge.svg)](https://github.com/Jopila/suporte-em-etapas-capstone/actions/workflows/validacao.yml)

**Para avaliar a entrega:** abra o [relatório PDF](Relatorio_Capstone.pdf), consulte os [resultados finais](docs/ENTREGA_FINAL.md) e siga o [guia de execução](LEIA-ME-ENTREGA.md). O código e as evidências acompanham o relatório neste repositório.

Os testes automáticos do GitHub executam a suíte local, a demonstração, os 20 casos simulados em três repetições e a auditoria das evidências. Não usam chave nem fazem chamadas ao Groq. As saídas reais da API, já executadas, estão em `reports/`.

O sistema recebe um chamado, identifica categoria e prioridade, consulta uma base de conhecimento, prepara uma resposta e revisa sua qualidade. O resultado é um rascunho para o atendente aprovar. Casos críticos, dúvidas sem evidência e falhas técnicas são encaminhados para análise humana.

O contexto é um SaaS B2B fictício chamado **Nexo Gestão**. O problema de negócio é comum a equipes reais de suporte, mas a empresa, os procedimentos e os chamados deste projeto são sintéticos. Não há integração com uma caixa de atendimento nem envio de mensagens.

O link para entrega é **[github.com/Jopila/suporte-em-etapas-capstone](https://github.com/Jopila/suporte-em-etapas-capstone)**.

## Comece aqui

Requisito: **Node.js 24 ou superior**, com npm. Não há dependências externas nem necessidade de `npm install`. O projeto foi executado com Node.js 24.18.0 no Windows.

No terminal, dentro desta pasta:

```powershell
npm run demo
npm test
node src/cli.mjs evaluate --provider demo --repeat 3 --output reports/minha-avaliacao-local
```

- `demo`: processa o exemplo com um simulador local, sem rede ou chave.
- `test`: executa testes de contratos, pipeline, privacidade, falhas e cliente HTTP simulado.
- `evaluate`: avalia 20 cenários sintéticos e salva JSON/Markdown no prefixo informado.

**O simulador não é um LLM e não executa semanticamente os prompts.** Ele exercita a engenharia. Passar nos testes locais não comprova qualidade do modelo nem prontidão para produção.

## Usar o Groq

1. Obtenha uma chave em [GroqCloud — API Keys](https://console.groq.com/keys).
2. Copie `.env.example` para `.env.local` e preencha `GROQ_API_KEY` no editor local. Não envie a chave pelo chat nem a inclua no controle de versão. Se `.env.local` já existir, edite-o sem sobrescrever suas configurações.
3. Execute um chamado sintético:

```powershell
npm start -- run --provider groq --input examples/chamado.json
```

O modelo padrão é `openai/gpt-oss-120b`, hospedado **no Groq**, com `json_schema` estrito. O prefixo do modelo não significa uma chamada à API da OpenAI. Todas as requisições vão para `https://api.groq.com/openai/v1/chat/completions` e usam somente a chave Groq. O modelo consta na [lista oficial de modelos](https://console.groq.com/docs/models), e seu suporte ao schema está descrito em [Structured Outputs](https://console.groq.com/docs/structured-outputs), consultados em 16/10/2026.

Para começar uma avaliação real com apenas um caso:

```powershell
npm start -- evaluate --provider groq --limit 1 --output reports/groq-smoke
```

Para a matriz completa, após verificar o consumo e os limites da sua conta:

```powershell
node --env-file=.env.local scripts/evaluate-groq-matrix.mjs --output reports/groq-matrix-nova-rodada
```

Esse executor faz uma passagem pelos 20 casos, salva as saídas completas e pausa entre casos ou antes de etapas conforme os limites informados. Escolha um prefixo novo para cada rodada. Para experimentos de repetição sem esse executor, `npm run evaluate:groq -- --repeat 3` continua disponível, mas não inclui o espaçamento adaptativo nem os arquivos completos por caso.

Chamadas reais podem consumir créditos e limites do Groq. O caminho normal faz quatro chamadas por chamado processável; uma revisão pode elevar esse total para seis, além de tentativas por erro. Sem chave, o modo Groq encerra com `missing_groq_key`; não troca para simulação.

**Entrega final em 17/10/2026:** **20/20 casos aprovados na matriz independente Groq 20B**, com 15 casos que usaram API e cinco controles locais. A versão 1.2.1 passou novamente em **79 testes locais** e **60/60 execuções simuladas**.

A matriz 20B consumiu **93.279 tokens informados** (87.467 de entrada e 5.812 de saída). O ciclo de correções mais a avaliação de entrega soma **393.338**; o histórico completo documentado soma **473.205**.

C10 e C19 foram confirmados online no 20B. A matriz 120B anterior permanece parcial e preservada, com seis concluídos e 14 pendentes. Os resultados dos modelos não foram combinados. Consulte [resultados, ressalvas e comparação](docs/ENTREGA_FINAL.md). Não há execução ativa nem agendada.

Para repetir a matriz de entrega, configure sua chave e use um prefixo novo:

```powershell
node scripts/evaluate-groq-20b.mjs --output reports/minha-matriz-20b
```

## Entrada e saída

Entrada mínima, sempre com um ID técnico sem dados pessoais:

```json
{
  "id": "CHAMADO-001",
  "subject": "Cobrança duplicada na fatura",
  "message": "Encontrei duas cobranças referentes ao mesmo mês. Como solicito análise?"
}
```

Somente esses três campos são aceitos. Assunto: até 200 caracteres. Mensagem: até 8.000. O arquivo JSON deve ter até 64 KB.

Na saída, observe:

| Campo | Significado |
|---|---|
| `triage` | Resumo, categoria, prioridade, fatos e lacunas |
| `grounding` | Citações literais e ações verificadas contra a base |
| `response` | Rascunho validado ou mensagem conservadora para encaminhamento |
| `source_ids` | Artigos usados no rascunho liberado |
| `status` | `rascunho_validado` ou `encaminhamento_humano` |
| `technical_review` | Avaliação automática; não é aprovação humana |
| `requires_human_approval` | Sempre `true` |
| `auto_sent` | Sempre `false` |
| `operational_error` | Diferencia falha técnica de encaminhamento previsto |
| `trace`, `metrics` | Etapas, tentativas, duração e tokens informados |
| `prompt_hash`, `knowledge_hash` | Identificadores do conteúdo usado na execução |

Exemplo completo já executado: [examples/resultado-demo-v1.2.1.json](examples/resultado-demo-v1.2.1.json).

Para salvar outra saída:

```powershell
npm start -- run --provider demo --input examples/chamado.json --output reports/private/resultado.json
```

## Organização da entrega

```text
prompts/v1.2.1/           Política comum e quatro prompts ativos
prompts/v1.2.0/           Versão da reavaliação seletiva anterior, preservada
prompts/v1.1.1/           Prompts da matriz 1.1.2, preservados
prompts/v1.0.0/           Versão da primeira matriz, preservada
prompts/v1.1.0/           Versão intermediária, com rodada parcial preservada
src/contracts.mjs        Contratos de entrada e saídas estruturadas
src/prompts.mjs          Composição e hash da biblioteca
src/knowledge.mjs        Recuperação local e validação de evidências
src/safety.mjs           Remoção de padrões sensíveis e verificações locais
src/providers/           Cliente Groq e simulador independente
src/pipeline.mjs         Orquestração, revisão e encaminhamento
src/evaluation.mjs       Avaliação e relatórios
src/cli.mjs              Interface de linha de comando
scripts/                 Matriz, retomada seletiva, comparação e auditoria offline
data/                    Base de conhecimento e 20 casos sintéticos
tests/                   Testes automáticos sem chamadas externas
examples/                Entrada e saída de demonstração
docs/                    Relatório acadêmico e guias
reports/                 Evidências reproduzíveis de execução
```

## Documentos para apresentar o capstone

- [Relatório do projeto e critérios de aceitação](docs/CAPSTONE.md).
- [Arquitetura e decisões de engenharia](docs/ARQUITETURA.md).
- [Biblioteca de prompts e técnicas aplicadas](docs/PROMPTS.md).
- [Estratégia de testes, métricas e limitações](docs/TESTES.md).
- [Configuração, operação e preparação de um piloto](docs/OPERACAO.md).
- [Roteiro de apresentação de 5 minutos](docs/APRESENTACAO.md).
- [Relatório da avaliação local](reports/demo-entrega-v1.2.1.md).
- [Teste real do pipeline com Groq](docs/TESTE_REAL_GROQ.md).
- [Matriz de 20 casos no Groq: resultados, falhas e tokens](docs/AVALIACAO_GROQ_20_CASOS.md).
- [Correções, regressões e comparação das rodadas](docs/COMPARACAO_GROQ_CORRECOES.md).
- [Correções semânticas 1.2.0, seis casos reavaliados e consumo atualizado](docs/CORRECOES_SEMANTICAS_GROQ.md).
- [Ajustes editoriais 1.2.1 e tentativa inicial](docs/CORRECOES_EDITORIAIS_GROQ.md).
- [Retomada 1.2.1: C01 concluído, pendências e consumo atualizado](docs/RETOMADA_GROQ_V1_2_1.md).

## Limites conhecidos

A recuperação usa palavras-chave, não embeddings. A remoção de dados usa padrões e não é anonimização completa. A detecção de injeção é parcial. O revisor usa o mesmo modelo e pode repetir erros do gerador. A confiança autodeclarada não é calibrada. Todos esses limites estão refletidos no encaminhamento conservador e na exigência de revisão humana.

O protótipo tem componentes reutilizáveis para um piloto supervisionado. A matriz 1.2.1 foi concluída no 20B. A aprovação automática nesta amostra não mede consistência entre repetições nem prontidão para produção. Antes do uso empresarial, valide políticas, base, decisões e qualidade com atendentes e amostra reservada; implemente autenticação, fila, observabilidade e gestão de segredos.
