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
  '/atendimento': 'Atendimento',
  '/captacao': 'Captação',
  '/configuracoes': 'Configurações',
  '/agenda': 'Agenda',
  '/isca': 'ISCA',
  '/loja': 'Loja',
  '/admin': 'Painel Admin',
}

export default function AppLayout() {
  const { sidebarCollapsed, loading, box, logout } = useApp()
  const location = useLocation()
  const impersonado = sessionStorage.getItem('lota_impersonado') === '1'

  const sairImpersonacao = async () => {
    sessionStorage.removeItem('lota_impersonado')
    await logout()
    window.location.href = '/login'
  }

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
      {/* Banner de impersonação — sempre visível quando o admin entra como tenant (Regra 10) */}
      {impersonado && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#B91C1C', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          padding: '6px 16px', fontSize: 13, fontWeight: 600,
        }}>
          ⚠️ Você está logado como {box?.nome || 'um tenant'} (impersonação de admin)
          <button
            onClick={sairImpersonacao}
            style={{
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.4)',
              borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 700,
              padding: '2px 10px', cursor: 'pointer',
            }}
          >
            Sair
          </button>
        </div>
      )}
      <Sidebar />
      <div
        className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}
        style={{ transition: 'margin-left 0.3s ease', paddingTop: impersonado ? 32 : 0 }}
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
