import { useState } from 'react'
import { Bell, Menu, ChevronDown, LogOut, Settings, User, AlertTriangle, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { timeAgo } from '../../lib/utils'
import LotaLogo from '../shared/LotaLogo'

export default function Topbar() {
  const {
    box, usuario, logout,
    sidebarCollapsed, setSidebarMobileOpen,
    notificacoes, notificacoesNaoLidas, marcarNotificacaoLida,
    leadsComFollowUp, alunosEmRisco,
  } = useApp()

  const navigate = useNavigate()
  const [showNotif, setShowNotif] = useState(false)
  const [showUser, setShowUser] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const totalAlertas = leadsComFollowUp.length + alunosEmRisco.length

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 'var(--topbar-height)',
      background: 'rgba(10,10,18,0.85)',
      borderBottom: '1px solid var(--border-subtle)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      zIndex: 45,
      paddingLeft: `calc(${sidebarCollapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)'} + 20px)`,
      transition: 'padding-left 0.3s ease',
    }}
    className="topbar"
    >
      {/* Botão hamburger (mobile) */}
      <button
        onClick={() => setSidebarMobileOpen(true)}
        style={{
          background: 'none', border: 'none', color: 'var(--text-secondary)',
          cursor: 'pointer', display: 'none', padding: 4,
        }}
        className="menu-btn"
        id="topbar-menu-btn"
      >
        <Menu size={22} />
      </button>

      {/* Nome do box */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <LotaLogo variant="icon" color="dark" width={22} />
        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
          {box?.nome || 'LOTA'}
        </span>
        {totalAlertas > 0 && (
          <span style={{
            background: 'rgba(255,68,68,0.15)',
            border: '1px solid rgba(255,68,68,0.3)',
            color: '#FF4444',
            borderRadius: 12,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <AlertTriangle size={10} />
            {totalAlertas} alerta{totalAlertas > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Direita: notificações + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

        {/* Notificações */}
        <div style={{ position: 'relative' }}>
          <button
            id="topbar-notif-btn"
            onClick={() => { setShowNotif(!showNotif); setShowUser(false) }}
            style={{
              background: showNotif ? 'var(--bg-card-hover)' : 'none',
              border: '1px solid ' + (showNotif ? 'var(--border-medium)' : 'transparent'),
              borderRadius: 8,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative',
              transition: 'all 0.2s',
            }}
          >
            <Bell size={18} />
            {notificacoesNaoLidas > 0 && (
              <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 8, height: 8, borderRadius: '50%',
                background: '#FF4444',
                border: '2px solid var(--bg-primary)',
                animation: 'pulse-glow 2s infinite',
              }} />
            )}
          </button>

          {/* Dropdown notificações */}
          {showNotif && (
            <div style={{
              position: 'absolute', top: 44, right: 0,
              width: 340,
              background: '#141420',
              border: '1px solid var(--border-medium)',
              borderRadius: 12,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              zIndex: 100,
              overflow: 'hidden',
              animation: 'fadeIn 0.15s ease',
            }}>
              <div style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                fontWeight: 600, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span>Notificações</span>
                {notificacoesNaoLidas > 0 && (
                  <span style={{
                    background: 'rgba(0,229,255,0.12)', color: 'var(--accent)',
                    borderRadius: 12, padding: '1px 8px', fontSize: 12, fontWeight: 700,
                  }}>
                    {notificacoesNaoLidas} novas
                  </span>
                )}
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {notificacoes.length === 0 && (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                    Nenhuma notificação
                  </div>
                )}
                {notificacoes.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => marcarNotificacaoLida(n.id)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      background: n.lida ? 'transparent' : 'rgba(0,229,255,0.03)',
                      transition: 'background 0.15s',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}
                  >
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: n.lida ? 'transparent' : 'var(--accent)',
                      flexShrink: 0, marginTop: 5,
                    }} />
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {n.titulo}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.corpo}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Avatar / usuário */}
        <div style={{ position: 'relative' }}>
          <button
            id="topbar-user-btn"
            onClick={() => { setShowUser(!showUser); setShowNotif(false) }}
            style={{
              background: showUser ? 'var(--bg-card-hover)' : 'none',
              border: '1px solid ' + (showUser ? 'var(--border-medium)' : 'transparent'),
              borderRadius: 8,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              padding: '4px 8px',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.2s',
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 8,
              background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, color: '#000',
            }}>
              {usuario?.nome?.slice(0, 1) || 'M'}
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, maxWidth: 100 }} className="user-name">
              {usuario?.nome?.split(' ')[0] || 'Usuário'}
            </span>
            <ChevronDown size={14} style={{ opacity: 0.6 }} />
          </button>

          {showUser && (
            <div style={{
              position: 'absolute', top: 44, right: 0,
              width: 200,
              background: '#141420',
              border: '1px solid var(--border-medium)',
              borderRadius: 12,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              zIndex: 100,
              overflow: 'hidden',
              animation: 'fadeIn 0.15s ease',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: 13, fontWeight: 600 }}>{usuario?.nome}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{usuario?.email}</p>
              </div>
              <div>
                {[
                  { icon: User, label: 'Perfil', action: () => { setShowUser(false) } },
                  { icon: Settings, label: 'Configurações', action: () => { navigate('/configuracoes'); setShowUser(false) } },
                  { icon: RefreshCw, label: 'Recarregar dados', action: () => { setShowUser(false) } },
                ].map(({ icon: Icon, label, action }) => (
                  <button key={label} onClick={action} style={{
                    width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)', padding: '10px 16px', cursor: 'pointer',
                    textAlign: 'left', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
                <button onClick={handleLogout} style={{
                  width: '100%', background: 'none', border: 'none',
                  color: '#FF4444', padding: '10px 16px', cursor: 'pointer',
                  textAlign: 'left', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,68,68,0.08)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none' }}
                >
                  <LogOut size={14} />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @media (max-width: 767px) {
          .menu-btn { display: flex !important; }
          .topbar { padding-left: 20px !important; }
          .user-name { display: none; }
        }
      `}</style>
    </header>
  )
}
