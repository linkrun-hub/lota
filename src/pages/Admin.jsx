/**
 * src/pages/Admin.jsx
 * Painel do administrador da plataforma (super_admin) — Fase 1 MVP.
 * Casca fina: toda operação roda na Edge Function "admin" (Regra 9).
 */
import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Shield, RefreshCw, LogIn, Power, KeyRound, Loader,
  Wifi, WifiOff, AlertTriangle, Plus, X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`

async function chamarAdmin(body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(FUNC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro na operação')
  return data
}

const VERTICAIS = [
  ['crossfit', 'Box CrossFit / Hyrox'],
  ['academia', 'Academia tradicional'],
  ['studio', 'Studio Fitness / Pilates'],
  ['servicos', 'Serviços (dedetização, mecânica...)'],
  ['varejo_fitness', 'Revenda de roupa fitness'],
  ['confeitaria', 'Confeitaria / artesanal'],
  ['ecommerce', 'E-commerce'],
]

const WHATS_BADGE = {
  open:          { label: 'Conectado',    color: '#22C55E', Icon: Wifi },
  close:         { label: 'Desconectado', color: '#FF4444', Icon: WifiOff },
  connecting:    { label: 'Conectando',   color: '#FACC15', Icon: RefreshCw },
  sem_instancia: { label: 'Sem instância', color: '#9CA3AF', Icon: WifiOff },
}

export default function Admin() {
  const { usuario } = useApp()
  const [tenants, setTenants] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [acaoEmCurso, setAcaoEmCurso] = useState(null)
  const [senhaGerada, setSenhaGerada] = useState(null)
  const [novoTenant, setNovoTenant] = useState(null)
  const [criandoTenant, setCriandoTenant] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      const { tenants } = await chamarAdmin({ action: 'tenants' })
      setTenants(tenants)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  if (usuario && usuario.role !== 'super_admin') {
    return <Navigate to="/" replace />
  }

  const impersonar = async (box) => {
    setAcaoEmCurso(`imp-${box.id}`)
    try {
      const { link } = await chamarAdmin({
        action: 'impersonate',
        box_id: box.id,
        origin: window.location.origin,
      })
      window.open(link, '_blank')
    } catch (e) {
      setErro(e.message)
    } finally {
      setAcaoEmCurso(null)
    }
  }

  const toggleAtivo = async (box) => {
    const verbo = box.ativo ? 'SUSPENDER' : 'reativar'
    if (!window.confirm(`Tem certeza que quer ${verbo} o tenant "${box.nome}"?`)) return
    setAcaoEmCurso(`tog-${box.id}`)
    try {
      await chamarAdmin({ action: 'toggle-ativo', box_id: box.id, ativo: !box.ativo })
      await carregar()
    } catch (e) {
      setErro(e.message)
    } finally {
      setAcaoEmCurso(null)
    }
  }

  const resetarSenha = async (user, boxNome) => {
    if (!window.confirm(`Gerar nova senha temporária para "${user.nome}" (${boxNome})?`)) return
    setAcaoEmCurso(`pwd-${user.id}`)
    try {
      const { senha_temporaria } = await chamarAdmin({ action: 'reset-senha', user_id: user.id })
      setSenhaGerada({ usuario: user.nome, senha: senha_temporaria })
    } catch (e) {
      setErro(e.message)
    } finally {
      setAcaoEmCurso(null)
    }
  }

  const criarTenant = async (e) => {
    e.preventDefault()
    setErro('')
    setCriandoTenant(true)
    try {
      const r = await chamarAdmin({ action: 'criar-tenant', ...novoTenant })
      setSenhaGerada({ usuario: `${novoTenant.nome} (${r.email})`, senha: r.senha_temporaria })
      setNovoTenant(null)
      await carregar()
    } catch (e2) {
      setErro(e2.message)
    } finally {
      setCriandoTenant(false)
    }
  }

  const btnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
    borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600,
    color: 'var(--text-secondary)', cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={22} color="var(--accent)" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Painel Admin</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Administração da plataforma LOTA — visível apenas para super_admin
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{ ...btnStyle, background: 'rgba(0,229,255,0.12)', color: 'var(--accent)' }}
            onClick={() => setNovoTenant({ vertical: 'crossfit' })}
          >
            <Plus size={14} /> Novo tenant
          </button>
          <button style={btnStyle} onClick={carregar} disabled={carregando}>
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>
      </div>

      {/* Modal de novo tenant (onboarding por vertical) */}
      {novoTenant && (
        <form onSubmit={criarTenant} style={{
          background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.25)',
          borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 700 }}>Novo tenant — qual é o negócio?</p>
            <button type="button" onClick={() => setNovoTenant(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
            <select required style={inputAdm} value={novoTenant.vertical}
              onChange={(e) => setNovoTenant((p) => ({ ...p, vertical: e.target.value }))}>
              {VERTICAIS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input required style={inputAdm} placeholder="Nome do negócio" value={novoTenant.nome ?? ''}
              onChange={(e) => setNovoTenant((p) => ({ ...p, nome: e.target.value }))} />
            <input required style={inputAdm} placeholder="slug (ex: doce-mel)" value={novoTenant.slug ?? ''}
              onChange={(e) => setNovoTenant((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} />
            <input required style={inputAdm} placeholder="Nome do dono" value={novoTenant.dono_nome ?? ''}
              onChange={(e) => setNovoTenant((p) => ({ ...p, dono_nome: e.target.value }))} />
            <input required style={inputAdm} placeholder="WhatsApp do dono (+55...)" value={novoTenant.dono_whatsapp ?? ''}
              onChange={(e) => setNovoTenant((p) => ({ ...p, dono_whatsapp: e.target.value }))} />
            <input required type="email" style={inputAdm} placeholder="E-mail do dono (login)" value={novoTenant.dono_email ?? ''}
              onChange={(e) => setNovoTenant((p) => ({ ...p, dono_email: e.target.value }))} />
          </div>
          <button type="submit" disabled={criandoTenant} style={{
            ...btnStyle, alignSelf: 'flex-start',
            background: 'rgba(0,229,255,0.15)', color: 'var(--accent)',
          }}>
            {criandoTenant ? 'Criando…' : 'Criar tenant com preset do vertical'}
          </button>
        </form>
      )}

      {erro && (
        <div style={{
          background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)',
          borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#FF4444',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={16} /> {erro}
        </div>
      )}

      {senhaGerada && (
        <div style={{
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
          borderRadius: 10, padding: '14px 16px', fontSize: 13,
        }}>
          <p style={{ fontWeight: 700, color: '#22C55E', marginBottom: 4 }}>
            Senha temporária gerada para {senhaGerada.usuario}:
          </p>
          <code style={{ fontSize: 15, color: 'var(--text-primary)' }}>{senhaGerada.senha}</code>
          <p style={{ color: 'var(--text-muted)', marginTop: 6 }}>
            Envie com segurança e oriente a troca no primeiro acesso.
            <button
              style={{ ...btnStyle, marginLeft: 12, padding: '2px 8px' }}
              onClick={() => setSenhaGerada(null)}
            >
              fechar
            </button>
          </p>
        </div>
      )}

      {carregando ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-muted)', padding: 40, justifyContent: 'center' }}>
          <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Carregando tenants…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {tenants.map((t) => {
            const ws = WHATS_BADGE[t.whatsapp_status] ?? { label: t.whatsapp_status, color: '#9CA3AF', Icon: WifiOff }
            return (
              <div key={t.id} style={{
                background: 'var(--bg-card, rgba(255,255,255,0.03))',
                border: '1px solid var(--border-subtle)',
                borderRadius: 14, padding: '18px 20px',
                opacity: t.ativo ? 1 : 0.55,
              }}>
                {/* Linha principal */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 16, fontWeight: 700 }}>{t.nome}</span>
                      <code style={{ fontSize: 12, color: 'var(--text-muted)' }}>/{t.slug}</code>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                        background: t.ativo ? 'rgba(34,197,94,0.12)' : 'rgba(255,68,68,0.12)',
                        color: t.ativo ? '#22C55E' : '#FF4444',
                      }}>
                        {t.ativo ? 'ATIVO' : 'SUSPENSO'}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{t.plano}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                      {t.dono_nome} · {t.dono_email || 'sem e-mail'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button style={btnStyle} onClick={() => impersonar(t)} disabled={acaoEmCurso === `imp-${t.id}`}>
                      <LogIn size={14} /> Entrar como
                    </button>
                    <button
                      style={{ ...btnStyle, color: t.ativo ? '#FF4444' : '#22C55E' }}
                      onClick={() => toggleAtivo(t)}
                      disabled={acaoEmCurso === `tog-${t.id}`}
                    >
                      <Power size={14} /> {t.ativo ? 'Suspender' : 'Reativar'}
                    </button>
                  </div>
                </div>

                {/* Métricas + saúde */}
                <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap', fontSize: 13 }}>
                  <span><strong>{t.leads_total}</strong> <span style={{ color: 'var(--text-muted)' }}>leads</span></span>
                  <span><strong>{t.alunos_total}</strong> <span style={{ color: 'var(--text-muted)' }}>alunos</span></span>
                  <span style={{ color: t.falhas_fila_24h > 0 ? '#FACC15' : 'inherit' }}>
                    <strong>{t.falhas_fila_24h}</strong> <span style={{ color: 'var(--text-muted)' }}>falhas na fila (24h)</span>
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: ws.color }}>
                    <ws.Icon size={14} /> WhatsApp: {ws.label}
                  </span>
                </div>

                {/* Usuários */}
                {t.usuarios.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {t.usuarios.map((u) => (
                      <div key={u.id} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                        padding: '6px 10px', fontSize: 12,
                      }}>
                        <span>{u.nome || 'sem nome'}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{u.papel}</span>
                        <button
                          title="Gerar senha temporária"
                          style={{ ...btnStyle, padding: '3px 8px' }}
                          onClick={() => resetarSenha(u, t.nome)}
                          disabled={acaoEmCurso === `pwd-${u.id}`}
                        >
                          <KeyRound size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const inputAdm = {
  padding: '9px 12px', fontSize: 13, background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)',
}
