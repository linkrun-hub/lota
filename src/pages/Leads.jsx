/**
 * Leads.jsx — Módulo central de Leads
 * Toggle Kanban / Tabela + Drawer + Modal de novo lead
 */
import { useState } from 'react'
import { LayoutGrid, List, Plus, Target, Zap, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import LeadKanban from '../components/leads/LeadKanban'
import LeadTable from '../components/leads/LeadTable'
import LeadDrawer from '../components/leads/LeadDrawer'
import NovoLeadModal from '../components/leads/NovoLeadModal'
import { needsFollowUp } from '../lib/utils'

export default function Leads() {
  const { leads, addLead, updateLead, updateLeadStatus, updateLeadNotas, leadsComFollowUp } = useApp()

  const [visao, setVisao] = useState('kanban') // 'kanban' | 'tabela'
  const [leadSelecionado, setLeadSelecionado] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const handleLeadClick = (lead) => {
    setLeadSelecionado(lead)
  }

  const handleStatusChange = async (id, novoStatus) => {
    const updated = await updateLeadStatus(id, novoStatus)
    // Atualiza drawer se estiver aberto no mesmo lead
    if (leadSelecionado?.id === id) {
      setLeadSelecionado((prev) => ({ ...prev, status: novoStatus }))
    }
  }

  const handleNotasChange = async (id, notas) => {
    await updateLeadNotas(id, notas)
    if (leadSelecionado?.id === id) {
      setLeadSelecionado((prev) => ({ ...prev, notas }))
    }
  }

  const handleNovoLead = async (data) => {
    const novo = await addLead(data)
    setLeadSelecionado(novo)
  }

  // Contadores
  const totalLeads = leads.length
  const followUps = leadsComFollowUp.length
  const convertidos = leads.filter((l) => l.status === 'convertido').length

  return (
    <div style={{ height: '100%' }} className="fade-in">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 20,
        flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Target size={22} color="#00E5FF" />
            Leads
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {totalLeads} leads no funil · {convertidos} convertidos · {followUps > 0 && `⚡ ${followUps} follow-up${followUps > 1 ? 's' : ''} pendente${followUps > 1 ? 's' : ''}`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Toggle Kanban / Tabela */}
          <div style={{
            display: 'flex',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}>
            <button
              id="leads-btn-kanban"
              onClick={() => setVisao('kanban')}
              style={{
                background: visao === 'kanban' ? 'rgba(0,229,255,0.12)' : 'transparent',
                border: visao === 'kanban' ? '1px solid rgba(0,229,255,0.2)' : '1px solid transparent',
                borderRadius: 6,
                color: visao === 'kanban' ? '#00E5FF' : 'var(--text-muted)',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
            >
              <LayoutGrid size={14} />
              Kanban
            </button>
            <button
              id="leads-btn-tabela"
              onClick={() => setVisao('tabela')}
              style={{
                background: visao === 'tabela' ? 'rgba(0,229,255,0.12)' : 'transparent',
                border: visao === 'tabela' ? '1px solid rgba(0,229,255,0.2)' : '1px solid transparent',
                borderRadius: 6,
                color: visao === 'tabela' ? '#00E5FF' : 'var(--text-muted)',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s',
              }}
            >
              <List size={14} />
              Tabela
            </button>
          </div>

          {/* Botão novo lead */}
          <button
            id="leads-btn-novo"
            onClick={() => setShowModal(true)}
            className="btn-primary"
            style={{ padding: '8px 16px' }}
          >
            <Plus size={15} />
            Novo lead
          </button>
        </div>
      </div>

      {/* Instruções / Info da tela */}
      <div style={{
        background: 'rgba(0,229,255,0.05)',
        border: '1px solid rgba(0,229,255,0.12)',
        borderRadius: 10,
        padding: '12px 16px',
        marginBottom: 20,
        fontSize: 13,
        color: 'var(--text-secondary)',
        display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <Zap size={14} color="#00E5FF" style={{ marginTop: 1, flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#00E5FF' }}>Como usar:</strong> Arraste os cards entre colunas para mudar o status (Kanban).
          Clique em qualquer lead para abrir o painel de detalhe — lá você pode editar notas, mudar status e contatar pelo WhatsApp.
          Use o toggle acima para alternar entre Kanban e Tabela. Leads com <strong style={{ color: '#FF4444' }}>barra vermelha</strong> precisam de follow-up agora.
        </span>
      </div>

      {/* Alerta follow-ups */}
      {followUps > 0 && (
        <div style={{
          background: 'rgba(255,68,68,0.07)',
          border: '1px solid rgba(255,68,68,0.2)',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
        }}
        onClick={() => setVisao('tabela')}
        >
          <AlertTriangle size={16} color="#FF4444" />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#FF4444' }}>
              ⚡ {followUps} lead{followUps > 1 ? 's' : ''} aguardando follow-up agora
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {leadsComFollowUp.map((l) => l.nome.split(' ')[0]).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Visão Kanban */}
      {visao === 'kanban' && (
        <LeadKanban
          leads={leads}
          onLeadClick={handleLeadClick}
          onStatusChange={handleStatusChange}
          onNovoLead={() => setShowModal(true)}
        />
      )}

      {/* Visão Tabela */}
      {visao === 'tabela' && (
        <LeadTable
          leads={leads}
          onLeadClick={handleLeadClick}
          onNovoLead={() => setShowModal(true)}
        />
      )}

      {/* Drawer de detalhe */}
      {leadSelecionado && (
        <LeadDrawer
          lead={leadSelecionado}
          onClose={() => setLeadSelecionado(null)}
          onStatusChange={handleStatusChange}
          onNotasChange={handleNotasChange}
        />
      )}

      {/* Modal novo lead */}
      {showModal && (
        <NovoLeadModal
          onClose={() => setShowModal(false)}
          onSave={handleNovoLead}
        />
      )}
    </div>
  )
}
