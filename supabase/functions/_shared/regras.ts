/**
 * supabase/functions/_shared/regras.ts
 *
 * Regras de negócio PURAS da fila de disparos — sem Deno, sem rede, sem banco.
 * Extraídas de processar-fila/index.ts para serem testáveis com Vitest.
 *
 * IMPORTANTE: processar-fila/index.ts ainda é standalone (cópia das regras).
 * No próximo deploy daquela function (Fase 2), ela passa a importar deste módulo.
 * Até lá, qualquer mudança de regra deve ser feita NOS DOIS lugares.
 */

// ─── Horário comercial (BRT = UTC-3, Brasil sem horário de verão) ─────────────
export function isHorarioComercial(agora: Date = new Date()): boolean {
  const brt = new Date(agora.getTime() - 3 * 60 * 60 * 1000)
  const hora = brt.getUTCHours()
  const dia = brt.getUTCDay()
  return dia >= 1 && dia <= 5 && hora >= 9 && hora < 20
}

// ─── Limite diário de mensagens por box (anti-bloqueio WhatsApp) ──────────────
export const LIMITE_MSGS_DIA_DEFAULT = 30

export function atingiuLimiteDiario(
  enviadasUltimas24h: number,
  limiteBox?: number | null
): boolean {
  const limite = limiteBox || LIMITE_MSGS_DIA_DEFAULT
  return enviadasUltimas24h >= limite
}

// ─── Elegibilidade do destinatário (LGPD / opt-out) ───────────────────────────
export interface Destinatario {
  tipo: 'lead' | 'aluno' | 'dono'
  opt_out?: boolean | null
  lgpd_consent?: boolean | null
}

export function destinatarioElegivel(dest: Destinatario): boolean {
  if (dest.opt_out) return false
  // Lead só recebe mensagem com consentimento LGPD explícito
  if (dest.tipo === 'lead' && !dest.lgpd_consent) return false
  return true
}

// ─── Preenchimento de templates {variavel} ────────────────────────────────────
export function fill(tmpl: string, v: Record<string, unknown>): string {
  return tmpl.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? `{${k}}`))
}

// ─── Sequências de follow-up por momento de compra ────────────────────────────
export const FOLLOWUP_KEYS: Record<string, string[]> = {
  agora:      ['followup_agora_1',      'followup_agora_2',      'followup_agora_3'],
  em_breve:   ['followup_em_breve_1',   'followup_em_breve_2',   'followup_em_breve_3'],
  comparando: ['followup_comparando_1', 'followup_comparando_2', 'followup_comparando_3'],
}

export const FOLLOWUP_HORAS: Record<string, number[]> = {
  agora:      [1,  3,   24],
  em_breve:   [3,  24,  72],
  comparando: [24, 168, 336],
}

export function templateDoStep(momento: string, step: number): string {
  return FOLLOWUP_KEYS[momento]?.[step - 1] ?? 'followup_em_breve_1'
}

export interface AvancoSequencia {
  templateKey: string
  proximoStep: number
  concluida: boolean
  horasAteProximo: number | null
}

/**
 * Dado o step atual de uma sequência ativa que chegou a hora de disparar,
 * retorna o template a enviar agora e o estado seguinte da sequência.
 */
export function avancarSequencia(momento: string, stepAtual: number): AvancoSequencia {
  const templateKey = templateDoStep(momento, stepAtual)
  const proximoStep = stepAtual + 1
  if (proximoStep > 3) {
    return { templateKey, proximoStep, concluida: true, horasAteProximo: null }
  }
  const horas = FOLLOWUP_HORAS[momento]?.[proximoStep - 1] ?? 24
  return { templateKey, proximoStep, concluida: false, horasAteProximo: horas }
}
