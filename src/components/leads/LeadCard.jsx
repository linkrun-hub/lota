/**
 * LeadCard — Card usado no Kanban
 * Arrasta entre colunas, mostra info resumida do lead
 */
import { MessageCircle, Clock, ExternalLink } from 'lucide-react'
import { StatusBadge, MomentoBadge, OrigemBadge } from '../shared/Badges'
import { timeAgo, linkWhatsApp, iniciais, needsFollowUp } from '../../lib/utils'

export default function LeadCard({ lead, onClick, onDragStart }) {
  const followUp = needsFollowUp(lead)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      onClick={() => onClick(lead)}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${followUp ? 'rgba(255,68,68,0.25)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 10,
        padding: '12px 14px',
        cursor: 'grab',
        transition: 'all 0.15s ease',
        userSelect: 'none',
        position: 'relative',
        marginBottom: 8,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.055)'
        e.currentTarget.style.borderColor = followUp ? 'rgba(255,68,68,0.4)' : 'rgba(0,229,255,0.2)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        e.currentTarget.style.borderColor = followUp ? 'rgba(255,68,68,0.25)' : 'rgba(255,255,255,0.07)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
      id={`lead-card-${lead.id}`}
    >
      {/* Indicador de follow-up urgente */}
      {followUp && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: 2,
          background: 'linear-gradient(90deg, #FF4444, #FFB800)',
          borderRadius: '10px 10px 0 0',
        }} />
      )}

      {/* Header: avatar + nome */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #00E5FF22, #0070F322)',
          border: '1px solid rgba(0,229,255,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          color: '#00E5FF',
          flexShrink: 0,
        }}>
          {iniciais(lead.nome)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {lead.nome}
          </p>
          {lead.interesse?.length > 0 && (
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              {lead.interesse.join(', ')}
            </p>
          )}
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
        {lead.momento_compra && <MomentoBadge momento={lead.momento_compra} small />}
        <OrigemBadge origem={lead.origem} small />
      </div>

      {/* Footer: tempo + ações */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
      }}>
        <span style={{
          fontSize: 11,
          color: followUp ? '#FF4444' : 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          fontWeight: followUp ? 600 : 400,
        }}>
          <Clock size={10} />
          {followUp ? '⚡ Follow-up!' : timeAgo(lead.created_at)}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <a
            href={linkWhatsApp(lead.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24, height: 24,
              borderRadius: 6,
              background: 'rgba(37,211,102,0.1)',
              border: '1px solid rgba(37,211,102,0.2)',
              color: '#25D366',
              textDecoration: 'none',
              transition: 'all 0.15s',
            }}
            title="Abrir no WhatsApp"
          >
            <MessageCircle size={12} />
          </a>
        </div>
      </div>
    </div>
  )
}
