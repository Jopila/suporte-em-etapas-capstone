"""Relatório da entrega a partir das evidências auditadas; requer ReportLab e pypdf."""
import json
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Preformatted, Flowable, KeepTogether
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
E = json.loads((ROOT / 'reports/entrega-evidence.json').read_text(encoding='utf-8'))
OUT = ROOT / 'output/pdf/Capstone_Suporte_em_Etapas.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
for name, file in [('Arial', 'arial.ttf'), ('ArialBold', 'arialbd.ttf'), ('Mono', 'consola.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(Path('C:/Windows/Fonts') / file)))
pdfmetrics.registerFontFamily('Arial', normal='Arial', bold='ArialBold', italic='Arial', boldItalic='ArialBold')
NAVY, BLUE, INK, GRAY = map(colors.HexColor, ['#10253E', '#126F83', '#26374A', '#627388'])
PALE, LINE = colors.HexColor('#EEF5F7'), colors.HexColor('#DCE5EC')
WIDTH = A4[0] - 84
styles = {
    'title': ParagraphStyle('title', fontName='ArialBold', fontSize=40, leading=43, textColor=NAVY, spaceAfter=17),
    'h1': ParagraphStyle('h1', fontName='ArialBold', fontSize=23, leading=28, textColor=NAVY, spaceAfter=17),
    'h2': ParagraphStyle('h2', fontName='ArialBold', fontSize=13, leading=17, textColor=BLUE, spaceBefore=13, spaceAfter=7),
    'body': ParagraphStyle('body', fontName='Arial', fontSize=10, leading=14.5, textColor=INK, spaceAfter=8),
    'small': ParagraphStyle('small', fontName='Arial', fontSize=8.3, leading=11.7, textColor=GRAY, spaceAfter=6),
    'cell': ParagraphStyle('cell', fontName='Arial', fontSize=8.3, leading=11, textColor=INK),
    'th': ParagraphStyle('th', fontName='ArialBold', fontSize=8.2, leading=10.8, textColor=colors.white),
    'code': ParagraphStyle('code', fontName='Mono', fontSize=7.7, leading=11.5, textColor=NAVY, spaceAfter=8),
    'kpi': ParagraphStyle('kpi', fontName='ArialBold', fontSize=29, leading=34, textColor=colors.white),
    'kpilabel': ParagraphStyle('kpilabel', fontName='Arial', fontSize=8.5, leading=12, textColor=colors.white),
}

def clean(s):
    return str(s).replace('\u2011', '-').replace('\u2013', '-').replace('\u2014', '-').replace('\u2212', '-')
def p(s, kind='body'):
    return Paragraph(clean(s), styles[kind])
def plain(s, kind='body'):
    return p(escape(clean(s)), kind)
def n(value):
    return f'{value:,}'.replace(',', '.')
def table(headers, rows, widths=None, font='cell'):
    content = [[plain(x, 'th') for x in headers]] + [[plain(x, font) for x in row] for row in rows]
    t = Table(content, colWidths=widths or [WIDTH / len(headers)] * len(headers), repeatRows=1, hAlign='LEFT')
    t.spaceAfter = 7
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), NAVY), ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, PALE]),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8), ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7), ('LINEBELOW', (0, -1), (-1, -1), .5, LINE),
    ]))
    return t
def box(text):
    t = Table([[p(text)]], colWidths=[WIDTH])
    t.spaceAfter = 7
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), PALE), ('BOX', (0, 0), (-1, -1), .5, LINE),
                          ('TOPPADDING', (0, 0), (-1, -1), 12), ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
                          ('LEFTPADDING', (0, 0), (-1, -1), 13), ('RIGHTPADDING', (0, 0), (-1, -1), 13)]))
    return t
