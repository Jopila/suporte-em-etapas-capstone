"""Atualiza os documentos de entrega usando somente evidências auditadas."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
E = json.loads((ROOT / 'reports/entrega-evidence.json').read_text(encoding='utf-8'))
I = json.loads((ROOT / 'reports/entrega-response-inspection.json').read_text(encoding='utf-8'))
M, U = E['matrix'], E['consumption']
P = 'groq-matrix-v1.2.1-20b-entrega-2026-10-17'
def n(x): return f'{x:,}'.replace(',', '.')
def write(path, text): (ROOT / path).write_text(text.strip() + '\n', encoding='utf-8')
def old(path): return (ROOT / 'reports/baseline-entrega-2026-10-17' / (path + '.snapshot')).read_text(encoding='utf-8')
summary = f"**{M['passed']}/20 casos aprovados na matriz independente Groq 20B**, com 15 casos que usaram API e cinco controles locais. A versão 1.2.1 passou novamente em **79 testes locais** e **60/60 execuções simuladas**."
tokens = f"A matriz 20B consumiu **{n(U['new_tokens'])} tokens informados** ({n(M['usage']['prompt_tokens'])} de entrada e {n(M['usage']['completion_tokens'])} de saída). O ciclo de correções mais a avaliação de entrega soma **{n(U['cycle_total'])}**; o histórico completo documentado soma **{n(U['historical_total'])}**."
matrix_table = '\n'.join(f"| {r['id']} | {r['category']} | {r['priority']} | {'API' if r['requests'] else 'Local'} | {'Passou' if r['passed'] else 'Falhou'} | {r['requests']} | {n(r['tokens'])} |" for r in E['cases'])
observations = '\n'.join(f"| {r['id']} | {r['note']} |" for r in I['cases'] if r['caveat'])

write('LEIA-ME-ENTREGA.md', f"""
# Entrega do capstone — Suporte em Etapas

**Engenharia de IA · Módulo 2 · versão 1.2.1 · 17/10/2026.**

Sistema de prompts para triagem e elaboração de respostas de suporte. A empresa Nexo Gestão, a base de conhecimento e os 20 chamados são sintéticos. O protótipo trata um problema operacional real, com aprovação humana obrigatória.

## Ordem de leitura

1. [Relatório acadêmico editável](docs/CAPSTONE.md): problema, técnicas, arquitetura e critérios de aceitação.
2. [Resultados finais e consumo](docs/ENTREGA_FINAL.md): matriz 20B, ressalvas, comparação histórica e limites.
3. [Biblioteca de prompts](docs/PROMPTS.md) e [arquitetura](docs/ARQUITETURA.md).
4. [Testes e avaliação](docs/TESTES.md) e [operação](docs/OPERACAO.md).
5. [Apresentação de cinco minutos](docs/APRESENTACAO.md).

No ZIP, o relatório para leitura está em `Relatorio_Capstone.pdf`. Os arquivos-fonte e as evidências acompanham o PDF.

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

{summary}

{tokens}

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
| Conferência de integridade do pacote | `MANIFESTO_ARQUIVOS.json`, dentro do ZIP |

A geração do PDF é opcional e usa Python com ReportLab, pypdf e fontes Arial do Windows. Esses componentes não são necessários para executar o pipeline ou seus testes. O PDF pronto já acompanha a entrega.
""")

write('docs/ENTREGA_FINAL.md', f"""
# Resultados finais da entrega

**Data:** 17/10/2026 · **pipeline/prompts/avaliador:** 1.2.1 · **provedor:** Groq · **modelo da matriz de entrega:** `openai/gpt-oss-20b`.

## Conclusão

{summary}

O capstone está organizado para entrega acadêmica: biblioteca, pipeline, documentação, testes, exemplos e evidências de execução. A matriz atual está completa no perfil 20B. O protótipo não foi implantado em produção, e o envio de respostas permanece dependente do atendente.

