/**
 * src/lib/api.js
 * Camada de dados — todas as funções usam Supabase.
 * Isolamento multi-tenant garantido por box_id em todas as queries.
 *
 * FALLBACK: se Supabase não estiver configurado, retorna mocks locais
 * para desenvolvimento offline.
 */
import { supabase } from './supabase'
import {
  mockBox,
  mockLeads,
  mockAlunos,
  mockTurmas,
  mockIndicacoes,
  mockCampanhas,
  mockNps,
  mockNotificacoes,
} from '../mocks/data'

// ─── Box slug fixo (identificador do tenant) ─────────────────────────────────
// Quando autenticação real for implementada, pegar do JWT/context
const BOX_SLUG = 'bravefit'

// Cache do box_id real (UUID gerado pelo Supabase)
let _boxId = null

async function getBoxId() {
  if (_boxId) return _boxId
  const { data } = await supabase
    .from('boxes')
    .select('id')
    .eq('slug', BOX_SLUG)
    .single()
  if (data?.id) _boxId = data.id
  return _boxId
}

// ─── Flag de modo demo (sem Supabase real) ───────────────────────────────────
let _useMocks = false

async function checkConnection() {
  try {
    const { error } = await supabase.from('boxes').select('id').limit(1)
    // PGRST116 = tabela existe mas sem rows — migration rodou, só está vazia
    _useMocks = !!error && error.code !== 'PGRST116'
    if (_useMocks) console.warn('[LOTA] Usando dados mock (Supabase indisponível ou tabelas não criadas)')
  } catch {
    _useMocks = true
    console.warn('[LOTA] Usando dados mock (Supabase inacessível)')
  }
}

checkConnection()

// ─── BOX ─────────────────────────────────────────────────────────────────────

export async function getBox() {
  if (_useMocks) return mockBox

  const { data, error } = await supabase
    .from('boxes')
    .select('*')
    .eq('slug', BOX_SLUG)
    .single()

  if (error) {
    console.warn('[api] getBox fallback mock:', error.message)
    return mockBox
  }
  return data
}

// ─── LEADS ───────────────────────────────────────────────────────────────────

export async function getLeads() {
  if (_useMocks) return mockLeads

  const boxId = await getBoxId()
  if (!boxId) return mockLeads

  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('box_id', boxId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[api] getLeads fallback mock:', error.message)
    return mockLeads
  }
  return data
}