class PipelineDiagram(Flowable):
    def __init__(self):
        Flowable.__init__(self); self.width = WIDTH; self.height = 137
    def draw(self):
        c = self.canv; w = (WIDTH - 42) / 4
        for i, (title, subtitle) in enumerate([('1  TRIAGEM', 'categoria e prioridade'), ('2  BASE', 'evidências e ações'), ('3  RESPOSTA', 'rascunho ao cliente'), ('4  REVISÃO', 'rubrica e controles')]):
            x = i * (w + 14)
            c.setFillColor(PALE); c.setStrokeColor(LINE); c.roundRect(x, 65, w, 56, 6, fill=1, stroke=1)
            c.setFillColor(NAVY); c.setFont('ArialBold', 8.5); c.drawString(x + 9, 100, title)
            c.setFont('Arial', 7.5); c.drawString(x + 9, 83, subtitle)
            if i < 3:
                c.setStrokeColor(BLUE); c.line(x + w + 2, 93, x + w + 12, 93)
                c.line(x + w + 12, 93, x + w + 9, 96); c.line(x + w + 12, 93, x + w + 9, 90)
        c.setFillColor(NAVY); c.roundRect(0, 10, WIDTH, 37, 5, fill=1, stroke=0)
        c.setFillColor(colors.white); c.setFont('ArialBold', 10)
        c.drawCentredString(WIDTH / 2, 24, 'APROVAÇÃO HUMANA OBRIGATÓRIA - SEM ENVIO AUTOMÁTICO')
        c.setStrokeColor(BLUE); c.line(WIDTH - w / 2, 65, WIDTH - w / 2, 47)

story = []
def add(text, kind='body'): story.append(p(text, kind))
def page(title): story.append(PageBreak()); add(title, 'h1')

M = E['matrix']; U = E['consumption']; rows = E['cases']
add('PROJETO PRÁTICO DO MÓDULO 2', 'small'); story.append(Spacer(1, 36))
add('SUPORTE<br/>EM ETAPAS', 'title')
add('Sistema modular de prompts para triagem e elaboração de respostas a chamados de suporte.', 'h2')
story.append(Spacer(1, 25))
story.append(box('Um protótipo executável que combina instruções estruturadas, base de conhecimento, quatro etapas de IA, controles locais e revisão humana.'))
story.append(Spacer(1, 24))
kpis = Table([[p(str(E['tests']['passed']), 'kpi'), p(f"{E['demo']['passed']}/{E['demo']['runs']}", 'kpi'), p(f"{M['passed']}/{M['cases']}", 'kpi')],
              [p('TESTES LOCAIS APROVADOS', 'kpilabel'), p('EXECUÇÕES SIMULADAS', 'kpilabel'), p('CASOS NA MATRIZ GROQ 20B', 'kpilabel')]], colWidths=[WIDTH / 3] * 3)
kpis.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), NAVY), ('LEFTPADDING', (0, 0), (-1, -1), 14), ('TOPPADDING', (0, 0), (-1, 0), 14), ('BOTTOMPADDING', (0, 1), (-1, -1), 14)]))
story.append(kpis); story.append(Spacer(1, 25))
add('Versão 1.2.1 | Groq | 17 de outubro de 2026', 'small')
add('Contexto sintético: SaaS B2B Nexo Gestão. A empresa e os procedimentos foram criados para o exercício. O problema de triagem e redação representa uma necessidade comum de equipes de suporte.', 'body')
add('Aprovação automática em uma amostra sintética não comprova prontidão para produção. A entrega inclui resultados, falhas, limitações e instruções de reprodução.', 'small')

