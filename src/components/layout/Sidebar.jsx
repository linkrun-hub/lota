import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Target, Gift, RefreshCw, Dumbbell,
  Send, Megaphone, Settings, ChevronLeft, ChevronRight,
  Lock, X,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { MODULOS } from '../../lib/constants'
import LotaLogo from '../shared/LotaLogo'

const NAV_ITEMS = [
  {
    path: '/',
    label: 'Visão Geral',
    icon: LayoutDashboard,
    modulo: null, // sempre visível
    end: true,
  },
  {
    path: '/leads',
    label: 'Leads',
    icon: Target,
    modulo: 'leads',
  },
  {
    path: '/indicacoes',
    label: 'Indicações',
    icon: Gift,
    modulo: 'indicacoes',
  },
  {
    path: '/retencao',
    label: 'Retenção',
    icon: RefreshCw,
    modulo: 'retencao',
  },
  {
    path: '/gestao',
    label: 'Gestão',
    icon: Dumbbell,
    modulo: 'gestao',
  },
  {
    path: '/disparos',
    label: 'Disparos',
    icon: Send,
    modulo: 'disparos',
  },
  {
    path: '/captacao',
    label: 'Captação',
    icon: Megaphone,
    modulo: 'captacao',
  },
  {
    path: '/configuracoes',
    label: 'Configurações',
    icon: Settings,
    modulo: null,
    dividerBefore: true,
  },
]

export default function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, sidebarMobileOpen, setSidebarMobileOpen, isModuloAtivo } = useApp()
  const navigate = useNavigate()

  const isPremium = (moduloKey) => {
    if (!moduloKey) return false
    if (moduloKey === 'leads') return false
    return !isModuloAtivo(moduloKey)
  }

  const handleNavClick = (path) => {
    setSidebarMobileOpen(false)
    navigate(path)
  }

  const sidebarContent = (
    <aside
      style={{
        width: sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)',
        minHeight: '100vh',
        background: 'rgba(10,10,20,0.95)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 50,
        transition: 'width 0.3s ease',
        backdropFilter: 'blur(20px)',
        overflowX: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{
        height: 'var(--topbar-height)',
        display: 'flex',
        alignItems: 'center',
        padding: sidebarCollapsed ? '0 16px' : '0 20px',
        borderBottom: '1px solid var(--border-subtle)',
        gap: 10,
        overflow: 'hidden',
      }}>
        {/* Ícone isolado quando recolhido */}
        {sidebarCollapsed && (
          <LotaLogo variant="icon" color="dark" width={30} />
        )}
        {!sidebarCollapsed && (
          <LotaLogo variant="wordmark" color="dark" width={120} />
        )}
      </div>

      {/* Navegação */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const premium = isPremium(item.modulo)

          return (
            <div key={item.path}>
              {item.dividerBefore && (
                <div style={{
                  height: 1,
                  background: 'var(--border-subtle)',
                  margin: '8px 8px 8px',
                }} />
              )}
              <NavLink
                to={item.path}
                end={item.end}
                onClick={(e) => {
                  e.preventDefault()
                  handleNavClick(item.path)
                }}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: sidebarCollapsed ? '10px 14px' : '10px 12px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  marginBottom: 2,
                  color: isActive ? '#fff' : 'var(--text-muted)',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(0,112,243,0.1))'
                    : 'transparent',
                  borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                })}
                className="nav-item"
              >
                <Icon
                  size={18}
                  style={{ flexShrink: 0, opacity: premium ? 0.5 : 1 }}
                />
                {!sidebarCollapsed && (
                  <>
                    <span style={{
                      fontSize: 14,
                      fontWeight: 500,
                      opacity: premium ? 0.6 : 1,
                      flex: 1,
                    }}>
                      {item.label}
                    </span>
                    {premium && (
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#FFB800',
                        background: 'rgba(255,184,0,0.12)',
                        border: '1px solid rgba(255,184,0,0.2)',
                        borderRadius: 4,
                        padding: '1px 6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                        flexShrink: 0,
                      }}>
                        <Lock size={8} />
                        Premium
                      </span>
                    )}
                  </>
                )}
                {sidebarCollapsed && premium && (
                  <div style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#FFB800',
                  }} />
                )}
              </NavLink>
            </div>
          )
        })}
      </nav>

      {/* Toggle collapse (desktop) */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
          background: 'none',
          border: 'none',
          borderTop: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          transition: 'color 0.2s',
          width: '100%',
        }}
        title={sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {sidebarCollapsed ? <ChevronRight size={16} /> : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', paddingLeft: 4 }}>
            <ChevronLeft size={16} />
            <span style={{ fontSize: 13 }}>Recolher</span>
          </div>
        )}
      </button>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden-mobile">
        {sidebarContent}
      </div>

      {/* Mobile: drawer overlay */}
      {sidebarMobileOpen && (
        <>
          <div
            className="overlay"
            onClick={() => setSidebarMobileOpen(false)}
          />
          <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 60 }}>
            {/* Versão mobile sempre expanded */}
            <aside style={{
              width: 'var(--sidebar-width)',
              minHeight: '100vh',
              background: 'rgba(10,10,20,0.98)',
              borderRight: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              backdropFilter: 'blur(20px)',
            }}>
              {/* Header mobile com close */}
              <div style={{
                height: 'var(--topbar-height)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 20px',
                borderBottom: '1px solid var(--border-subtle)',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <LotaLogo variant="wordmark" color="dark" width={110} />
                </div>
                <button
                  onClick={() => setSidebarMobileOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Nav mobile */}
              <nav style={{ flex: 1, padding: '12px 8px' }}>
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon
                  const premium = isPremium(item.modulo)
                  return (
                    <div key={item.path}>
                      {item.dividerBefore && (
                        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '8px 8px' }} />
                      )}
                      <NavLink
                        to={item.path}
                        end={item.end}
                        onClick={(e) => { e.preventDefault(); handleNavClick(item.path) }}
                        style={({ isActive }) => ({
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 8, textDecoration: 'none',
                          marginBottom: 2,
                          color: isActive ? '#fff' : 'var(--text-muted)',
                          background: isActive ? 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(0,112,243,0.1))' : 'transparent',
                          borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                        })}
                      >
                        <Icon size={18} style={{ flexShrink: 0, opacity: premium ? 0.5 : 1 }} />
                        <span style={{ fontSize: 14, fontWeight: 500, flex: 1, opacity: premium ? 0.6 : 1 }}>
                          {item.label}
                        </span>
                        {premium && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: '#FFB800',
                            background: 'rgba(255,184,0,0.12)', border: '1px solid rgba(255,184,0,0.2)',
                            borderRadius: 4, padding: '1px 6px',
                            display: 'flex', alignItems: 'center', gap: 3,
                          }}>
                            <Lock size={8} />Premium
                          </span>
                        )}
                      </NavLink>
                    </div>
                  )
                })}
              </nav>
            </aside>
          </div>
        </>
      )}

      <style>{`
        @media (min-width: 768px) { .hidden-mobile { display: block !important; } }
        @media (max-width: 767px) { .hidden-mobile { display: none !important; } }
        .nav-item:hover { background: var(--bg-card-hover) !important; color: var(--text-primary) !important; }
      `}</style>
    </>
  )
}
