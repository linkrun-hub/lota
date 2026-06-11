/**
 * LeadKanban — Visão Kanban do funil de leads
 * Suporta drag & drop entre colunas usando HTML5 Drag API
 */
import { useState } from 'react'
import { Plus } from 'lucide-react'
import { KANBAN_COLUMNS, STATUS_LEAD } from '../../lib/constants'
import LeadCard from './LeadCard'

export default function LeadKanban({ leads, onLeadClick, onStatusChange, onNovoLead }) {
  const [draggedLead, setDraggedLead] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)

  const handleDragStart = (e, lead) => {
    setDraggedLead(lead)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, columnKey) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnKey)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (e, columnKey) => {
    e.preventDefault()
    setDragOverColumn(null)
    if (draggedLead && draggedLead.status !== columnKey) {
      onStatusChange(draggedLead.id, columnKey)
    }
    setDraggedLead(null)
  }

  const handleDragEnd = () => {
    setDraggedLead(null)
    setDragOverColumn(null)
  }

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      overflowX: 'auto',
      paddingBottom: 16,
      minHeight: 'calc(100vh - 180px)',
    }}>
      {KANBAN_COLUMNS.map((col) => {
        const colLeads = leads.filter((l) => l.status === col.key)
        const isOver = dragOverColumn === col.key
        const isDraggingFrom = draggedLead?.status === col.key

        return (
          <div
            key={col.key}
            onDragOver={(e) => handleDragOver(e, col.key)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.key)}
            style={{
              minWidth: 240,
              maxWidth: 270,
              flex: '0 0 252px',
              display: 'flex',
              flexDirection: 'column',
              background: isOver
                ? `${col.color}08`
                : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isOver ? col.color + '40' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 12,
              transition: 'all 0.15s ease',
            }}
          >
            {/* Header da coluna */}
            <div style={{
              padding: '14px 14px 10px',
              borderBottom: `2px solid ${col.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: col.color,
                  boxShadow: `0 0 6px ${col.color}60`,
                }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                  {col.label}
                </span>
              </div>
              <span style={{
                background: `${col.color}18`,
                color: col.color,
                borderRadius: 12,
                padding: '2px 8px',
                fontSize: 12,
                fontWeight: 700,
              }}>
                {colLeads.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{
              flex: 1,
              padding: '10px 10px 8px',
              overflowY: 'auto',
              minHeight: 120,
            }}>
              {colLeads.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '24px 12px',
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  border: isOver ? `2px dashed ${col.color}` : '2px dashed transparent',
                  borderRadius: 8,
                  transition: 'border-color 0.15s',
                }}>
                  {isOver ? '⬇ Soltar aqui' : 'Nenhum lead'}
                </div>
              )}
              {colLeads.map((lead) => (
                <div
                  key={lead.id}
                  style={{ opacity: draggedLead?.id === lead.id ? 0.4 : 1, transition: 'opacity 0.15s' }}
                  onDragEnd={handleDragEnd}
                >
                  <LeadCard
                    lead={lead}
                    onClick={onLeadClick}
                    onDragStart={handleDragStart}
                  />
                </div>
              ))}

              {/* Zona de drop quando há cards */}
              {colLeads.length > 0 && isOver && (
                <div style={{
                  border: `2px dashed ${col.color}`,
                  borderRadius: 8,
                  height: 48,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: col.color,
                  fontSize: 12,
                  marginTop: 4,
                }}>
                  ⬇ Soltar aqui
                </div>
              )}
            </div>

            {/* Add novo lead (só coluna "novo") */}
            {col.key === 'novo' && (
              <button
                id="kanban-btn-novo-lead"
                onClick={onNovoLead}
                style={{
                  margin: '0 10px 10px',
                  padding: '8px',
                  background: 'rgba(0,229,255,0.05)',
                  border: '1px dashed rgba(0,229,255,0.2)',
                  borderRadius: 8,
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#00E5FF'; e.currentTarget.style.borderColor = '#00E5FF55' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.2)' }}
              >
                <Plus size={14} />
                Novo lead
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