O 120B sofreu bloqueios recorrentes de cota. Foi executado um experimento independente no 20B, mantendo código, prompts, base, gabarito e rubrica 1.2.1. O Groq documenta suporte de ambos a JSON Schema estrito em [Structured Outputs](https://console.groq.com/docs/structured-outputs), consultado em 17/10/2026. A configuração local original não foi alterada.

## Evidências e integridade

- [Suíte local: 79/79](../reports/test-results-entrega-v1.2.1.tap).
- [Simulação atual: 60/60](../reports/demo-entrega-v1.2.1.md), 20 casos × três repetições.
- [Matriz 20B](../reports/{P}.md), [resumo JSON](../reports/{P}.json) e [saídas completas](../reports/{P}-details.json).
- [Auditoria final](../reports/entrega-evidence.json): resultados recalculados a partir das saídas, somas de tokens conciliadas, 25 arquivos congelados conferidos, 396 artefatos históricos e 13 snapshots de documentação preservados por SHA-256.
- [Inspeção assistida de todas as respostas](../reports/entrega-response-inspection.json). Não equivale a revisão humana independente.

O manifesto identifica hashes do código e dos prompts. Cada saída individual coincide com o checkpoint. Os relatórios antigos não foram reescritos; a documentação anterior está em `reports/baseline-entrega-2026-10-17/`.

## Matriz completa

Uma execução por caso, temperatura 0,1, saída máxima de 4.096 tokens, raciocínio baixo e JSON Schema estrito. As nove métricas automáticas alcançaram {min(M['rates'].values())*100:.0f}% nesta amostra. Não houve erro operacional ou HTTP 429 nesta rodada. Foram {M['usage']['requests']} chamadas, sem correção adicional de resposta.

| Caso | Categoria | Prioridade | Caminho | Resultado | Chamadas | Tokens |
|---|---|---|---|---|---:|---:|
{matrix_table}

Os cinco controles locais são C03, C06, C07, C16 e C17. Eles validam o comportamento do sistema sem chamar o modelo. Nos casos C08, C09 e C14, uma chamada de triagem foi seguida de encaminhamento. Os outros 12 passaram pelas quatro etapas de IA.

As pausas de cota somaram {M['pacing_wait_ms']/1000:.1f} segundos em {M['batch_wall_ms']/1000:.1f} segundos de duração total. As latências p50/p95 por caso foram {M['latency_ms']['p50']}/{M['latency_ms']['p95']} ms; incluem pausas dentro do pipeline, mas não pausas entre casos. Não representam tempo de geração puro.

## Correções e ressalvas

C10 confirmou o ajuste editorial: a consulta em Financeiro > Faturas aparece antes da descrição solicitada para análise. C19 confirmou a separação entre fontes e mensagem: KB-004 aparece em `source_ids`, sem exposição no texto ao cliente. As nove regressões editoriais continuam aprovadas; sete delas falhavam antes da correção.

A inspeção de C05 e C13 verificou a orientação de conferir permissões, sem determinar alteração pelo administrador. C18 preservou a condição de titularidade e não repetiu a senha sintética. C15 não aprovou reembolso nem prometeu prazo, mas ainda admite uma resposta mais direta à pergunta do cliente.

| Caso | Ressalva observada na inspeção assistida |
|---|---|
{observations}

Essas observações não alteraram a pontuação automática nem as respostas arquivadas. São evidência de que a rubrica por padrões não cobre toda a qualidade editorial. No piloto, o atendente deve revisar e adaptar o rascunho antes do uso.

## Comparação de experimentos

| Versão/modelo | Escopo e aprovação registrada | Tokens informados |
|---|---|---:|
| 1.0.0 / 120B | Matriz original: 17/20 | 73.625 |
| 1.1.1 / 120B | Matriz intermediária: 19/20 | 87.680 |
| 1.1.2 / 120B | 20/20 nas regras daquela versão | 87.230 nos resultados concluídos; 121.392 incluindo tentativas |
| 1.2.0 / 120B | Seleção C05/C10/C13/C15/C18/C19: 6/6 | 46.806 |
| 1.2.1 / 120B | C01 e cinco locais concluídos; 14 pendentes | 12.899 em todas as tentativas |
| 1.2.1 / 20B | Matriz independente: {M['passed']}/20 | {n(U['new_tokens'])} |

As contagens históricas usam os avaliadores de cada versão. Sob as regras 1.2.1, as 20 respostas 1.1.2 passam em 11/20; as seis respostas 1.2.0 passam em 4/6. Essa reavaliação offline foi preservada no [comparativo anterior](../reports/groq-comparison-v1.2.1-2026-10-17-retomada-2.json). Ela não substitui as notas históricas.

Não se conclui superioridade de um modelo: parte dos experimentos difere em prompts, avaliador e escopo, e não há repetições reais nem conjunto reservado. A troca para 20B resolveu a viabilidade desta avaliação observada, não garante cota futura.

## Consumo total, sem duplicação

{tokens}

| Parcela | Tokens |
|---|---:|
| Ciclo de correções antes da matriz 20B | {n(U['cycle_before'])} |
| Nova matriz 20B | {n(U['new_tokens'])} |
| Ciclo de correções + avaliação de entrega | {n(U['cycle_total'])} |
| Matriz original + teste isolado anterior | 79.867 |
| Histórico completo documentado | **{n(U['historical_total'])}** |

Conciliação: **{n(U['historical_before'])} + {n(U['new_tokens'])} = {n(U['historical_total'])}**. O total anterior já inclui tentativas interrompidas e reavaliações; essas parcelas não foram somadas novamente. Respostas sem `usage` não são estimadas. Tokens não foram convertidos em custo monetário.

## Limites e próximos passos

O conjunto é sintético, pequeno e usado durante o desenvolvimento. A revisão por modelo compartilha limitações do gerador; as regras locais têm cobertura parcial. A repetição local é determinística. Nenhuma das aprovações comprova ausência de alucinação, privacidade completa ou consistência em chamadas futuras.

Para o piloto, aprovar uma base empresarial, usar amostra autorizada e reservada, pedir avaliação independente de atendentes e medir tempo de correção. Autenticação, fila persistente, helpdesk, trilha de aprovação e gestão central de segredos fazem parte de uma implantação futura. Não há execução online ativa ou agendada ao final da entrega.

O experimento 120B mantém 14 pendências em seu próprio histórico. Seu plano de retomada é opcional e não foi executado nesta finalização; não é necessário para reproduzir a matriz 20B entregue.
""")

# Mantém explicações técnicas existentes; substitui somente o status desatualizado.
readme = old('README.md')
readme = readme.replace('## Comece aqui', 'Leia primeiro [LEIA-ME-ENTREGA.md](LEIA-ME-ENTREGA.md) e o [relatório final](docs/ENTREGA_FINAL.md).\n\n## Comece aqui', 1)
start = readme.index('**Situação em 17/10/2026:**')
end = readme.index('## Entrada e saída', start)
readme = readme[:start] + f"**Entrega final em 17/10/2026:** {summary}\n\n{tokens}\n\nC10 e C19 foram confirmados online no 20B. A matriz 120B anterior permanece parcial e preservada, com seis concluídos e 14 pendentes. Os resultados dos modelos não foram combinados. Consulte [resultados, ressalvas e comparação](docs/ENTREGA_FINAL.md). Não há execução ativa nem agendada.\n\nPara repetir a matriz de entrega, configure sua chave e use um prefixo novo:\n\n```powershell\nnode scripts/evaluate-groq-20b.mjs --output reports/minha-matriz-20b\n```\n\n" + readme[end:]
readme = readme.replace('npm run evaluate -- --repeat 3', 'node src/cli.mjs evaluate --provider demo --repeat 3 --output reports/minha-avaliacao-local')
readme = readme.replace('- `evaluate`: avalia 20 cenários sintéticos e salva `reports/demo.json` e `reports/demo.md`.', '- `evaluate`: avalia 20 cenários sintéticos e salva JSON/Markdown no prefixo informado.')
readme = readme.replace('examples/resultado-demo.json', 'examples/resultado-demo-v1.2.1.json')
readme = readme.replace('(reports/demo.md)', '(reports/demo-entrega-v1.2.1.md)')
readme = readme.replace('O protótipo tem componentes reutilizáveis para um piloto supervisionado.' + readme.split('O protótipo tem componentes reutilizáveis para um piloto supervisionado.', 1)[1],
    'O protótipo tem componentes reutilizáveis para um piloto supervisionado. A matriz 1.2.1 foi concluída no 20B. A aprovação automática nesta amostra não mede consistência entre repetições nem prontidão para produção. Antes do uso empresarial, valide políticas, base, decisões e qualidade com atendentes e amostra reservada; implemente autenticação, fila, observabilidade e gestão de segredos.')
write('README.md', readme)

capstone = old('docs/CAPSTONE.md')
start = capstone.index('Não foram medidos ganhos de produtividade')
end = capstone.index('## 3.', start)
capstone = capstone[:start] + f"Não foram medidos ganhos de produtividade, redução de custos ou qualidade geral do modelo. {summary} Os ajustes de C10 e C19 foram confirmados nas saídas reais. A inspeção assistida também registra ressalvas de clareza e completude, descritas em [ENTREGA_FINAL.md](ENTREGA_FINAL.md). A validação das hipóteses exige o piloto descrito em [TESTES.md](TESTES.md).\n\n" + capstone[end:]
capstone = capstone.replace('Matrizes históricas 17/20 → 19/20 → 20/20; seleção 1.2.0: 6/6. Matriz 1.2.1 incompleta por cota.', f'Matriz independente 1.2.1/20B: {M["passed"]}/20; 15 casos com API e cinco controles locais. Históricos preservados.')
start = capstone.index('## 7. Resultado e recomendação')
capstone = capstone[:start] + f"""## 7. Resultado e recomendação

{summary}

{tokens}

A confirmação de execução encontra-se em [ENTREGA_FINAL.md](ENTREGA_FINAL.md), com tabela por caso, comparação, ressalvas e fontes das evidências. A [simulação atual](../reports/demo-entrega-v1.2.1.md) e a [auditoria](../reports/entrega-evidence.json) identificam versão e hashes. A matriz 20B e o experimento parcial 120B permanecem separados.

As falhas históricas motivaram controles e testes de regressão para negação, exposição de credenciais, canais inventados, afirmações de consulta não realizada, pedido desnecessário de dados, condições financeiras, titularidade, ordem de instruções e exposição de códigos internos. Os relatos originais das falhas estão preservados em [COMPARACAO_GROQ_CORRECOES.md](COMPARACAO_GROQ_CORRECOES.md), [CORRECOES_SEMANTICAS_GROQ.md](CORRECOES_SEMANTICAS_GROQ.md) e [CORRECOES_EDITORIAIS_GROQ.md](CORRECOES_EDITORIAIS_GROQ.md).

O protótipo atende ao escopo acadêmico de análise, experimentação e recomendação. Os critérios de modularidade, organização, testes e aplicação são sustentados pelos artefatos. A consistência demonstrada é estrutural e restrita aos casos avaliados; generalização, ganho operacional e benefício causal das técnicas ainda exigem estudo independente.

Recomenda-se um piloto supervisionado após aprovação de base empresarial e avaliação com atendentes. O assistente prepara rascunhos; o profissional aprova mensagens e executa ações. O envio autônomo não integra a proposta.

## 8. Reprodução e entregáveis

Veja [LEIA-ME-ENTREGA.md](../LEIA-ME-ENTREGA.md) para executar localmente sem credencial. A biblioteca está em `prompts/v1.2.1/`, a implementação em `src/`, as regressões em `tests/`, os dados em `data/` e as evidências em `reports/`. O pacote inclui um relatório PDF e [roteiro de apresentação](APRESENTACAO.md).

O Groq foi escolhido pelo usuário. A avaliação final utiliza `openai/gpt-oss-20b`, documentado com suporte a [saída estruturada estrita](https://console.groq.com/docs/structured-outputs), consulta em 17/10/2026. A política de espera segue os cabeçalhos descritos em [Rate Limits](https://console.groq.com/docs/rate-limits). Disponibilidade de modelo e cota deve ser conferida antes de uma nova execução.
"""
write('docs/CAPSTONE.md', capstone)

tests = old('docs/TESTES.md')
start = tests.index('A avaliação 1.2.1 tem')
end = tests.index('## O que cada camada mede', start)
tests = tests[:start] + f"{summary}\n\nA suíte e a simulação foram repetidas na finalização. Evidências atuais: [79 testes](../reports/test-results-entrega-v1.2.1.tap), [60 execuções simuladas](../reports/demo-entrega-v1.2.1.md) e [matriz 20B](../reports/{P}.md). Os 25 arquivos congelados foram conferidos por hash. C10 e C19 passaram no Groq 20B; a nota não equivale a revisão humana. O experimento 120B anterior mantém 14 pendências. Veja [ENTREGA_FINAL.md](ENTREGA_FINAL.md).\n\n" + tests[end:]
tests = tests.replace('npm run evaluate -- --repeat 3', 'node src/cli.mjs evaluate --provider demo --repeat 3 --output reports/minha-avaliacao-local')
tests = tests.replace('## Evidências entregues', '## Evidências históricas preservadas\n\nOs arquivos abaixo registram as etapas anteriores. Para o estado final e os novos totais, leia [ENTREGA_FINAL.md](ENTREGA_FINAL.md).', 1)
write('docs/TESTES.md', tests)

ops = old('docs/OPERACAO.md')
start = ops.index('## Matriz 1.2.1 interrompida')
end = ops.index('## Limites de proteção', start)
ops = ops[:start] + f"""## Perfil da entrega: matriz independente 20B

{summary} O modelo padrão de `.env.example` continua 120B; o executor abaixo configura 20B somente no processo filho, sem modificar `.env.local`.

```powershell
node scripts/evaluate-groq-20b.mjs --dry-run
node scripts/evaluate-groq-20b.mjs --output reports/minha-matriz-20b
```

Configure sua própria chave antes de repetir. Escolha um prefixo novo; o executor recusa a pasta de casos existente. O modo `--dry-run` confere o manifesto sem rede. Código, prompts, base e gabarito devem corresponder à versão congelada. Se forem alterados, inicie um novo experimento com um novo manifesto.

As chamadas são sequenciais e respeitam as pausas informadas. Os casos ficam salvos em checkpoint; uma espera longa encerra o lote em vez de repetir indefinidamente. Se interrompido, retome somente os pendentes com o manifesto do mesmo modelo e depois consolide sem apagar as tentativas.

{tokens} Veja [ENTREGA_FINAL.md](ENTREGA_FINAL.md). Não há execução ativa ou agendada ao final da entrega.

### Experimento 120B anterior

Permanece parcial: C01 e cinco controles locais concluídos, 14 casos com API pendentes, 12.899 tokens em todas as tentativas. O plano histórico `scripts/resume-groq-v1.2.1-retomada-3.mjs` não foi executado nesta finalização. A conclusão 20B não preenche suas pendências. A retomada 120B é opcional e não é necessária para examinar a entrega. Veja [registro anterior](RETOMADA_GROQ_V1_2_1.md).

""" + ops[end:]
ops = ops.replace('Configurada; matrizes históricas 17/20 → 19/20 → 20/20 e seleção 1.2.0: 6/6. Matriz 1.2.1 incompleta por cota: C01 com API e cinco locais concluídos; 14 pendentes', f'Matriz independente 1.2.1/20B concluída: {M["passed"]}/20; histórico 120B preservado e separado')
write('docs/OPERACAO.md', ops)
prompts = old('docs/PROMPTS.md')
prompts = prompts.replace('A matriz 1.2.1 continua incompleta por cota, com C01 concluído no Groq e cinco controles locais preservados. C10 e C19 ainda precisam de confirmação online. Resultados e retomada dos 14 pendentes estão em [RETOMADA_GROQ_V1_2_1.md](RETOMADA_GROQ_V1_2_1.md).', f'A matriz independente 1.2.1/20B foi concluída com {M["passed"]}/20 casos aprovados, incluindo C10 e C19. O experimento 120B continua separado e parcial. Resultados, ressalvas e limites estão em [ENTREGA_FINAL.md](ENTREGA_FINAL.md).')
write('docs/PROMPTS.md', prompts)
for name in ['RETOMADA_GROQ_V1_2_1.md', 'CORRECOES_EDITORIAIS_GROQ.md', 'CORRECOES_SEMANTICAS_GROQ.md', 'COMPARACAO_GROQ_CORRECOES.md', 'AVALIACAO_GROQ_20_CASOS.md', 'TESTE_REAL_GROQ.md']:
    content = old('docs/' + name)
    first, rest = content.split('\n', 1)
    write('docs/' + name, first + '\n\n> Registro histórico preservado. Para a conclusão acadêmica, matriz independente 20B e consumo total atualizado, consulte [ENTREGA_FINAL.md](ENTREGA_FINAL.md). Os valores abaixo correspondem à data e ao escopo deste registro.\n' + rest)

write('docs/APRESENTACAO.md', f"""
# Roteiro de apresentação — cinco minutos

## 0:00–0:45 · Problema e objetivo

“Equipes de suporte precisam classificar chamados e responder de acordo com procedimentos. Este projeto prepara um rascunho para o atendente, com aprovação humana obrigatória. A empresa Nexo Gestão e os dados são fictícios; o problema representa uma necessidade real de suporte.”

Mostre `examples/chamado.json`. Objetivo: criar um sistema de prompts modular, testável e reutilizável.

## 0:45–1:40 · Técnicas e arquitetura

Mostre `prompts/v1.2.1/` e o diagrama em `docs/ARQUITETURA.md`. Explique triagem, fundamentação, resposta e revisão. Mostre um exemplo few-shot e a exigência de citação literal. Destaque JSON Schema, validação local, crítica com uma correção e encaminhamento quando falta evidência.

## 1:40–2:40 · Demonstração

Execute `npm run demo`. Mostre categoria, prioridade, fonte, rascunho, `requires_human_approval:true` e `auto_sent:false`. Explique que a demonstração ao vivo é simulada e não depende de internet.

Depois abra as saídas reais de C10 e C19 em `reports/{P}-cases/`. Identifique o modelo Groq 20B. C10 orienta consultar faturas antes de pedir dados da análise. C19 mantém KB-004 no campo estruturado e o omite do texto. Não abra `.env.local` durante a apresentação.

## 2:40–3:40 · Evidências e aprendizado

“A versão 1.2.1 passou em 79 testes locais, 60 execuções simuladas e {M['passed']}/20 casos da matriz Groq 20B. Quinze casos usaram API e cinco foram resolvidos por controles locais. Foram {n(U['new_tokens'])} tokens nessa matriz. O histórico de desenvolvimento inteiro soma {n(U['historical_total'])}.”

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
""")
print(json.dumps({'documentation_updated': True, 'historical_total': U['historical_total']}))
