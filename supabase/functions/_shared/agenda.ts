/**
 * supabase/functions/_shared/agenda.ts
 * Motor de slots do Bloco AGENDA — lógica pura, testável com Vitest.
 * Usado pela Edge Function "publico" (página /agendar/:slug).
 *
 * Convenção de fuso: data_hora é armazenada em UTC; o box opera em BRT (UTC-3,
 * Brasil sem horário de verão). hora_inicio/hora_fim das disponibilidades são
 * horários LOCAIS (BRT).
 */

export interface Servico {
  id: string
  duracao_min: number
  capacidade: number
}

export interface Disponibilidade {
  service_id: string
  dia_semana: number // 0=domingo … 6=sábado (no fuso BRT)
  hora_inicio: string // 'HH:MM' ou 'HH:MM:SS' (BRT)
  hora_fim: string
  vagas: number | null // null → usa capacidade do serviço
}

export interface AgendamentoExistente {
  service_id: string
  data_hora: string // ISO UTC
  status: string
}

export interface Slot {
  inicio: string // ISO UTC
  hora_local: string // 'HH:MM' BRT (exibição)
  vagas_restantes: number
}

const BRT_OFFSET_MS = 3 * 60 * 60 * 1000

/** Dia da semana (0-6) de uma data 'YYYY-MM-DD' interpretada em BRT */
export function diaSemanaBRT(dataISO: string): number {
  // meio-dia UTC evita qualquer ambiguidade de borda
  return new Date(`${dataISO}T12:00:00Z`).getUTCDay()
}

function horaParaMin(h: string): number {
  const [hh, mm] = h.split(':').map(Number)
  return hh * 60 + (mm || 0)
}

/** Converte 'YYYY-MM-DD' + minutos locais BRT → Date UTC */
function brtParaUTC(dataISO: string, minutosLocais: number): Date {
  const base = new Date(`${dataISO}T00:00:00Z`).getTime()
  return new Date(base + minutosLocais * 60000 + BRT_OFFSET_MS)
}

/** Contagem de agendamentos ocupando um instante exato */
function ocupados(agendamentos: AgendamentoExistente[], serviceId: string, inicioUTC: Date): number {
  const alvo = inicioUTC.toISOString()
  return agendamentos.filter(
    (a) =>
      a.service_id === serviceId &&
      ['agendado', 'confirmado'].includes(a.status) &&
      new Date(a.data_hora).toISOString() === alvo
  ).length
}

/**
 * Gera os slots livres de um serviço numa data.
 * @param agora — usado para esconder horários no passado (default: agora)
 */
export function gerarSlots(
  servico: Servico,
  disponibilidades: Disponibilidade[],
  agendamentos: AgendamentoExistente[],
  dataISO: string,
  agora: Date = new Date()
): Slot[] {
  const dia = diaSemanaBRT(dataISO)
  const janelas = disponibilidades.filter(
    (d) => d.service_id === servico.id && d.dia_semana === dia
  )
  if (!janelas.length) return []

  const slots: Slot[] = []
  for (const j of janelas) {
    const inicioMin = horaParaMin(j.hora_inicio)
    const fimMin = horaParaMin(j.hora_fim)
    const cap = j.vagas ?? servico.capacidade

    // slots em passos de duracao_min; o slot precisa CABER na janela
    for (let m = inicioMin; m + servico.duracao_min <= fimMin; m += servico.duracao_min) {
      const inicioUTC = brtParaUTC(dataISO, m)
      if (inicioUTC <= agora) continue // sem agendamento no passado

      const usados = ocupados(agendamentos, servico.id, inicioUTC)
      const restantes = cap - usados
      if (restantes > 0) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0')
        const mm = String(m % 60).padStart(2, '0')
        slots.push({
          inicio: inicioUTC.toISOString(),
          hora_local: `${hh}:${mm}`,
          vagas_restantes: restantes,
        })
      }
    }
  }
  return slots.sort((a, b) => a.inicio.localeCompare(b.inicio))
}

/** Valida se um instante específico ainda tem vaga (usado na hora de confirmar) */
export function slotDisponivel(
  servico: Servico,
  disponibilidades: Disponibilidade[],
  agendamentos: AgendamentoExistente[],
  dataHoraUTC: string,
  agora: Date = new Date()
): boolean {
  const d = new Date(dataHoraUTC)
  if (isNaN(d.getTime()) || d <= agora) return false

  // data local BRT do instante
  const local = new Date(d.getTime() - BRT_OFFSET_MS)
  const dataISO = local.toISOString().slice(0, 10)

  return gerarSlots(servico, disponibilidades, agendamentos, dataISO, agora)
    .some((s) => s.inicio === d.toISOString())
}
