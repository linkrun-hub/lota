/**
 * LeadDrawer — Painel lateral de detalhe do lead
 * Abre ao clicar num card do kanban ou linha da tabela
 */
import { useState, useEffect } from 'react'
import { X, MessageCircle, Phone, Mail, Clock, Edit3, Save, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react'
import { StatusBadge, MomentoBadge, OrigemBadge, ScoreBadge } from '../shared/Badges'
import { timeAgo, formatTel, formatDate, linkWhatsApp, iniciais, needsFollowUp } from '../../lib/utils'
import { STATUS_LEAD, KANBAN_COLUMNS, ORIGEM_LEAD } from '../../lib/constants'

// Histórico de interações mockado para o lead
function mockHistorico(lead) {
  const historico = [
    { id: 'h1', tipo: 'entrada', texto: `Lead captado via ${ORIGEM_LEAD[lead.origem]?.label || lead.origem}`, data: lead.created_at },
  ]
  if (lead.status !== 'novo') {
    historico.push({ id: 'h2', tipo: 'followup', texto: 'Primeiro follow-up enviado por WhatsApp', data: lead.updated_at })
  }
  if (lead.status === 'qualificado' || lead.status === 'agendado' || lead.status === 'convertido') {
    historico.push({ id: 'h3', tipo: 'qualificado', texto: 'Lead qualificado — interesse confirmado', data: lead.updated_at })
  }
  if (lead.status === 'agendado') {
    historico.push({ id: 'h4', tipo: 'agendado', texto: 'Aula experimental agendada', data: lead.updated_at })
  }
  if (lead.status === 'convertido') {
    historico.push({ id: 'h5', tipo: 'convertido', texto: '🎉 Lead convertido em aluno!', data: lead.updated_at })
  }
  if (lead.status === 'perdido') {
    historico.push({ id: 'h6', tipo: 'perdido', texto: 'Lead marcado como perdido', data: lead.updated_at })
  }
  return historico.reverse()
}

function HistoricoItem({ item }) {
  const cores = {
    entrada: '#00E5FF',
    followup: '#FFB800',
    qualificado: '#A78BFA',
    agendado: '#00E5FF',
    convertido: '#22C55E',
    perdido: '#6B7280',
  }
  const cor = cores[item.tipo] || '#6B7280'
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: cor, flexShrink: 0, marginTop: 5,
        boxShadow: `0 0 6px ${cor}60`,
      }} />
      <div>
        <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item.texto}</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{timeAgo(item.data)}</p>
      </div>
    </div>
  )
}

