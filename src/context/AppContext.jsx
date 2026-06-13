import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import * as api from '../lib/api'
import { needsFollowUp } from '../lib/utils'
import { MODULOS } from '../lib/constants'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  // ─── Auth ────────────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [usuario, setUsuario] = useState(null)

  // ─── Dados ───────────────────────────────────────────────────────────────
  const [box, setBox] = useState(null)
  const [leads, setLeads] = useState([])
  const [alunos, setAlunos] = useState([])
  const [turmas, setTurmas] = useState([])
  const [indicacoes, setIndicacoes] = useState([])
  const [campanhas, setCampanhas] = useState([])
  const [nps, setNps] = useState([])
  const [notificacoes, setNotificacoes] = useState([])
  const [loading, setLoading] = useState(true)

  // ─── Módulos ─────────────────────────────────────────────────────────────
  const [modulosAtivos, setModulosAtivos] = useState(['leads'])

  // ─── Vertical / Terminologia (Fase 3) ────────────────────────────────────
  const [verticalCfg, setVerticalCfg] = useState(null)

  // ─── Sidebar ─────────────────────────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)

  // ─── Mensagens não lidas ─────────────────────────────────────────────────
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0)
  const pollingMsgRef = useRef(null)

  // ─── Carregar dados ao autenticar ────────────────────────────────────────
  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const [
        boxData,
        leadsData,
        alunosData,
        turmasData,
        indicacoesData,
        campanhasData,
        npsData,
        notificacoesData,
      ] = await Promise.all([
        api.getBox(),
        api.getLeads(),
        api.getAlunos(),
        api.getTurmas(),
        api.getIndicacoes(),
        api.getCampanhas(),
        api.getNps(),
        api.getNotificacoes(),
      ])
      setBox(boxData)
      // Preset do vertical do box (terminologia, retenção, financeiro)
      if (boxData?.vertical) {
        supabase.from('verticals').select('*').eq('slug', boxData.vertical).maybeSingle()
          .then(({ data }) => setVerticalCfg(data || null))
      }
      setLeads(leadsData)
      setAlunos(alunosData)
      setTurmas(turmasData)
      setIndicacoes(indicacoesData)
      setCampanhas(campanhasData)
      setNps(npsData)
      setNotificacoes(notificacoesData)
      setModulosAtivos(boxData.modulos_ativos || ['leads'])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      carregarDados()
    }
  }, [isAuthenticated, carregarDados])

  // Polling de mensagens não lidas (a cada 30s após autenticar e ter box)
  useEffect(() => {
    if (!isAuthenticated) return
    const contarNaoLidas = async () => {
      try {
        const { data: boxData } = await supabase.from('boxes').select('id').limit(1).single()
        if (!boxData?.id) return
        const { count } = await supabase.from('mensagens')
          .select('id', { count: 'exact', head: true })
          .eq('box_id', boxData.id)
          .eq('lida', false)
          .eq('direcao', 'entrada')
        setMensagensNaoLidas(count || 0)
      } catch { /* tabela ainda não existe ou erro de rede */ }
    }
    contarNaoLidas()
    pollingMsgRef.current = setInterval(contarNaoLidas, 30000)
    return () => clearInterval(pollingMsgRef.current)
  }, [isAuthenticated])

  // ─── Auth (Supabase Auth real) ───────────────────────────────────────────
  // Resolve a sessão → busca o profile (box + papel) → libera o app
  const aplicarSessao = useCallback(async (session) => {
    if (!session?.user) {
      setUsuario(null)
      setIsAuthenticated(false)
      api.setBoxId(null)
      return
    }
    let profile = null
    try {
      const { data } = await supabase
        .from('profiles')
        .select('box_id, nome, papel, ativo')
        .eq('id', session.user.id)
        .single()
      profile = data
    } catch { /* profile ainda não existe — segue com defaults */ }

    if (profile && profile.ativo === false) {
      await supabase.auth.signOut()
      return
    }

    api.setBoxId(profile?.box_id ?? null)
    setUsuario({
      id: session.user.id,
      nome: profile?.nome || session.user.user_metadata?.nome || session.user.email,
      email: session.user.email,
      avatar: null,
      role: profile?.papel || 'dono',
      box_id: profile?.box_id ?? null,
    })
    setIsAuthenticated(true)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      await aplicarSessao(session)
      setAuthLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evento, session) => {
      if (evento === 'SIGNED_IN' || evento === 'SIGNED_OUT' || evento === 'USER_UPDATED') {
        aplicarSessao(session)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [aplicarSessao])

  const login = useCallback(async (email, senha) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      const msg = /invalid login credentials/i.test(error.message)
        ? 'E-mail ou senha incorretos.'
        : error.message
      return { ok: false, error: msg }
    }
    await aplicarSessao(data.session)
    return { ok: true }
  }, [aplicarSessao])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setIsAuthenticated(false)
    setUsuario(null)
    setBox(null)
    setLeads([])
    setAlunos([])
    api.setBoxId(null)
  }, [])

  // ─── Lead Actions ────────────────────────────────────────────────────────
  const addLead = useCallback(async (data) => {
    const novo = await api.createLead(data)
    setLeads((prev) => [novo, ...prev])
    return novo
  }, [])

  const updateLead = useCallback(async (id, updates) => {
    const updated = await api.updateLead(id, updates)
    setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)))
    return updated
  }, [])

  const updateLeadStatus = useCallback(async (id, novoStatus) => {
    return updateLead(id, { status: novoStatus })
  }, [updateLead])

  const updateLeadNotas = useCallback(async (id, notas) => {
    return updateLead(id, { notas })
  }, [updateLead])

  // ─── Módulos Actions ─────────────────────────────────────────────────────
  const toggleModulo = useCallback((moduloKey) => {
    const def = MODULOS[moduloKey]
    if (def?.sempre_ativo) return // leads nunca desliga

    setModulosAtivos((prev) => {
      const novos = prev.includes(moduloKey)
        ? prev.filter((m) => m !== moduloKey)
        : [...prev, moduloKey]
      // Persiste no banco (RLS garante que só atualiza o próprio box)
      if (box?.id) {
        supabase.from('boxes').update({ modulos_ativos: novos }).eq('id', box.id)
          .then(({ error }) => { if (error) console.warn('[modulos] não persistiu:', error.message) })
      }
      return novos
    })
  }, [box?.id])

  const isModuloAtivo = useCallback((moduloKey) => {
    return modulosAtivos.includes(moduloKey)
  }, [modulosAtivos])

  // ─── Terminologia por vertical ───────────────────────────────────────────
  // term('cliente', 'Aluno') → "Cliente" no vertical serviços, "Aluno" no crossfit.
  // Ordem: sobrescrita do tenant (boxes.config) → preset do vertical → fallback.
  const term = useCallback((chave, fallback) => {
    return (
      box?.config?.terminologia?.[chave] ??
      verticalCfg?.terminologia?.[chave] ??
      fallback ??
      chave
    )
  }, [box?.config, verticalCfg])

  // ─── Notificações ────────────────────────────────────────────────────────
  const notificacoesNaoLidas = notificacoes.filter((n) => !n.lida).length

  const marcarNotificacaoLida = useCallback(async (id) => {
    await api.marcarNotificacaoLida(id)
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)))
  }, [])

  // ─── Computed ────────────────────────────────────────────────────────────
  const leadsComFollowUp = leads.filter(needsFollowUp)
  const alunosEmRisco = alunos.filter((a) => a.faltas_consecutivas >= 3 && a.status === 'ativo')
  const alunosInadimplentes = alunos.filter((a) => a.status === 'inadimplente')

  const value = {
    // Auth
    isAuthenticated,
    authLoading,
    usuario,
    login,
    logout,

    // Dados
    box,
    leads,
    alunos,
    turmas,
    indicacoes,
    campanhas,
    nps,
    notificacoes,
    loading,

    // Computed
    leadsComFollowUp,
    alunosEmRisco,
    alunosInadimplentes,
    notificacoesNaoLidas,
    mensagensNaoLidas,

    // Lead Actions
    addLead,
    updateLead,
    updateLeadStatus,
    updateLeadNotas,

    // Módulo Actions
    modulosAtivos,
    toggleModulo,
    isModuloAtivo,

    // Vertical / Terminologia
    vertical: verticalCfg,
    term,

    // Notificações
    marcarNotificacaoLida,

    // Layout
    sidebarCollapsed,
    setSidebarCollapsed,
    sidebarMobileOpen,
    setSidebarMobileOpen,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp deve ser usado dentro de AppProvider')
  return ctx
}