page('01 / Problema e aplicação')
add('Chamados incompletos, urgência expressa sem contexto e políticas distribuídas aumentam o trabalho de triagem. Uma resposta inadequada pode prometer reembolso, confirmar uma ação não executada ou pedir informações desnecessárias.')
add('O sistema prepara um rascunho para o atendente: classifica o relato, seleciona procedimentos autorizados, redige e revisa. O atendente decide a resposta final e executa qualquer ação sobre a conta.')
add('Escopo funcional', 'h2')
story.append(table(['Incluído', 'Limite explícito'], [
    ['Sete categorias e prioridades P1 a P4', 'Decisões baseadas no relato; confiança não calibrada.'],
    ['Cinco artigos de conhecimento', 'Procedimentos fictícios, sem acesso a sistemas empresariais.'],
    ['Rascunho em português com fontes', 'Nenhuma mensagem é enviada automaticamente.'],
    ['Encaminhamento de risco ou falta de evidência', 'A fila e o helpdesk externos não foram integrados.'],
    ['Relatórios de qualidade, chamadas e tokens', 'Não foram medidos produtividade ou retorno financeiro.'],
], [WIDTH * .47, WIDTH * .53]))
add('Critérios de aceitação', 'h2')
story.append(table(['Critério', 'Evidência entregue'], [
    ['Técnica', 'Política comum, entradas, restrições, exemplos e contratos por etapa.'],
    ['Engenharia', 'Prompts, provedor, contratos, base, pipeline e avaliador em módulos separados.'],
    ['Qualidade', f"{E['tests']['passed']} testes locais; simulação 20 x 3; matriz real e inspeção das saídas."],
    ['Aplicação', 'Problema operacional de suporte, com adaptação organizacional descrita e supervisão humana.'],
], [100, WIDTH - 100]))
add('Para uma empresa real, será necessário aprovar a base, rotular uma amostra autorizada, manter um conjunto reservado e medir tempo de preparação e correção pelo atendente.', 'small')

page('02 / Arquitetura e contratos')
story.append(PipelineDiagram())
add('Antes do modelo', 'h2')
add('O programa valida a entrada, remove padrões sensíveis reconhecidos e detecta sinais locais de incidente ou injeção. Casos críticos podem ser encaminhados sem chamada ao Groq. Os dados do chamado ficam separados das instruções do sistema.')
add('Durante o pipeline', 'h2')
add('A triagem extrai fatos e decide categoria e prioridade. A recuperação lexical seleciona até três artigos. A fundamentação precisa citar texto existente e copiar ações autorizadas. O rascunho passa por controles locais e pela rubrica do modelo.')
add('Uma rejeição pode gerar uma correção de resposta. Erro persistente, base insuficiente ou timeout levam ao encaminhamento humano. Falhas de contrato têm tentativas limitadas. Não há ciclos ilimitados.')
add('Contrato mínimo de decisão', 'h2')
story.append(Preformatted('{\n  "status": "rascunho_validado",\n  "source_ids": ["KB-002"],\n  "requires_human_approval": true,\n  "auto_sent": false\n}', styles['code']))
add('Exemplo abreviado de campos de saída. A resposta completa também guarda triagem, evidências, revisão, trace, duração e uso informado.', 'small')
add('Fronteiras de responsabilidade', 'h2')
story.append(table(['Módulo', 'Responsabilidade'], [
    ['src/contracts.mjs', 'Schemas JSON compartilhados pelo prompt, cliente e validador local.'],
    ['src/knowledge.mjs + src/safety.mjs', 'Recuperação, evidências e controles de conteúdo.'],
    ['src/providers/groq.mjs', 'HTTP, autenticação, formatos, timeouts e repetição limitada.'],
    ['src/pipeline.mjs + src/evaluation.mjs', 'Orquestração, encaminhamento e medição dos casos.'],
], [205, WIDTH - 205]))

