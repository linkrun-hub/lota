import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as api from '../lib/api'
import { needsFollowUp } from '../lib/utils'
import { MODULOS } from '../lib/constants'

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
