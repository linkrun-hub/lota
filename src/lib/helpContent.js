/**
 * src/lib/helpContent.js
 * Conteúdo do "?" de ajuda por função — o vendedor silencioso.
 * Cada função explica o que faz, como usar no Básico e o que o Pro entrega.
 * tipo: 'feature' = módulo no básico com automação Pro
 *       'modulo'  = recurso exclusivo do Pro
 *       'gratis'  = igual nos dois planos
 */
export const HELP = {
  '/': {
    titulo: 'Visão Geral',
    resumo: 'O painel do seu negócio em tempo real: leads, conversões e alertas.',
    tipo: 'gratis',
    basico: ['Veja leads, conversões e funil do mês', 'Acompanhe quem precisa de atenção'],
    pro: ['Métricas financeiras (MRR, LTV, churn)', 'ROI por canal e ranking de indicadores'],
  },
  '/leads': {
    titulo: 'Leads',
    resumo: 'Todo contato interessado organizado num funil, do primeiro oi até a matrícula.',
    tipo: 'gratis',
    basico: ['Funil visual (kanban) e lista', 'Cadastre, filtre e mova entre etapas', 'Abra a conversa direto no WhatsApp'],
    pro: ['Score de leads e priorização', 'Origem rastreada de cada canal'],
  },
  '/followup': {
    titulo: 'Follow-up',
    resumo: 'Traga de volta os leads que ainda não responderam — quem faz follow-up vende mais.',
    tipo: 'feature',
    basico: ['Veja todos com follow-up pendente', 'Revise e edite cada mensagem', 'Envie uma a uma pelo WhatsApp'],
    pro: ['Envio 100% automático nos melhores horários', 'Sequência de 3 mensagens sem você tocar', 'Nunca mais esqueça um lead'],
  },
  '/mensagens': {
    titulo: 'Mensagens',
    resumo: 'Todas as conversas de WhatsApp do seu negócio num lugar só.',
    tipo: 'gratis',
    basico: ['Chat em tempo real', 'Envie texto, áudio, foto e documento', 'Templates de respostas rápidas'],
    pro: ['Sugestões de resposta com IA', 'Atribuição automática por tipo de contato'],
  },
  '/atendimento': {
    titulo: 'Atendimento',
    resumo: 'Organize contatos que não são leads: fornecedores, parceiros, VIPs.',
    tipo: 'gratis',
    basico: ['Cadastre contatos especiais', 'Marque tipo (fornecedor, parceiro, VIP)'],
    pro: ['Respostas automáticas por tipo', 'Alerta prioritário de contatos VIP'],
  },
  '/captacao': {
    titulo: 'Captação',
    resumo: 'Canais que enchem seu funil de leads automaticamente.',
    tipo: 'feature',
    basico: ['Formulário público pra compartilhar', 'Leads caem direto no seu funil'],
    pro: ['Integração com Meta e Google Lead Ads', 'Leads dos anúncios entram sozinhos'],
  },
  '/isca': {
    titulo: 'ISCA — Marketing',
    resumo: 'Sugestões de post criadas a partir dos SEUS dados, todos os dias.',
    tipo: 'feature',
    basico: ['Veja as sugestões de post do dia', 'Copie a legenda e poste você mesmo'],
    pro: ['Artes geradas com sua marca', 'Agende e publique direto pelo sistema', 'Análise das suas redes com IA'],
  },
  '/retencao': {
    titulo: 'Retenção',
    resumo: 'Identifique alunos em risco antes que eles cancelem.',
    tipo: 'feature',
    basico: ['Veja quem está faltando ou prestes a vencer', 'Alertas de risco no painel'],
    pro: ['Mensagem automática pro aluno sumido', 'Lembrete de renovação no piloto automático', 'Cobrança amigável de inadimplentes'],
  },
  '/agenda': {
    titulo: 'Agenda',
    resumo: 'Um link pra clientes agendarem aula experimental, avaliação ou serviço sozinhos.',
    tipo: 'modulo',
    basico: ['Recurso exclusivo do Pro'],
    pro: ['Link público de agendamento', 'Confirmação e lembretes automáticos', 'No-show vira follow-up de remarcação', 'Lista de espera quando lota'],
  },
  '/gestao': {
    titulo: 'Gestão',
    resumo: 'Gerencie seus alunos, turmas e o financeiro do negócio.',
    tipo: 'modulo',
    basico: ['Recurso exclusivo do Pro'],
    pro: ['Cadastro de alunos e turmas', 'MRR, inadimplência e vencimentos', 'Ocupação das turmas em tempo real'],
  },
  '/disparos': {
    titulo: 'Disparos',
    resumo: 'Mande uma mensagem pra muita gente de uma vez — promoções, avisos, eventos.',
    tipo: 'modulo',
    basico: ['Recurso exclusivo do Pro'],
    pro: ['Campanhas de WhatsApp e e-mail em massa', 'Segmentos prontos (inativos, renovação...)', 'Anti-bloqueio e respeito ao horário'],
  },
  '/indicacoes': {
    titulo: 'Indicações',
    resumo: 'Transforme alunos satisfeitos em vendedores do seu negócio.',
    tipo: 'modulo',
    basico: ['Recurso exclusivo do Pro'],
    pro: ['Link único de indicação por aluno', 'Acompanhamento de quem indicou quem', 'Convite automático pros mais satisfeitos'],
  },
  '/loja': {
    titulo: 'Loja',
    resumo: 'Catálogo público de produtos com pedido pelo WhatsApp.',
    tipo: 'modulo',
    basico: ['Recurso exclusivo do Pro'],
    pro: ['Vitrine de produtos com link próprio', 'Carrinho e checkout pelo WhatsApp', 'Controle de estoque e encomendas'],
  },
  '/configuracoes': {
    titulo: 'Configurações',
    resumo: 'Conecte o WhatsApp e ajuste os módulos do seu negócio.',
    tipo: 'gratis',
    basico: ['Conecte o WhatsApp via QR Code', 'Ative e desative módulos'],
    pro: ['E-mail transacional com seu domínio', 'Persona da IA personalizada'],
  },
}