page('03 / Biblioteca de prompts')
add('Os cinco arquivos ativos estão em prompts/v1.2.1/. Versões anteriores permanecem disponíveis para conferir os experimentos históricos. O hash da biblioteca inclui política, prompts e schemas.')
story.append(table(['Arquivo', 'Função no sistema'], [
    ['system.md', 'Papel, política comum, limites de atuação e separação entre dados e instruções.'],
    ['triagem.md', 'Extração, classificação, prioridade, lacunas e exemplos few-shot.'],
    ['fundamentacao.md', 'Citações literais e seleção de ações da base.'],
    ['resposta.md', 'Mensagem ao cliente e correção por feedback, sem promessas indevidas.'],
    ['revisao.md', 'Rubrica de fundamentação, segurança, completude e aprovação técnica.'],
], [133, WIDTH - 133]))
add('Técnicas avançadas aplicadas', 'h2')
story.append(table(['Técnica', 'Uso e justificativa'], [
    ['Few-shot', 'Exemplos mostram que urgência retórica não transforma uma dúvida em incidente P1.'],
    ['Decomposição e encadeamento', 'Cada etapa tem uma responsabilidade e uma saída verificável para a seguinte.'],
    ['Grounding', 'Ações e citações são confrontadas com a base recuperada.'],
    ['Saída estruturada', 'JSON Schema estrito e validação local do contrato.'],
    ['Crítica e refinamento', 'Feedback orienta uma tentativa de correção; falha persistente vai ao atendente.'],
    ['Abstinência', 'O sistema encaminha quando não dispõe de evidência ou confiança suficiente.'],
], [145, WIDTH - 145]))
add('Exemplo de decisão', 'h2')
story.append(box('Entrada: <b>URGENTE!!! Onde exporto um relatório CSV?</b><br/>Decisão esperada: <b>duvida / P4</b>. O conteúdo indica uma dúvida de uso; caixa alta, isoladamente, não comprova incidente crítico.'))
add('A biblioteca pede decisões e evidências verificáveis, sem solicitar exposição de raciocínio interno. O revisor usa o mesmo modelo do gerador e pode reproduzir seus erros.', 'small')

page('04 / Plano de testes e avaliação')
add(f"A suíte atual passou em <b>{E['tests']['passed']}/{E['tests']['passed']} testes</b>. A avaliação local repetiu os 20 casos três vezes: <b>{E['demo']['passed']}/{E['demo']['runs']}</b>. Essa repetição é determinística e verifica a engenharia, sem medir estabilidade de um LLM.")
add('A matriz real usa os mesmos 20 casos rotulados, uma execução por caso, temperatura 0,1, JSON Schema estrito e até 4.096 tokens de saída. O perfil de entrega é openai/gpt-oss-20b, com esforço de raciocínio baixo.')
metric_defs = [
    ('category', 'Categoria igual ao rótulo', '85%'), ('priority', 'Prioridade igual ao rótulo', '90%'),
    ('routing', 'Encaminhamento esperado', '95%'), ('citations', 'Conjunto de fontes esperado', '100%'),
    ('contracts', 'Contrato válido e sem erro operacional', '100%'), ('evidence', 'Sem citação ou ação inválida detectada', '100%'),
    ('privacy', 'Fragmentos proibidos ausentes', '100%'), ('human_gate', 'Revisão humana, sem envio', '100%'),
    ('content', 'Sem padrão proibido detectado na saída', '100%'),
]
story.append(table(['Métrica', 'Definição', 'Meta', '20B'], [[key, definition, goal, f"{M['rates'][key]*100:.0f}%"] for key, definition, goal in metric_defs], [85, WIDTH - 181, 48, 48]))
add('Regressões significativas', 'h2')
add('Os testes cobrem injeção, dados sintéticos sensíveis, citação inventada, ação sem autorização, falha de rede, 429, timeout e correção rejeitada. As nove regressões editoriais tratam os textos observados de C10 e C19, variações, contraexemplos permitidos e preservação das fontes.')
add('Antes dos ajustes editoriais, sete das nove regressões falhavam; depois, todas passaram. Os 70 testes anteriores foram mantidos. O teste local nunca chama a API.')
story.append(box('<b>Limite de interpretação:</b> as métricas de conteúdo compartilham regras com o pipeline. Não são um juiz independente. Os casos foram usados para orientar correções; não são uma amostra reservada de clientes reais.'))

page('05 / Matriz real no Groq 20B')
add(f"<b>{M['passed']}/{M['cases']} casos aprovados</b> nesta matriz independente. Casos com API: {M['api_cases']}. Controles locais: {len(M['local_case_ids'])}. Modelo, versão e arquivos completos estão identificados nas evidências.")
story.append(table(['Caso', 'Categoria', 'Prior.', 'Caminho', 'Resultado', 'Tokens'], [
    [r['id'], r['category'] or '-', r['priority'] or '-', 'Local' if r['requests']==0 else 'API',
     'Aprovado' if r['passed'] else ('Erro operacional' if r['operational_error'] else 'Reprovado'), n(r['tokens'])] for r in rows
], [43, 110, 42, 52, WIDTH - 309, 62]))
add('Casos locais: ' + ', '.join(M['local_case_ids']) + '. Eles fazem parte da matriz do sistema, mas não demonstram qualidade de geração do modelo.', 'small')
add('Fonte: ' + M['report_path'] + '. Saídas completas, revisões e cabeçalhos de limite estão no checkpoint e nos arquivos por caso.', 'small')

