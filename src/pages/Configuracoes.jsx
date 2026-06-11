/**
 * src/pages/Configuracoes.jsx
 * Configurações do box — dados, módulos, WhatsApp (Evolution API) e usuários.
 */
import { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import {
  Layers, Users, Zap, Lock,
  ToggleLeft, ToggleRight, CheckCircle2,
  Wifi, WifiOff, QrCode, RefreshCw, AlertTriangle,
  Phone, Info, ExternalLink, Copy, Check,
} from 'lucide-react'
import { MODULOS } from '../lib/constants'
import { criarInstancia, getQrCode, getStatusConexao, desconectarInstancia } from '../lib/evolutionApi'

const PLANO_LABELS = {
  basico:     { label: 'Básico',     color: '#22C55E' },
  pro:        { label: 'Pro',        color: '#00E5FF' },
  enterprise: { label: 'Enterprise', color: '#A78BFA' },
}

const STATUS_WA = {
  DESCONECTADO:  'desconectado',
  AGUARDANDO_QR: 'aguardando_qr',
  CONECTADO:     'conectado',
  ERRO:          'erro',
}

export default function Configuracoes() {
  const { box, toggleModulo, isModuloAtivo, usuario } = useApp()

  // ─── Estado do WhatsApp ────────────────────────────────────────────────────
  const [statusWa, setStatusWa]         = useState(STATUS_WA.DESCONECTADO)
  const [qrCodeBase64, setQrCodeBase64] = useState(null)
  const [carregandoQr, setCarregandoQr] = useState(false)
  const [erroMsg, setErroMsg]           = useState(null)
  const [numeroConectado, setNumeroConectado] = useState(null)
  const [copiado, setCopiado]           = useState(false)
  const [abaAtiva, setAbaAtiva]         = useState('whatsapp')
  const pollingRef = useRef(null)

  const slug = box?.slug || 'bravefit'

  // Verifica status ao montar (talvez já esteja conectado)
  useEffect(() => {
    verificarStatus()
    return () => clearInterval(pollingRef.current)
  }, [slug])

  const verificarStatus = async () => {
    try {
      const state = await getStatusConexao(slug)
      if (state === 'open') {
        setStatusWa(STATUS_WA.CONECTADO)
        setNumeroConectado(box?.dono_whatsapp || 'Conectado')
        setQrCodeBase64(null)
        clearInterval(pollingRef.current)
      }
    } catch { /* ignora erro silencioso na verificação inicial */ }
  }

  const iniciarPolling = () => {
    clearInterval(pollingRef.current)
    pollingRef.current = setInterval(async () => {
      try {
        const state = await getStatusConexao(slug)
        if (state === 'open') {
          clearInterval(pollingRef.current)
          setStatusWa(STATUS_WA.CONECTADO)
          setNumeroConectado(box?.dono_whatsapp || 'Conectado')
          setQrCodeBase64(null)
        }
      } catch { /* continua polling */ }
    }, 4000) // verifica a cada 4s
  }

  const gerarQrCode = async () => {
    setCarregandoQr(true)
    setErroMsg(null)
    setStatusWa(STATUS_WA.AGUARDANDO_QR)
    try {
      const data = await getQrCode(slug)
      if (data?.base64) {
        setQrCodeBase64(data.base64)
      } else {
        // Tenta novamente após criar instância
        await criarInstancia(slug)
        const data2 = await getQrCode(slug)
        setQrCodeBase64(data2?.base64 || null)
      }
      iniciarPolling()
    } catch (e) {
      setErroMsg('Erro ao gerar QR Code: ' + e.message)
      setStatusWa(STATUS_WA.ERRO)
    } finally {
      setCarregandoQr(false)
    }
  }

  const desconectar = async () => {
    try {
      await desconectarInstancia(slug)
    } catch { /* ignora */ }
    clearInterval(pollingRef.current)
    setStatusWa(STATUS_WA.DESCONECTADO)
    setNumeroConectado(null)
    setQrCodeBase64(null)
  }

  const copiarLink = (texto) => {
    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const ABAs = [
    { key: 'whatsapp', label: '💬 WhatsApp', },
    { key: 'modulos',  label: '⚡ Módulos',  },
    { key: 'box',      label: '🏋 Box',      },
    { key: 'usuarios', label: '👥 Usuários', },
  ]

  return (
    <div style={{ maxWidth: 820, margin: '0 auto' }} className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Configurações</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Gerencie integrações, módulos e dados do box</p>
      </div>

      {/* Banner informativo */}
      <div style={{
        background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 24,
        fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <Info size={14} color="#00E5FF" style={{ marginTop: 1, flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#00E5FF' }}>Configurações:</strong> Conecte o WhatsApp do box para ativar o funil automático de leads,
          gerencie os módulos ativos e os dados do box.
        </span>
      </div>

      {/* Abas de navegação */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 4 }}>
        {ABAs.map((aba) => (
          <button
            key={aba.key}
            id={`aba-config-${aba.key}`}
            onClick={() => setAbaAtiva(aba.key)}
            style={{
              flex: 1, background: abaAtiva === aba.key ? 'rgba(255,255,255,0.07)' : 'none',
              border: abaAtiva === aba.key ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
              borderRadius: 8, padding: '8px 4px', fontSize: 13, fontWeight: 600,
              color: abaAtiva === aba.key ? '#E8E8F0' : 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.2s ease',
            }}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {/* ─── ABA: WHATSAPP ─────────────────────────────────────────────────────── */}
      {abaAtiva === 'whatsapp' && (
        <div className="fade-in">
          {/* Explicação da arquitetura */}
          <div style={{
            background: 'rgba(255,184,0,0.04)', border: '1px solid rgba(255,184,0,0.15)',
            borderRadius: 12, padding: '16px 20px', marginBottom: 20,
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertTriangle size={16} color="#FFB800" style={{ marginTop: 1, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#FFB800', marginBottom: 6 }}>
                  Como funciona o WhatsApp no LOTA
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  O LOTA usa <strong style={{ color: '#E8E8F0' }}>Evolution API</strong> — cada box conecta o <em>próprio número</em> de WhatsApp.
                  Isso garante que as mensagens saiam do número da sua empresa, não de um número genérico.{' '}
                  <strong style={{ color: '#FFB800' }}>Cada box = 1 instância isolada.</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Card principal de conexão */}
          <div className="glass" style={{ borderRadius: 16, padding: 28, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: statusWa === STATUS_WA.CONECTADO ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${statusWa === STATUS_WA.CONECTADO ? '#22C55E' : 'var(--border-subtle)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Phone size={20} color={statusWa === STATUS_WA.CONECTADO ? '#22C55E' : 'var(--text-muted)'} />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700 }}>WhatsApp do Box</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Instância: <code style={{ color: '#00E5FF' }}>{box?.slug || 'bravefit'}</code>
                  </p>
                </div>
              </div>

              {/* Badge de status */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: statusWa === STATUS_WA.CONECTADO
                  ? 'rgba(34,197,94,0.1)'
                  : statusWa === STATUS_WA.AGUARDANDO_QR
                    ? 'rgba(255,184,0,0.1)'
                    : 'rgba(255,68,68,0.08)',
                border: `1px solid ${statusWa === STATUS_WA.CONECTADO ? 'rgba(34,197,94,0.2)' : statusWa === STATUS_WA.AGUARDANDO_QR ? 'rgba(255,184,0,0.2)' : 'rgba(255,68,68,0.15)'}`,
                borderRadius: 20, padding: '6px 14px',
              }}>
                {statusWa === STATUS_WA.CONECTADO
                  ? <><Wifi size={13} color="#22C55E" /><span style={{ fontSize: 12, fontWeight: 700, color: '#22C55E' }}>Conectado</span></>
                  : statusWa === STATUS_WA.AGUARDANDO_QR
                    ? <><RefreshCw size={13} color="#FFB800" style={{ animation: 'spin 1s linear infinite' }} /><span style={{ fontSize: 12, fontWeight: 700, color: '#FFB800' }}>Aguardando scan</span></>
                    : <><WifiOff size={13} color="#FF4444" /><span style={{ fontSize: 12, fontWeight: 700, color: '#FF4444' }}>Desconectado</span></>
                }
              </div>
            </div>

            {/* DESCONECTADO — mostra botão para gerar QR */}
            {statusWa === STATUS_WA.DESCONECTADO && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                }}>
                  <QrCode size={32} color="var(--text-muted)" />
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>
                  Nenhum número conectado
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
                  Clique abaixo para gerar o QR Code e conectar<br />o WhatsApp da sua empresa
                </p>
                <button
                  id="btn-conectar-whatsapp"
                  onClick={gerarQrCode}
                  style={{
                    background: 'linear-gradient(135deg, #16A34A, #22C55E)',
                    color: '#000', fontWeight: 700, fontSize: 14,
                    borderRadius: 10, padding: '12px 24px', border: 'none',
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 8px 24px rgba(34,197,94,0.2)',
                  }}
                >
                  <QrCode size={16} /> Conectar WhatsApp
                </button>
              </div>
            )}

            {/* AGUARDANDO QR */}
            {statusWa === STATUS_WA.AGUARDANDO_QR && (
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  📱 Abra o WhatsApp no seu celular → <strong style={{ color: '#E8E8F0' }}>Dispositivos conectados → Conectar dispositivo</strong>
                </p>
                <div style={{
                  display: 'inline-block',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 16, padding: 16, marginBottom: 16,
                }}>
                  {carregandoQr ? (
                    <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <RefreshCw size={40} color="#00E5FF" style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : qrCodeBase64 ? (
                    <img
                      src={qrCodeBase64.startsWith('data:') ? qrCodeBase64 : `data:image/png;base64,${qrCodeBase64}`}
                      alt="QR Code WhatsApp"
                      width={200} height={200}
                      style={{ borderRadius: 8, display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                      <RefreshCw size={28} color="#FFB800" style={{ animation: 'spin 1s linear infinite' }} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gerando QR...</span>
                    </div>
                  )}
                </div>
                <div style={{
                  background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.12)',
                  borderRadius: 10, padding: '10px 16px', fontSize: 12, color: '#FFB800',
                  display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center',
                }}>
                  <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  Aguardando scan... verificando a cada 4 segundos
                </div>
              </div>
            )}

            {/* ERRO */}
            {statusWa === STATUS_WA.ERRO && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: 13, color: '#FF4444', marginBottom: 16 }}>
                  ⚠️ {erroMsg || 'Erro ao conectar. Tente novamente.'}
                </p>
                <button
                  id="btn-tentar-novamente"
                  onClick={gerarQrCode}
                  style={{
                    background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)',
                    color: '#FF4444', borderRadius: 8, padding: '8px 16px',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {/* CONECTADO */}
            {statusWa === STATUS_WA.CONECTADO && (
              <div>
                <div style={{
                  background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
                  borderRadius: 12, padding: '16px 20px', marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <CheckCircle2 size={24} color="#22C55E" />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#22C55E', marginBottom: 2 }}>
                      WhatsApp conectado!
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      Número: <strong style={{ color: '#E8E8F0' }}>{numeroConectado}</strong>
                    </p>
                  </div>
                </div>

                {/* O que está funcionando */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[
                    { icon: '⚡', label: 'Follow-up automático', status: true },
                    { icon: '🎯', label: 'Qualificação de leads', status: true },
                    { icon: '🔔', label: 'Alertas para o dono', status: true },
                    { icon: '📅', label: 'Resumo diário 21h', status: true },
                    { icon: '🔄', label: 'Retenção de alunos', status: true },
                    { icon: '🎁', label: 'Confirmação de indicações', status: true },
                  ].map((item) => (
                    <div key={item.label} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '8px 12px',
                    }}>
                      <span style={{ fontSize: 14 }}>{item.icon}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</span>
                      <CheckCircle2 size={12} color="#22C55E" style={{ marginLeft: 'auto' }} />
                    </div>
                  ))}
                </div>

                <button
                  id="btn-desconectar-whatsapp"
                  onClick={desconectar}
                  style={{
                    background: 'rgba(255,68,68,0.06)', border: '1px solid rgba(255,68,68,0.15)',
                    color: '#FF4444', fontSize: 13, fontWeight: 600,
                    borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <WifiOff size={14} /> Desconectar número
                </button>
              </div>
            )}
          </div>

          {/* Links úteis do box */}
          <div className="glass" style={{ borderRadius: 16, padding: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>🔗 Links do seu box</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Formulário público', url: `/f/${box?.slug || 'bravefit'}`, desc: 'Compartilhe no Instagram e WhatsApp' },
                { label: 'Landing page', url: '/como-funciona', desc: 'Página de apresentação do LOTA' },
              ].map((link) => (
                <div key={link.url} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '12px 14px',
                  gap: 12,
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{link.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{link.desc}</p>
                    <code style={{ fontSize: 12, color: '#00E5FF', marginTop: 4, display: 'block' }}>
                      www.lota.app.br{link.url}
                    </code>
                  </div>
                  <button
                    id={`btn-copiar-${link.label.replace(' ', '-')}`}
                    onClick={() => copiarLink(`https://www.lota.app.br${link.url}`)}
                    style={{
                      background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)',
                      color: '#00E5FF', borderRadius: 8, padding: '7px 12px',
                      fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                      flexShrink: 0,
                    }}
                  >
                    {copiado ? <><Check size={12} /> Copiado!</> : <><Copy size={12} /> Copiar</>}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Info sobre Evolution API */}
          <div style={{
            marginTop: 16, background: 'rgba(255,255,255,0.015)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '14px 18px',
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <Info size={14} color="var(--text-muted)" style={{ marginTop: 1, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                <strong style={{ color: 'var(--text-secondary)' }}>Sobre a Evolution API:</strong>{' '}
                Cada box tem uma instância isolada. Isso significa que o WhatsApp do BraveFit nunca
                mistura mensagens com outro box. A conexão via QR Code é feita uma única vez — depois,
                o número fica ativo permanentemente até você desconectar.
              </p>
              <a
                href="https://evolution-api.com"
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: 12, color: '#00E5FF', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6 }}
              >
                evolution-api.com <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA: MÓDULOS ──────────────────────────────────────────────────────── */}
      {abaAtiva === 'modulos' && (
        <div className="fade-in">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Object.values(MODULOS).map((mod) => {
              const ativo = isModuloAtivo(mod.key)
              const planoInfo = PLANO_LABELS[mod.plano]
              return (
                <div
                  key={mod.key}
                  className="glass"
                  style={{
                    borderRadius: 12, padding: '16px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                    borderColor: ativo ? 'rgba(0,229,255,0.15)' : 'var(--border-subtle)',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{mod.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: planoInfo.color, background: `${planoInfo.color}18`, border: `1px solid ${planoInfo.color}30`, borderRadius: 4, padding: '1px 6px' }}>
                        {planoInfo.label}
                      </span>
                      {mod.sempre_ativo && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#22C55E', background: 'rgba(34,197,94,0.1)', borderRadius: 4, padding: '1px 6px' }}>
                          Sempre ativo
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{mod.descricao}</p>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {mod.sempre_ativo ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22C55E' }}>
                        <CheckCircle2 size={20} />
                      </div>
                    ) : (
                      <button
                        id={`toggle-modulo-${mod.key}`}
                        onClick={() => toggleModulo(mod.key)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: ativo ? '#00E5FF' : 'var(--text-muted)', transition: 'color 0.2s', padding: 4 }}
                        title={ativo ? 'Desativar módulo' : 'Ativar módulo'}
                      >
                        {ativo ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
            💡 Ativar/desativar módulos atualiza os badges no menu lateral em tempo real.
          </p>
        </div>
      )}

      {/* ─── ABA: BOX ──────────────────────────────────────────────────────────── */}
      {abaAtiva === 'box' && (
        <div className="fade-in">
          <div className="glass" style={{ borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {[
                { label: 'Nome do box',   value: box?.nome },
                { label: 'Slug / URL',    value: box?.slug },
                { label: 'Dono',          value: box?.dono_nome },
                { label: 'WhatsApp',      value: box?.dono_whatsapp },
                { label: 'E-mail',        value: box?.dono_email },
                { label: 'Plano atual',   value: box?.plano?.toUpperCase() },
                { label: 'Limite msgs/dia', value: `${box?.limite_msgs_dia || 30} mensagens` },
                { label: 'Status',        value: box?.ativo ? '🟢 Ativo' : '🔴 Inativo' },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>{value || '—'}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                ✏️ Edição de dados disponível após integração de autenticação completa.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── ABA: USUÁRIOS ─────────────────────────────────────────────────────── */}
      {abaAtiva === 'usuarios' && (
        <div className="fade-in">
          <div className="glass" style={{ borderRadius: 12, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#000' }}>
                  {usuario?.nome?.slice(0, 1)}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{usuario?.nome}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{usuario?.email} · Dono</p>
                </div>
              </div>
              <span style={{ background: 'rgba(34,197,94,0.12)', color: '#22C55E', borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
                Ativo
              </span>
            </div>
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <button className="btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                <Lock size={14} /> Convidar usuário (disponível no plano Pro)
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
