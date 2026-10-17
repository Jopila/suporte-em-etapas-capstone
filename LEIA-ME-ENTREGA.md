# Entrega do capstone — Suporte em Etapas

**Engenharia de IA · Módulo 2 · versão 1.2.1 · 17/10/2026.**

**Entrega pelo GitHub:** [Jopila/suporte-em-etapas-capstone](https://github.com/Jopila/suporte-em-etapas-capstone). O [relatório PDF](Relatorio_Capstone.pdf), o código e as evidências estão no mesmo repositório.

Sistema de prompts para triagem e elaboração de respostas de suporte. A empresa Nexo Gestão, a base de conhecimento e os 20 chamados são sintéticos. O protótipo trata um problema operacional real, com aprovação humana obrigatória.

## Ordem de leitura

1. [Relatório acadêmico editável](docs/CAPSTONE.md): problema, técnicas, arquitetura e critérios de aceitação.
2. [Resultados finais e consumo](docs/ENTREGA_FINAL.md): matriz 20B, ressalvas, comparação histórica e limites.
3. [Biblioteca de prompts](docs/PROMPTS.md) e [arquitetura](docs/ARQUITETURA.md).
4. [Testes e avaliação](docs/TESTES.md) e [operação](docs/OPERACAO.md).
5. [Apresentação de cinco minutos](docs/APRESENTACAO.md).

O relatório para leitura está em `Relatorio_Capstone.pdf`, tanto no repositório quanto no ZIP de apoio. Os arquivos-fonte e as evidências acompanham o PDF.

## Verificar em poucos minutos

Requisito: **Node.js 24+**, com npm. Não é necessário instalar dependências npm. Depois de extrair o ZIP e abrir a pasta no terminal:

```powershell
npm test
npm run demo
node src/cli.mjs evaluate --provider demo --repeat 3 --output reports/minha-avaliacao-local
node scripts/audit-capstone-delivery.mjs
```

Esses comandos não precisam de chave nem de acesso à internet. A avaliação local é uma simulação determinística, não uma chamada ao modelo. Use um prefixo novo para preservar relatórios existentes.

## Resultado verificado

**20/20 casos aprovados na matriz independente Groq 20B**, com 15 casos que usaram API e cinco controles locais. A versão 1.2.1 passou novamente em **79 testes locais** e **60/60 execuções simuladas**.

A matriz 20B consumiu **93.279 tokens informados** (87.467 de entrada e 5.812 de saída). O ciclo de correções mais a avaliação de entrega soma **393.338**; o histórico completo documentado soma **473.205**.

A pontuação automática não é avaliação humana independente. A inspeção assistida registrou ressalvas editoriais em [ENTREGA_FINAL.md](docs/ENTREGA_FINAL.md). As respostas continuam exigindo aprovação do atendente.

O experimento 120B anterior permanece preservado com seis casos concluídos e 14 pendentes por cota. A matriz 20B foi executada integralmente como outro experimento; nenhum resultado de modelos diferentes foi mesclado.

## Repetição opcional com IA real

Crie `.env.local` a partir de `.env.example`, configure sua própria chave Groq e consulte [OPERACAO.md](docs/OPERACAO.md). Depois execute:

```powershell
node scripts/evaluate-groq-20b.mjs --output reports/minha-matriz-20b
```

Esse comando usa o perfil 20B sem alterar o arquivo de configuração. Repetir a matriz consome cota e pode ter resultados diferentes. As saídas reais já estão incluídas; não é necessário fazer novas chamadas para avaliar a entrega. A credencial do autor não está no pacote.

## Conteúdo entregue

| Entregável | Localização |
|---|---|
| Biblioteca modular | `prompts/v1.2.1/` e versões históricas |
| Pipeline executável | `src/` |
| Base e 20 casos rotulados | `data/` |
| Testes e regressões | `tests/` |
| Exemplos | `examples/chamado.json`, `examples/resultado-demo-v1.2.1.json` |
| Documentação e apresentação | `docs/` |
| Matriz real, tentativas e histórico | `reports/` |
| Conferência das evidências do repositório | `node scripts/audit-capstone-delivery.mjs` |
| Conferência de integridade do ZIP de apoio | `MANIFESTO_ARQUIVOS.json`, dentro do ZIP |

A geração do PDF é opcional e usa Python com ReportLab, pypdf e fontes Arial do Windows. Esses componentes não são necessários para executar o pipeline ou seus testes. O PDF pronto já acompanha a entrega.