page('06 / Respostas e ajustes editoriais')
for case_id, title, focus in [
    ('C10', 'Consulta antes das perguntas', 'A consulta de faturas deve ser direta. As perguntas para análise não são uma condição para acessar a área.'),
    ('C19', 'Fontes internas e texto ao cliente', 'O identificador do artigo permanece em source_ids; a orientação ao cliente não precisa expor KB-004.'),
]:
    r = next(item for item in rows if item['id']==case_id)
    add(f'{case_id} / {title}', 'h2'); add(focus)
    response = r['response'].replace('**', '').strip()
    if len(response) > 1100:
        response = response[:1100].rsplit(' ', 1)[0] + '...'
    story.append(box(escape(clean(response)).replace('\n', '<br/>')))
    add('Resposta real ' + ('aprovada nas verificações automáticas' if r['passed'] else 'com ressalva registrada') + '. Fontes estruturadas: ' + ', '.join(r['source_ids']) + '.', 'small')
add('Inspeção e limitações', 'h2')
add(E['inspection_summary'])
add('Os artefatos não foram editados para melhorar as respostas. A aprovação automática e a inspeção assistida não substituem o julgamento do atendente.', 'small')

page('07 / Experimentos e consumo')
add('O modelo 120B apresentou bloqueios recorrentes de cota. Para concluir uma avaliação independente no mesmo provedor, o projeto utilizou o 20B, compatível com o contrato estrito. Os resultados dos dois modelos não foram mesclados.')
story.append(table(['Experimento', 'Resultado registrado', 'Tokens'], [
    ['1.0.0 / 120B / matriz', '17/20, pelas regras históricas', n(73625)],
    ['1.1.1 / 120B / matriz', '19/20, pelas regras históricas', n(87680)],
    ['1.1.2 / 120B / resultados concluídos', '20/20, pelas regras daquela versão', n(87230)],
    ['1.2.0 / 120B / seis casos', '6/6; avaliação seletiva', n(46806)],
    ['1.2.1 / 120B / tentativas', '6 concluídos, 14 pendentes por cota', n(12899)],
    ['1.2.1 / 20B / matriz de entrega', f"{M['passed']}/{M['cases']} nesta avaliação independente", n(U['new_tokens'])],
], [WIDTH * .45, WIDTH * .39, WIDTH * .16]))
add('As linhas históricas têm escopos diferentes. O resultado do 20B não demonstra superioridade: modelo, prompts e regras mudaram entre parte dos experimentos. Falhas e tentativas interrompidas permanecem no histórico.')
add('Registro de tokens informados', 'h2')
story.append(table(['Escopo', 'Entrada', 'Saída', 'Total'], [
    ['Matriz 20B', n(M['usage']['prompt_tokens']), n(M['usage']['completion_tokens']), n(U['new_tokens'])],
    ['Ciclo de correções + avaliação de entrega', '-', '-', n(U['cycle_total'])],
    ['Histórico completo documentado', '-', '-', n(U['historical_total'])],
], [WIDTH - 219, 73, 73, 73]))
add(f"Histórico antes desta entrega: {n(U['historical_before'])} tokens. Acréscimo: {n(U['new_tokens'])}. As respostas sem usage não são estimadas; não foi calculado custo monetário.")
add('Pausas e operação', 'h2')
add('O executor usa os cabeçalhos de cota para espaçar chamadas e respeita Retry-After. Cada caso é salvo antes do seguinte. Uma espera acima do orçamento encerra o lote, preservando evidências e permitindo retomar apenas pendências.')
add('Reiniciar um caso interrompido pode repetir etapas já consumidas. Uma melhoria futura é persistir progresso por etapa com controles de versão, sem alterar retroativamente os dados desta avaliação.', 'small')

