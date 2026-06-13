// ─── STATUS DE LEAD ──────────────────────────────────────────────────────────
export const STATUS_LEAD = {
  novo: { label: 'Novo', color: '#00E5FF', bg: 'rgba(0,229,255,0.12)', emoji: '🆕' },
  em_conversa: { label: 'Conversando', color: '#FFB800', bg: 'rgba(255,184,0,0.12)', emoji: '💬' },
  qualificado: { label: 'Qualificado', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', emoji: '✅' },
  agendado: { label: 'Agendado', color: '#00E5FF', bg: 'rgba(0,229,255,0.12)', emoji: '📅' },
  convertido: { label: 'Fechou!', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', emoji: '🎉' },
  perdido: { label: 'Perdido', color: '#6B7280', bg: 'rgba(107,114,128,0.12)', emoji: '❌' },
  opt_out: { label: 'Opt-out', color: '#4B5563', bg: 'rgba(75,85,99,0.12)', emoji: '🚫' },
}

// Colunas do Kanban (exibição)
export const KANBAN_COLUMNS = [
  { key: 'novo', label: 'Novos', color: '#00E5FF' },
  { key: 'em_conversa', label: 'Conversando', color: '#FFB800' },
  { key: 'qualificado', label: 'Qualificado', color: '#A78BFA' },
  { key: 'convertido', label: 'Fechou!', color: '#22C55E' },
  { key: 'perdido', label: 'Perdido', color: '#6B7280' },
]

// ─── MOMENTO DE COMPRA ───────────────────────────────────────────────────────
export const MOMENTO_COMPRA = {
  agora: { label: 'Quer agora', color: '#FF4444', bg: 'rgba(255,68,68,0.12)', emoji: '🔥' },
  em_breve: { label: 'Em breve', color: '#FFB800', bg: 'rgba(255,184,0,0.12)', emoji: '📆' },
  comparando: { label: 'Comparando', color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', emoji: '🔍' },
  curiosidade: { label: 'Curiosidade', color: '#6B7280', bg: 'rgba(107,114,128,0.12)', emoji: '👀' },
}

// ─── ORIGEM DO LEAD ──────────────────────────────────────────────────────────
export const ORIGEM_LEAD = {
  whatsapp: { label: 'WhatsApp', icon: '💬', color: '#25D366' },
  lead_ads_meta: { label: 'Meta Ads', icon: '📣', color: '#1877F2' },
  lead_ads_google: { label: 'Google Ads', icon: '🔍', color: '#EA4335' },
  landing_page: { label: 'Landing Page', icon: '🌐', color: '#A78BFA' },
  indicacao: { label: 'Indicação', icon: '🎁', color: '#FFB800' },
  manual: { label: 'Manual', icon: '✏️', color: '#6B7280' },
}

// ─── STATUS DE ALUNO ─────────────────────────────────────────────────────────
export const STATUS_ALUNO = {
  ativo: { label: 'Ativo', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' },
  suspenso: { label: 'Suspenso', color: '#FFB800', bg: 'rgba(255,184,0,0.12)' },
  cancelado: { label: 'Cancelado', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
  inadimplente: { label: 'Inadimplente', color: '#FF4444', bg: 'rgba(255,68,68,0.12)' },
}

// ─── RISCO DE RETENÇÃO ───────────────────────────────────────────────────────
export const RISCO_NIVEL = {
  atencao: { label: 'Atenção', color: '#FFB800', emoji: '🟡' },
  critico: { label: 'Crítico', color: '#FF4444', emoji: '🔴' },
}

// ─── MÓDULOS DO SISTEMA ──────────────────────────────────────────────────────
export const MODULOS = {
  leads: {
    key: 'leads',
    label: 'Leads',
    descricao: 'Captura e funil de conversão de leads',
    plano: 'basico',
    sempre_ativo: true,
  },
  followup: {
    key: 'followup',
    label: 'Follow-up',
    descricao: 'Revisão manual e envio do follow-up de leads, um a um',
    plano: 'pro',
    sempre_ativo: false,
  },
  indicacoes: {
    key: 'indicacoes',
    label: 'Indicações',
    descricao: 'Programa de referral e ranking de indicadores',
    plano: 'pro',
    sempre_ativo: false,
  },
  retencao: {
    key: 'retencao',
    label: 'Retenção',
    descricao: 'Alunos em risco, renovações e satisfação',
    plano: 'pro',
    sempre_ativo: false,
  },
  gestao: {
    key: 'gestao',
    label: 'Gestão',
    descricao: 'Alunos, turmas, presenças e financeiro',
    plano: 'pro',
    sempre_ativo: false,
  },
  disparos: {
    key: 'disparos',
    label: 'Disparos',
    descricao: 'Campanhas e automações de WhatsApp/email',
    plano: 'enterprise',
    sempre_ativo: false,
  },
  captacao: {
    key: 'captacao',
    label: 'Captação',
    descricao: 'Formulário público e canais de captação',
    plano: 'pro',
    sempre_ativo: false,
  },
  agenda: {
    key: 'agenda',
    label: 'Agenda',
    descricao: 'Aulas experimentais e serviços agendáveis por link público',
    plano: 'pro',
    sempre_ativo: false,
  },
  isca: {
    key: 'isca',
    label: 'ISCA',
    descricao: 'Sugestões diárias de marketing geradas pelos seus dados',
    plano: 'pro',
    sempre_ativo: false,
  },
  loja: {
    key: 'loja',
    label: 'Loja',
    descricao: 'Catálogo público de produtos com checkout pelo WhatsApp',
    plano: 'pro',
    sempre_ativo: false,
  },
}

// ─── CORES ACCENT ────────────────────────────────────────────────────────────
export const COLORS = {
  accent: '#00E5FF',
  accent2: '#0070F3',
  bg: '#0A0A0F',
  success: '#22C55E',
  warning: '#FFB800',
  danger: '#FF4444',
  muted: '#6B7280',
  purple: '#A78BFA',
}

// ─── FOLLOW-UP TIMING ────────────────────────────────────────────────────────
export const FOLLOWUP_TIMING = {
  agora: [1, 3, 24],       // horas
  em_breve: [3, 24, 72],   // horas
  comparando: [24, 168, 336], // horas
}