export default function LeadDrawer({ lead, onClose, onStatusChange, onNotasChange }) {
  const [notas, setNotas] = useState(lead?.notas || '')
  const [editandoNotas, setEditandoNotas] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Sincroniza notas ao trocar de lead
  useEffect(() => {
    setNotas(lead?.notas || '')
    setEditandoNotas(false)
  }, [lead?.id])

  if (!lead) return null

  const followUp = needsFollowUp(lead)
  const historico = mockHistorico(lead)

  const handleSalvarNotas = async () => {
    setSalvando(true)
    await onNotasChange(lead.id, notas)
    await new Promise((r) => setTimeout(r, 400))
    setSalvando(false)
    setEditandoNotas(false)
  }

  const handleStatusChange = (novoStatus) => {
    onStatusChange(lead.id, novoStatus)
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="overlay"
        onClick={onClose}
        style={{ zIndex: 55 }}
      />

      {/* Drawer */}
      <div
        id="lead-drawer"
        style={{
          position: 'fixed',
          top: 0, right: 0,
          width: '100%',
          maxWidth: 440,
          height: '100vh',
          background: '#0F0F1A',
          borderLeft: '1px solid var(--border-medium)',
          zIndex: 60,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s ease',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(0,112,243,0.1))',
            border: '1px solid rgba(0,229,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: '#00E5FF',
            flexShrink: 0,
          }}>
            {iniciais(lead.nome)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, wordBreak: 'break-word' }}>
              {lead.nome}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
              <StatusBadge status={lead.status} small />
              {lead.score && <ScoreBadge score={lead.score} />}
            </div>
          </div>
          <button
            id="lead-drawer-fechar"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* Alerta de follow-up */}
          {followUp && (
            <div style={{
              background: 'rgba(255,68,68,0.08)',
              border: '1px solid rgba(255,68,68,0.2)',
              borderRadius: 10,
              padding: '10px 14px',
              marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <AlertTriangle size={14} color="#FF4444" />
              <p style={{ fontSize: 13, color: '#FF4444', fontWeight: 600 }}>
                ⚡ Follow-up em atraso — contate agora!
              </p>
            </div>
          )}

          {/* Botão WhatsApp */}
          <a
            href={linkWhatsApp(lead.whatsapp, `Olá ${lead.nome.split(' ')[0]}, tudo bem?`)}
            target="_blank"
            rel="noopener noreferrer"
            id="drawer-btn-whatsapp"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: '12px',
              background: 'linear-gradient(135deg, #25D36620, #128C7E20)',
              border: '1px solid rgba(37,211,102,0.25)',
              borderRadius: 10,
              color: '#25D366',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
              marginBottom: 20,
              transition: 'all 0.15s',
            }}
          >
            <MessageCircle size={16} />
            Abrir no WhatsApp
            <ExternalLink size={12} />
          </a>

          {/* Dados do lead */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{
              fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
            }}>
              Informações
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: Phone, label: 'Telefone', value: formatTel(lead.whatsapp) },
                { icon: Mail, label: 'E-mail', value: lead.email || 'Não informado' },
                { label: '🎯 Interesse', value: lead.interesse?.join(', ') || '—' },
                { label: '⏱ Momento', value: <MomentoBadge momento={lead.momento_compra} small /> },
                { label: '📥 Origem', value: <OrigemBadge origem={lead.origem} small /> },
                { label: '📅 Criado em', value: formatDate(lead.created_at) },
                {
                  label: '🔒 Base legal',
                  value: lead.lgpd_consent
                    ? <span style={{ color: '#22C55E', fontSize: 12 }}>✅ LGPD aceita em {formatDate(lead.lgpd_consent_at)}</span>
                    : <span style={{ color: '#FF4444', fontSize: 12 }}>❌ Sem consentimento</span>
                },
                {
                  label: '🚫 Opt-out',
                  value: lead.opt_out
                    ? <span style={{ color: '#FF4444', fontSize: 12 }}>Saiu em {formatDate(lead.opt_out_at)}</span>
                    : <span style={{ color: '#22C55E', fontSize: 12 }}>Ativo</span>
                },
                lead.utm_campaign && { label: '📣 Campanha', value: lead.utm_campaign },
              ].filter(Boolean).map(({ icon: Icon, label, value }) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 0',
                  borderBottom: '1px solid var(--border-subtle)',
                }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {Icon && <Icon size={12} />}
                    {label}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, textAlign: 'right', maxWidth: '60%' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Alterar status */}
          <div style={{ marginBottom: 20 }}>
            <h3 style={{
              fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10,
            }}>
              Alterar status
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {KANBAN_COLUMNS.map((col) => {
                const s = STATUS_LEAD[col.key]
                const isAtual = lead.status === col.key
                return (
                  <button
                    key={col.key}
                    id={`drawer-status-${col.key}`}
                    onClick={() => !isAtual && handleStatusChange(col.key)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: isAtual ? 'default' : 'pointer',
                      color: isAtual ? col.color : 'var(--text-muted)',
                      background: isAtual ? s.bg : 'transparent',
                      border: `1px solid ${isAtual ? col.color + '40' : 'var(--border-subtle)'}`,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      if (!isAtual) {
                        e.currentTarget.style.background = s.bg
                        e.currentTarget.style.color = col.color
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isAtual) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--text-muted)'
                      }
                    }}
                  >
                    {s?.emoji} {col.label}
                    {isAtual && ' ✓'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Notas */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 10,
            }}>
              <h3 style={{
                fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                Notas
              </h3>
              {!editandoNotas ? (
                <button
                  id="drawer-btn-editar-notas"
                  onClick={() => setEditandoNotas(true)}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-muted)', cursor: 'pointer',
                    fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Edit3 size={12} /> Editar
                </button>
              ) : (
                <button
                  id="drawer-btn-salvar-notas"
                  onClick={handleSalvarNotas}
                  disabled={salvando}
                  style={{
                    background: 'none', border: 'none',
                    color: '#22C55E', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {salvando ? '⏳ Salvando...' : <><Save size={12} /> Salvar</>}
                </button>
              )}
            </div>
            {editandoNotas ? (
              <textarea
                id="drawer-textarea-notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Adicione notas sobre o lead..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: 13,
                  resize: 'vertical',
                  lineHeight: 1.6,
                }}
              />
            ) : (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 13,
                color: notas ? 'var(--text-secondary)' : 'var(--text-muted)',
                lineHeight: 1.6,
                minHeight: 60,
                fontStyle: notas ? 'normal' : 'italic',
              }}>
                {notas || 'Nenhuma nota. Clique em "Editar" para adicionar.'}
              </div>
            )}
          </div>

          {/* Histórico */}
          <div>
            <h3 style={{
              fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
            }}>
              Histórico de interações
            </h3>
            <div style={{
              display: 'flex', flexDirection: 'column', gap: 14,
              paddingLeft: 8,
              borderLeft: '1px solid var(--border-subtle)',
            }}>
              {historico.map((item) => (
                <HistoricoItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