page('08 / Reprodução e entrega')
add('O pacote inclui a biblioteca completa, código, base sintética, conjunto rotulado, testes, exemplos, documentação e evidências. A chave Groq não faz parte da entrega.')
add('Verificação local, sem chave ou rede', 'h2')
story.append(Preformatted('npm test\nnpm run demo\nnode src/cli.mjs evaluate --provider demo --repeat 3 --output reports/minha-avaliacao-local', styles['code']))
add('Requisito: Node.js 24+. A aplicação não precisa de instalação de dependências npm. Execute cada comando em sua própria linha.', 'small')
add('Reprodução opcional no Groq', 'h2')
add('Copie .env.example para .env.local e configure uma chave própria. Para repetir o perfil de entrega, use um prefixo novo:')
story.append(Preformatted('node scripts/evaluate-groq-20b.mjs --output reports/minha-matriz-20b', styles['code']))
add('O perfil define o modelo apenas para o processo de avaliação e não altera .env.local. A disponibilidade de cota depende da conta. Os comandos de retomada 120B são históricos e permanecem separados.', 'small')
add('Localização das evidências', 'h2')
story.append(table(['Arquivo ou pasta', 'Uso pelo avaliador'], [
    ['LEIA-ME-ENTREGA.md', 'Ordem de leitura e execução rápida.'],
    ['docs/CAPSTONE.md + docs/ENTREGA_FINAL.md', 'Relatório editável e conclusão da entrega.'],
    ['prompts/v1.2.1/ + src/ + tests/', 'Biblioteca, implementação e regressões.'],
    ['reports/entrega-evidence.json', 'Totais e resultados conferidos contra as saídas originais.'],
    ['reports/groq-matrix-v1.2.1-20b-entrega-2026-10-17*', 'Matriz, checkpoint e respostas completas.'],
], [235, WIDTH - 235]))
add('Próximo passo recomendado', 'h2')
add('Usar base aprovada por uma empresa, avaliar uma amostra reservada com atendentes e medir qualidade, tempo de revisão e custo. Integração com helpdesk, autenticação, fila persistente e gestão central de segredos são trabalhos de implantação, fora do protótipo acadêmico.')
add('Referências técnicas consultadas em 17/10/2026', 'h2')
add('Groq - <link href="https://console.groq.com/docs/structured-outputs">Structured Outputs: console.groq.com/docs/structured-outputs</link><br/>Groq - <link href="https://console.groq.com/docs/models">modelos: console.groq.com/docs/models</link><br/>Groq - <link href="https://console.groq.com/docs/rate-limits">limites: console.groq.com/docs/rate-limits</link>', 'small')

def decorate(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE); canvas.line(42, 37, A4[0]-42, 37)
    canvas.setFillColor(GRAY); canvas.setFont('Arial', 8)
    canvas.drawString(42, 24, 'Suporte em Etapas | Capstone do Módulo 2 | v1.2.1')
    canvas.drawRightString(A4[0]-42, 24, f'{doc.page}')
    if doc.page > 1:
        canvas.setFillColor(BLUE); canvas.setFont('ArialBold', 8)
        canvas.drawString(42, A4[1]-28, 'BIBLIOTECA DE PROMPTS / ENGENHARIA E AVALIAÇÃO')
    canvas.restoreState()

doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=42, leftMargin=42, topMargin=48, bottomMargin=48,
                        title='Suporte em Etapas - Capstone do Modulo 2', author='Projeto Suporte em Etapas')
doc.build(story, onFirstPage=decorate, onLaterPages=decorate)
reader = PdfReader(str(OUT))
extracted = '\n'.join(page.extract_text() or '' for page in reader.pages)
assert 'SUPORTE' in extracted and str(E['tests']['passed']) in extracted
assert n(U['historical_total']) in extracted
print(json.dumps({'pdf': str(OUT), 'pages': len(reader.pages), 'text_characters': len(extracted)}, ensure_ascii=True))
