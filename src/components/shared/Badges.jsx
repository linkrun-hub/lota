/**
 * Componentes compartilhados de badge para status e momento de compra
 */
import { STATUS_LEAD, MOMENTO_COMPRA, ORIGEM_LEAD } from '../../lib/constants'

export function StatusBadge({ status, small = false }) {
  const s = STATUS_LEAD[status]
  if (!s) return null
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: small ? '2px 6px' : '3px 10px',
      borderRadius: 20,
      fontSize: small ? 10 : 12,
      fontWeight: 600,
      color: s.color,
      background: s.bg,
      border: `1px solid ${s.color}30`,
      letterSpacing: 0.2,
      whiteSpace: 'nowrap',
    }}>
      {s.emoji} {s.label}
    </span>
  )
}

export function MomentoBadge({ momento, small = false }) {
  const m = MOMENTO_COMPRA[momento]
  if (!m) return null
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: small ? '2px 6px' : '3px 10px',
      borderRadius: 20,
      fontSize: small ? 10 : 12,
      fontWeight: 600,
      color: m.color,
      background: m.bg,
      border: `1px solid ${m.color}30`,
      whiteSpace: 'nowrap',
    }}>
      {m.emoji} {m.label}
    </span>
  )
}

export function OrigemBadge({ origem, small = false }) {
  const o = ORIGEM_LEAD[origem]
  if (!o) return null
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: small ? '2px 6px' : '3px 8px',
      borderRadius: 20,
      fontSize: small ? 10 : 11,
      fontWeight: 500,
      color: 'var(--text-secondary)',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid var(--border-subtle)',
      whiteSpace: 'nowrap',
    }}>
      {o.icon} {o.label}
    </span>
  )
}

export function ScoreBadge({ score }) {
  const color = score >= 80 ? '#22C55E' : score >= 50 ? '#FFB800' : '#6B7280'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      padding: '2px 8px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      color,
      background: `${color}15`,
      border: `1px solid ${color}30`,
    }}>
      {score}pts
    </span>
  )
}
