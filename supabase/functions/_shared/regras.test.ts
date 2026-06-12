import { describe, it, expect } from 'vitest'
import {
  isHorarioComercial,
  atingiuLimiteDiario,
  LIMITE_MSGS_DIA_DEFAULT,
  destinatarioElegivel,
  fill,
  templateDoStep,
  avancarSequencia,
} from './regras'

// Datas em UTC — BRT = UTC-3. Ex.: 12:00 UTC = 09:00 BRT.
const utc = (iso: string) => new Date(iso)

describe('isHorarioComercial (janela 09h–20h BRT, seg–sex)', () => {
  it('quarta 09:00 BRT → dentro', () => {
    expect(isHorarioComercial(utc('2026-06-10T12:00:00Z'))).toBe(true)
  })
  it('quarta 08:59 BRT → fora (antes de abrir)', () => {
    expect(isHorarioComercial(utc('2026-06-10T11:59:00Z'))).toBe(false)
  })
  it('quarta 19:59 BRT → dentro (último minuto)', () => {
    expect(isHorarioComercial(utc('2026-06-10T22:59:00Z'))).toBe(true)
  })
  it('quarta 20:00 BRT → fora (janela fecha às 20h)', () => {
    expect(isHorarioComercial(utc('2026-06-10T23:00:00Z'))).toBe(false)
  })
  it('sábado 15:00 BRT → fora (fim de semana)', () => {
    expect(isHorarioComercial(utc('2026-06-13T18:00:00Z'))).toBe(false)
  })
  it('domingo 10:00 BRT → fora (fim de semana)', () => {
    expect(isHorarioComercial(utc('2026-06-14T13:00:00Z'))).toBe(false)
  })
  it('segunda 10:00 BRT → dentro', () => {
    expect(isHorarioComercial(utc('2026-06-15T13:00:00Z'))).toBe(true)
  })
  it('virada de dia UTC não confunde o dia BRT (sexta 21:00 BRT = sábado 00:00 UTC)', () => {
    // 2026-06-13T00:00:00Z é sábado em UTC, mas sexta 21:00 em BRT → fora por horário, não por dia
    expect(isHorarioComercial(utc('2026-06-13T00:00:00Z'))).toBe(false)
  })
})

describe('atingiuLimiteDiario (anti-bloqueio WhatsApp)', () => {
  it('29 enviadas com limite default 30 → ainda pode', () => {
    expect(atingiuLimiteDiario(29, null)).toBe(false)
  })
  it('30 enviadas com limite default → bloqueia', () => {
    expect(atingiuLimiteDiario(30, null)).toBe(true)
  })
  it('respeita limite customizado do box (50)', () => {
    expect(atingiuLimiteDiario(30, 50)).toBe(false)
    expect(atingiuLimiteDiario(50, 50)).toBe(true)
  })
  it('limite 0 ou null cai no default', () => {
    expect(atingiuLimiteDiario(LIMITE_MSGS_DIA_DEFAULT - 1, 0)).toBe(false)
    expect(atingiuLimiteDiario(LIMITE_MSGS_DIA_DEFAULT, 0)).toBe(true)
  })
})

describe('destinatarioElegivel (LGPD / opt-out)', () => {
  it('lead com consentimento e sem opt-out → elegível', () => {
    expect(destinatarioElegivel({ tipo: 'lead', lgpd_consent: true, opt_out: false })).toBe(true)
  })
  it('lead SEM consentimento LGPD → bloqueado', () => {
    expect(destinatarioElegivel({ tipo: 'lead', lgpd_consent: false, opt_out: false })).toBe(false)
  })
  it('lead com opt-out → bloqueado mesmo com consentimento', () => {
    expect(destinatarioElegivel({ tipo: 'lead', lgpd_consent: true, opt_out: true })).toBe(false)
  })
  it('aluno sem opt-out → elegível (não exige lgpd_consent)', () => {
    expect(destinatarioElegivel({ tipo: 'aluno', opt_out: false })).toBe(true)
  })
  it('aluno com opt-out → bloqueado', () => {
    expect(destinatarioElegivel({ tipo: 'aluno', opt_out: true })).toBe(false)
  })
  it('dono → sempre elegível', () => {
    expect(destinatarioElegivel({ tipo: 'dono' })).toBe(true)
  })
})

describe('fill (templates {variavel})', () => {
  it('substitui variáveis presentes', () => {
    expect(fill('Oi {nome}, bem-vindo ao {box_nome}!', { nome: 'Léo', box_nome: 'BraveFit' }))
      .toBe('Oi Léo, bem-vindo ao BraveFit!')
  })
  it('variável ausente fica visível como {chave} (não vira undefined)', () => {
    expect(fill('Oi {nome}!', {})).toBe('Oi {nome}!')
  })
})

describe('sequências de follow-up', () => {
  it('momento "agora": templates e horas corretos em cada step', () => {
    expect(templateDoStep('agora', 1)).toBe('followup_agora_1')
    expect(templateDoStep('agora', 3)).toBe('followup_agora_3')
  })
  it('momento desconhecido cai no fallback em_breve_1', () => {
    expect(templateDoStep('inexistente', 1)).toBe('followup_em_breve_1')
  })
  it('step 1 de "agora" → envia 1, agenda step 2 em 3h', () => {
    const r = avancarSequencia('agora', 1)
    expect(r).toEqual({ templateKey: 'followup_agora_1', proximoStep: 2, concluida: false, horasAteProximo: 3 })
  })
  it('step 2 de "comparando" → envia 2, agenda step 3 em 336h (14 dias)', () => {
    const r = avancarSequencia('comparando', 2)
    expect(r).toEqual({ templateKey: 'followup_comparando_2', proximoStep: 3, concluida: false, horasAteProximo: 336 })
  })
  it('step 3 (último) → envia 3 e conclui a sequência', () => {
    const r = avancarSequencia('em_breve', 3)
    expect(r.templateKey).toBe('followup_em_breve_3')
    expect(r.concluida).toBe(true)
    expect(r.horasAteProximo).toBeNull()
  })
})
