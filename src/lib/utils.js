import { FOLLOWUP_TIMING } from './constants'

/**
 * Formata um número de telefone brasileiro
 * @param {string} tel - Telefone em qualquer formato
 * @returns {string} Formatado como (XX) XXXXX-XXXX
 */
export function formatTel(tel) {
  if (!tel) return ''
  const digits = tel.replace(/\D/g, '')
  // Remove código país se houver
  const local = digits.startsWith('55') ? digits.slice(2) : digits
  if (local.length === 11) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`
  }
  if (local.length === 10) {
    return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  }
  return tel
}

/**
 * Retorna tempo relativo desde uma data
 * @param {string|Date} date
 * @returns {string} "há X minutos/horas/dias"
 */
export function timeAgo(date) {
  if (!date) return ''
  const now = new Date()
  const past = new Date(date)
  const diffMs = now - past
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)
  const diffW = Math.floor(diffD / 7)
  const diffM = Math.floor(diffD / 30)

  if (diffMin < 1) return 'agora mesmo'
  if (diffMin < 60) return `há ${diffMin}min`
  if (diffH < 24) return `há ${diffH}h`
  if (diffD === 1) return 'ontem'
  if (diffD < 7) return `há ${diffD} dias`
  if (diffW === 1) return 'há 1 semana'
  if (diffW < 4) return `há ${diffW} semanas`
  if (diffM === 1) return 'há 1 mês'
  return `há ${diffM} meses`
}

/**
 * Formata uma data para exibição em português BR
 * @param {string|Date} date
 * @returns {string} "10/06/2026"
 */
export function formatDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR')
}

/**
 * Retorna o próximo horário de follow-up (em ms a partir de agora)
 * baseado no momento de compra e step atual
 */
export function getNextFollowUp(momento, step) {
  const timing = FOLLOWUP_TIMING[momento] || FOLLOWUP_TIMING.comparando
  const hours = timing[step] || timing[timing.length - 1]
  const ms = hours * 3600000
  return new Date(Date.now() + ms)
}

/**
 * Verifica se um lead precisa de follow-up agora
 * @param {Object} lead
 * @returns {boolean}
 */
export function needsFollowUp(lead) {
  if (!lead) return false
  if (lead.status === 'convertido' || lead.status === 'perdido' || lead.status === 'opt_out') {
    return false
  }
  if (!lead.proximo_followup_at) return false
  return new Date(lead.proximo_followup_at) <= new Date()
}

/**
 * Gera um ID único simples (para mocks)
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Abrevia nome (primeiro + último)
 */
export function abreviarNome(nome) {
  if (!nome) return ''
  const partes = nome.trim().split(' ')
  if (partes.length === 1) return partes[0]
  return `${partes[0]} ${partes[partes.length - 1]}`
}

/**
 * Iniciais do nome (para avatar)
 */
export function iniciais(nome) {
  if (!nome) return '?'
  const partes = nome.trim().split(' ')
  if (partes.length === 1) return partes[0][0].toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

/**
 * Retorna nível de risco de retenção de um aluno
 */
export function nivelRisco(aluno) {
  if (aluno.faltas_consecutivas >= 5) return 'critico'
  if (aluno.faltas_consecutivas >= 3) return 'atencao'
  return null
}

/**
 * Calcula dias até o vencimento
 */
export function diasAteVencimento(dataVencimento) {
  const hoje = new Date()
  const venc = new Date(dataVencimento)
  const diff = Math.ceil((venc - hoje) / 86400000)
  return diff
}

/**
 * Link do WhatsApp
 */
export function linkWhatsApp(tel, mensagem = '') {
  const digits = tel.replace(/\D/g, '')
  const numero = digits.startsWith('55') ? digits : `55${digits}`
  const texto = mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''
  return `https://wa.me/${numero}${texto}`
}

/**
 * Formata valor monetário em reais
 */
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