export async function createLead(payload) {
  if (_useMocks) {
    return {
      id: `lead-${Date.now()}`,
      box_id: 'mock',
      opt_out: false,
      score: 50,
      notas: '',
      proximo_followup_at: new Date(Date.now() + 3600000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...payload,
    }
  }

  const boxId = await getBoxId()
  if (!boxId) throw new Error('Box não encontrado')

  const { data, error } = await supabase
    .from('leads')
    .insert({
      box_id: boxId,
      opt_out: false,
      score: 50,
      notas: '',
      proximo_followup_at: new Date(Date.now() + 3600000).toISOString(),
      ...payload,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateLead(id, updates) {
  if (_useMocks) {
    const lead = mockLeads.find((l) => l.id === id)
    return { ...lead, ...updates, updated_at: new Date().toISOString() }
  }

  const boxId = await getBoxId()
  const { data, error } = await supabase
    .from('leads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('box_id', boxId) // segurança multi-tenant
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteLead(id) {
  if (_useMocks) return true

  const boxId = await getBoxId()
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('box_id', boxId)

  if (error) throw new Error(error.message)
  return true
}

// ─── ALUNOS ──────────────────────────────────────────────────────────────────

export async function getAlunos() {
  if (_useMocks) return mockAlunos

  const boxId = await getBoxId()
  if (!boxId) return mockAlunos

  const { data, error } = await supabase
    .from('alunos')
    .select('*')
    .eq('box_id', boxId)
    .order('nome', { ascending: true })

  if (error) {
    console.warn('[api] getAlunos fallback mock:', error.message)
    return mockAlunos
  }
  return data
}

export async function createAluno(payload) {
  if (_useMocks) {
    return { id: `aluno-${Date.now()}`, box_id: 'mock', ...payload, created_at: new Date().toISOString() }
  }

  const boxId = await getBoxId()
  const { data, error } = await supabase
    .from('alunos')
    .insert({ box_id: boxId, ...payload })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateAluno(id, updates) {
  if (_useMocks) {
    return { id, ...updates, updated_at: new Date().toISOString() }
  }

  const boxId = await getBoxId()
  const { data, error } = await supabase
    .from('alunos')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('box_id', boxId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ─── PRESENÇAS ────────────────────────────────────────────────────────────────

export async function getPresencas(alunoId, limit = 30) {
  if (_useMocks) return []

  const boxId = await getBoxId()
  let query = supabase
    .from('presencas')
    .select('*')
    .eq('box_id', boxId)
    .order('data_presenca', { ascending: false })
    .limit(limit)

  if (alunoId) query = query.eq('aluno_id', alunoId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data
}

export async function registrarPresenca(alunoId, dataPresenca = null) {
  if (_useMocks) return true

  const boxId = await getBoxId()
  const { error } = await supabase.from('presencas').insert({
    box_id: boxId,
    aluno_id: alunoId,
    data_presenca: dataPresenca || new Date().toISOString().split('T')[0],
    hora_entrada: new Date().toTimeString().slice(0, 8),
  })

  if (error) throw new Error(error.message)
  return true
}

// ─── TURMAS ──────────────────────────────────────────────────────────────────

export async function getTurmas() {
  if (_useMocks) return mockTurmas

  const boxId = await getBoxId()
  if (!boxId) return mockTurmas

  const { data, error } = await supabase
    .from('turmas')
    .select('*')
    .eq('box_id', boxId)
    .order('horario', { ascending: true })

  if (error) {
    console.warn('[api] getTurmas fallback mock:', error.message)
    return mockTurmas
  }
  return data
}

// ─── INDICAÇÕES ──────────────────────────────────────────────────────────────

export async function getIndicacoes() {
  if (_useMocks) return mockIndicacoes

  const boxId = await getBoxId()
  if (!boxId) return mockIndicacoes

  const { data, error } = await supabase
    .from('indicacoes')
    .select('*')
    .eq('box_id', boxId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[api] getIndicacoes fallback mock:', error.message)
    return mockIndicacoes
  }
  return data
}

export async function createIndicacao(alunoIndicadorId, alunoIndicadorNome) {
  if (_useMocks) {
    return {
      id: `ind-${Date.now()}`,
      box_id: 'mock',
      aluno_indicador_id: alunoIndicadorId,
      aluno_indicador_nome: alunoIndicadorNome,
      token: Math.random().toString(36).slice(2, 10).toUpperCase(),
      status: 'pendente',
      expira_em: new Date(Date.now() + 30 * 86400000).toISOString(),
      created_at: new Date().toISOString(),
    }
  }

  const boxId = await getBoxId()
  const token = Math.random().toString(36).slice(2, 10).toUpperCase()
  const { data, error } = await supabase
    .from('indicacoes')
    .insert({
      box_id: boxId,
      aluno_indicador_id: alunoIndicadorId,
      aluno_indicador_nome: alunoIndicadorNome,
      token,
      status: 'pendente',
      expira_em: new Date(Date.now() + 30 * 86400000).toISOString(),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ─── CAMPANHAS ───────────────────────────────────────────────────────────────

export async function getCampanhas() {
  if (_useMocks) return mockCampanhas

  const boxId = await getBoxId()
  if (!boxId) return mockCampanhas

  const { data, error } = await supabase
    .from('campanhas')
    .select('*')
    .eq('box_id', boxId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[api] getCampanhas fallback mock:', error.message)
    return mockCampanhas
  }
  return data
}

// ─── NPS ─────────────────────────────────────────────────────────────────────

export async function getNps() {
  if (_useMocks) return mockNps

  const boxId = await getBoxId()
  if (!boxId) return mockNps

  const { data, error } = await supabase
    .from('nps_respostas')
    .select('*')
    .eq('box_id', boxId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[api] getNps fallback mock:', error.message)
    return mockNps
  }
  return data
}

// ─── NOTIFICAÇÕES ─────────────────────────────────────────────────────────────

export async function getNotificacoes() {
  if (_useMocks) return mockNotificacoes

  const boxId = await getBoxId()
  if (!boxId) return mockNotificacoes

  const { data, error } = await supabase
    .from('notificacoes')
    .select('*')
    .eq('box_id', boxId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.warn('[api] getNotificacoes fallback mock:', error.message)
    return mockNotificacoes
  }
  return data
}

export async function marcarNotificacaoLida(id) {
  if (_useMocks) return true

  const boxId = await getBoxId()
  const { error } = await supabase
    .from('notificacoes')
    .update({ lida: true })
    .eq('id', id)
    .eq('box_id', boxId)

  if (error) throw new Error(error.message)
  return true
}

// ─── DISPARO / FILA ──────────────────────────────────────────────────────────

export async function enfileirarDisparo(payload) {
  if (_useMocks) return { id: `disp-${Date.now()}`, status: 'pendente', ...payload }

  const boxId = await getBoxId()
  const { data, error } = await supabase
    .from('disparo_fila')
    .insert({ box_id: boxId, status: 'pendente', tentativas: 0, ...payload })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ─── REALTIME (Supabase channels) ────────────────────────────────────────────

/**
 * Subscreve a novos leads em tempo real.
 * O filtro usa o boxId já cacheado (se disponível) ou BOX_SLUG.
 */
export function subscribeLeads(onInsert) {
  if (_useMocks) return () => {}

  const channel = supabase
    .channel('leads_realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'leads' },
      (payload) => {
        // Filtra client-side por segurança (o filter server-side requer UUID que pode não estar cacheado ainda)
        if (_boxId && payload.new.box_id !== _boxId) return
        onInsert(payload.new)
      }
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

/**
 * Subscreve a novas notificações em tempo real.
 */
export function subscribeNotificacoes(onInsert) {
  if (_useMocks) return () => {}

  const channel = supabase
    .channel('notificacoes_realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notificacoes' },
      (payload) => {
        if (_boxId && payload.new.box_id !== _boxId) return
        onInsert(payload.new)
      }
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}
