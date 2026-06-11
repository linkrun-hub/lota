import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import * as api from '../lib/api'
import { needsFollowUp } from '../lib/utils'
import { MODULOS } from '../lib/constants'
import { createClient } from '@supabase/supabase-js'

const supabaseCtx = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const AppContext = createContext(null)

export function AppProvider({ children }) {
  // ─── Auth ────────────────────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false)
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
        const { data: boxData } = await supabaseCtx.from('boxes').select('id').limit(1).single()
        if (!boxData?.id) return
        const { count } = await supabaseCtx.from('mensagens')
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

  // ─── Auth Actions ────────────────────────────────────────────────────────
  const login = useCallback((email, senha) => {
    // Mock: qualquer credencial não vazia entra
    if (email && senha) {
      setUsuario({
        id: 'user-001',
        nome: 'Marcos Augusto',
        email,
        avatar: null,
        role: 'dono',
      })
      setIsAuthenticated(true)
      return true
    }
    return false
  }, [])

  const logout = useCallback(() => {
    setIsAuthenticated(false)
    setUsuario(null)
    setBox(null)
    setLeads([])
    setAlunos([])
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
      if (prev.includes(moduloKey)) {
        return prev.filter((m) => m !== moduloKey)
      }
      return [...prev, moduloKey]
    })
  }, [])

  const isModuloAtivo = useCallback((moduloKey) => {
    return modulosAtivos.includes(moduloKey)
  }, [modulosAtivos])

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
