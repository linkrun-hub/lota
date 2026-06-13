import { describe, it, expect } from 'vitest'
import { gerarSlots, slotDisponivel, diaSemanaBRT } from './agenda'

// Quarta-feira 17/06/2026. BRT = UTC-3 → 07:00 BRT = 10:00 UTC.
const QUARTA = '2026-06-17'
const ONTEM = new Date('2026-06-16T00:00:00Z') // "agora" fixo, antes da data

const servico = { id: 'svc1', duracao_min: 60, capacidade: 10 }
const disp = [
  { service_id: 'svc1', dia_semana: 3, hora_inicio: '07:00', hora_fim: '09:00', vagas: null },
]

describe('diaSemanaBRT', () => {
  it('17/06/2026 é quarta (3)', () => expect(diaSemanaBRT('2026-06-17')).toBe(3))
  it('14/06/2026 é domingo (0)', () => expect(diaSemanaBRT('2026-06-14')).toBe(0))
})

describe('gerarSlots', () => {
  it('janela 07–09h com aulas de 60min → slots 07:00 e 08:00', () => {
    const slots = gerarSlots(servico, disp, [], QUARTA, ONTEM)
    expect(slots.map((s) => s.hora_local)).toEqual(['07:00', '08:00'])
    // 07:00 BRT = 10:00 UTC
    expect(slots[0].inicio).toBe('2026-06-17T10:00:00.000Z')
  })

  it('slot que não cabe na janela não aparece (90min em janela de 2h → só 07:00)', () => {
    const s90 = { ...servico, duracao_min: 90 }
    const slots = gerarSlots(s90, disp, [], QUARTA, ONTEM)
    expect(slots.map((s) => s.hora_local)).toEqual(['07:00'])
  })

  it('dia sem disponibilidade → vazio', () => {
    expect(gerarSlots(servico, disp, [], '2026-06-18', ONTEM)).toEqual([]) // quinta
  })

  it('capacidade desconta agendamentos ativos e ignora cancelados', () => {
    const ags = [
      { service_id: 'svc1', data_hora: '2026-06-17T10:00:00.000Z', status: 'agendado' },
      { service_id: 'svc1', data_hora: '2026-06-17T10:00:00.000Z', status: 'confirmado' },
      { service_id: 'svc1', data_hora: '2026-06-17T10:00:00.000Z', status: 'cancelado' },
    ]
    const slots = gerarSlots(servico, disp, ags, QUARTA, ONTEM)
    expect(slots.find((s) => s.hora_local === '07:00')?.vagas_restantes).toBe(8)
  })

  it('slot lotado some da lista', () => {
    const cap1 = { ...servico, capacidade: 1 }
    const ags = [{ service_id: 'svc1', data_hora: '2026-06-17T10:00:00.000Z', status: 'agendado' }]
    const slots = gerarSlots(cap1, disp, ags, QUARTA, ONTEM)
    expect(slots.map((s) => s.hora_local)).toEqual(['08:00'])
  })

  it('vagas da janela sobrescreve capacidade do serviço', () => {
    const d = [{ ...disp[0], vagas: 3 }]
    const slots = gerarSlots(servico, d, [], QUARTA, ONTEM)
    expect(slots[0].vagas_restantes).toBe(3)
  })

  it('horários no passado não aparecem', () => {
    const agora = new Date('2026-06-17T10:30:00Z') // 07:30 BRT do próprio dia
    const slots = gerarSlots(servico, disp, [], QUARTA, agora)
    expect(slots.map((s) => s.hora_local)).toEqual(['08:00'])
  })
})

describe('slotDisponivel', () => {
  it('aceita slot válido e livre', () => {
    expect(slotDisponivel(servico, disp, [], '2026-06-17T10:00:00.000Z', ONTEM)).toBe(true)
  })
  it('recusa horário fora da grade (07:30)', () => {
    expect(slotDisponivel(servico, disp, [], '2026-06-17T10:30:00.000Z', ONTEM)).toBe(false)
  })
  it('recusa slot lotado', () => {
    const cap1 = { ...servico, capacidade: 1 }
    const ags = [{ service_id: 'svc1', data_hora: '2026-06-17T10:00:00.000Z', status: 'agendado' }]
    expect(slotDisponivel(cap1, disp, ags, '2026-06-17T10:00:00.000Z', ONTEM)).toBe(false)
  })
  it('recusa data no passado', () => {
    const dep = new Date('2026-06-18T00:00:00Z')
    expect(slotDisponivel(servico, disp, [], '2026-06-17T10:00:00.000Z', dep)).toBe(false)
  })
})
