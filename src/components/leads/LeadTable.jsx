/**
 * LeadTable — Visão tabular dos leads com filtros e busca
 */
import { useState } from 'react'
import { Search, Filter, MessageCircle, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { StatusBadge, MomentoBadge, OrigemBadge } from '../shared/Badges'
import { timeAgo, formatTel, linkWhatsApp } from '../../lib/utils'
import { STATUS_LEAD, MOMENTO_COMPRA, ORIGEM_LEAD } from '../../lib/constants'

const SEL = { padding: '7px 12px', fontSize: 13, borderRadius: 8, cursor: 'pointer', width: '100%' }

function SortIcon({ field, sort }) {
  if (sort.field !== field) return <ChevronsUpDown size={13} style={{ opacity: 0.3 }} />
  return sort.dir === 'asc' ? <ChevronUp size={13} color="#00E5FF" /> : <ChevronDown size={13} color="#00E5FF" />
}

export default function LeadTable({ leads, onLeadClick, onNovoLead }) {
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroMomento, setFiltroMomento] = useState('')
  const [filtroOrigem, setFiltroOrigem] = useState('')
  const [sort, setSort] = useState({ field: 'created_at', dir: 'desc' })

  const handleSort = (field) => {
    setSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === 'asc' ? 'desc' : 'asc',
    }))
  }

  const filtered = leads
    .filter((l) => {
      if (busca && !l.nome.toLowerCase().includes(busca.toLowerCase()) &&
          !l.whatsapp?.includes(busca)) return false
      if (filtroStatus && l.status !== filtroStatus) return false
      if (filtroMomento && l.momento_compra !== filtroMomento) return false
      if (filtroOrigem && l.origem !== filtroOrigem) return false
      return true
    })
    .sort((a, b) => {
      let va = a[sort.field] ?? ''
      let vb = b[sort.field] ?? ''
      if (va < vb) return sort.dir === 'asc' ? -1 : 1
      if (va > vb) return sort.dir === 'asc' ? 1 : -1
      return 0
    })

  const limparFiltros = () => {
    setBusca('')
    setFiltroStatus('')
    setFiltroMomento('')
    setFiltroOrigem('')
  }

  const temFiltros = busca || filtroStatus || filtroMomento || filtroOrigem

  return (
    <div>
      {/* Barra de filtros */}
      <div style={{
        display: 'flex',
        gap: 10,
        marginBottom: 16,
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {/* Busca */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
          <Search size={14} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-muted)', pointerEvents: 'none',
          }} />
          <input
            id="lead-table-busca"
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ ...SEL, paddingLeft: 32, width: '100%' }}
          />
        </div>

        {/* Filtro status */}
        <select
          id="lead-table-filtro-status"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          style={{ ...SEL, flex: '0 1 160px' }}
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LEAD).map(([k, v]) => (
            <option key={k} value={k}>{v.emoji} {v.label}</option>
          ))}
        </select>

        {/* Filtro momento */}
        <select
          id="lead-table-filtro-momento"
          value={filtroMomento}
          onChange={(e) => setFiltroMomento(e.target.value)}
          style={{ ...SEL, flex: '0 1 160px' }}
        >
          <option value="">Todos os momentos</option>
          {Object.entries(MOMENTO_COMPRA).map(([k, v]) => (
            <option key={k} value={k}>{v.emoji} {v.label}</option>
          ))}
        </select>

        {/* Filtro origem */}
        <select
          id="lead-table-filtro-origem"
          value={filtroOrigem}
          onChange={(e) => setFiltroOrigem(e.target.value)}
          style={{ ...SEL, flex: '0 1 160px' }}
        >
          <option value="">Todas as origens</option>
          {Object.entries(ORIGEM_LEAD).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>

        {temFiltros && (
          <button onClick={limparFiltros} className="btn-ghost" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* Contador de resultados */}
      <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
        {filtered.length} lead{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        {temFiltros && ` (de ${leads.length} total)`}
      </div>

      {/* Tabela */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {[
                  { label: 'Nome', field: 'nome' },
                  { label: 'Telefone', field: null },
                  { label: 'Interesse', field: null },
                  { label: 'Momento', field: 'momento_compra' },
                  { label: 'Origem', field: 'origem' },
                  { label: 'Status', field: 'status' },
                  { label: 'Criado', field: 'created_at' },
                  { label: '', field: null },
                ].map(({ label, field }) => (
                  <th
                    key={label || 'acao'}
                    onClick={() => field && handleSort(field)}
                    style={{
                      padding: '12px 14px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      cursor: field ? 'pointer' : 'default',
                      whiteSpace: 'nowrap',
                      background: sort.field === field ? 'rgba(0,229,255,0.04)' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {label}
                      {field && <SortIcon field={field} sort={sort} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14 }}>
                    {temFiltros ? '🔍 Nenhum lead com esses filtros' : '📭 Nenhum lead cadastrado'}
                  </td>
                </tr>
              ) : (
                filtered.map((lead, i) => (
                  <tr
                    key={lead.id}
                    id={`lead-row-${lead.id}`}
                    onClick={() => onLeadClick(lead)}
                    style={{
                      borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >
                    {/* Nome */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 8,
                          background: 'rgba(0,229,255,0.1)',
                          border: '1px solid rgba(0,229,255,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: '#00E5FF', flexShrink: 0,
                        }}>
                          {lead.nome.slice(0, 1)}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{lead.nome}</p>
                          {lead.email && (
                            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lead.email}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Telefone */}
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {formatTel(lead.whatsapp)}
                    </td>

                    {/* Interesse */}
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {lead.interesse?.slice(0, 2).join(', ') || '—'}
                    </td>

                    {/* Momento */}
                    <td style={{ padding: '12px 14px' }}>
                      {lead.momento_compra
                        ? <MomentoBadge momento={lead.momento_compra} small />
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      }
                    </td>

                    {/* Origem */}
                    <td style={{ padding: '12px 14px' }}>
                      <OrigemBadge origem={lead.origem} small />
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge status={lead.status} small />
                    </td>

                    {/* Criado */}
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {timeAgo(lead.created_at)}
                    </td>

                    {/* Ação */}
                    <td style={{ padding: '12px 14px' }}>
                      <a
                        href={linkWhatsApp(lead.whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 30, height: 30,
                          borderRadius: 8,
                          background: 'rgba(37,211,102,0.1)',
                          border: '1px solid rgba(37,211,102,0.2)',
                          color: '#25D366',
                          textDecoration: 'none',
                          transition: 'all 0.15s',
                        }}
                        title="Abrir no WhatsApp"
                      >
                        <MessageCircle size={13} />
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
