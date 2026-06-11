import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { useApp } from '../../context/AppContext'
import LotaLogo from '../shared/LotaLogo'

// Título de cada rota
const PAGE_TITLES = {
  '/': 'Visão Geral',
  '/leads': 'Leads',
  '/indicacoes': 'Indicações',
  '/retencao': 'Retenção',
  '/gestao': 'Gestão',
  '/disparos': 'Disparos',
  '/mensagens': 'Mensagens',
  '/captacao': 'Captação',
  '/configuracoes': 'Configurações',
}

export default function AppLayout() {
  const { sidebarCollapsed, loading } = useApp()
  const location = useLocation()

  // Atualiza title da aba
  useEffect(() => {
    const title = PAGE_TITLES[location.pathname] || 'LOTA'
    document.title = `${title} — LOTA`
  }, [location.pathname])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        background: 'var(--bg-primary)',
      }}>
        <div style={{ animation: 'pulse-glow 2s infinite' }}>
          <LotaLogo variant="icon" color="dark" width={64} />
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Carregando LOTA...</p>
      </div>
    )
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div
        className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}
        style={{ transition: 'margin-left 0.3s ease' }}
        id="main-content"
      >
        <Topbar />
        <main
          className="page-content"
          style={{ minHeight: '100vh' }}
        >
          <Outlet />
        </main>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .main-content {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
