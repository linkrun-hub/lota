/**
 * Gestao.jsx — Gestão do Box: alunos + turmas + financeiro
 */
import { useState } from 'react'
import { Users, LayoutGrid, DollarSign, Search, MessageCircle, Zap, TrendingUp, CheckCircle2, XCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCurrency, formatDate, linkWhatsApp } from '../lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

const STATUS_ALUNO = {
  ativo: { label: 'Ativo', cor: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
  inadimplente: { label: 'Inadimplente', cor: '#FF4444', bg: 'rgba(255,68,68,0.1)' },
  suspenso: { label: 'Suspenso', cor: '#FFB800', bg: 'rgba(255,184,0,0.1)' },
  cancelado: { label: 'Cancelado', cor: '#6B7280', bg: 'rgba(107,114,128,0.1)' },
}

function diasAte(dataStr) {
  return Math.ceil((new Date(dataStr) - new Date()) / 86400000)
}

export default function Gestao() {
  const { alunos, turmas, term } = useApp()
  const [aba, setAba] = useState('alunos')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  const alunosFiltrados = alunos.filter((a) => {
    if (busca && !a.nome.toLowerCase().includes(busca.toLowerCase()) && !a.whatsapp?.includes(busca)) return false
    if (filtroStatus && a.status !== filtroStatus) return false
    return true
  })

  // Financeiro
  const ativos = alunos.filter((a) => a.status === 'ativo')
  const mrr = ativos.reduce((s, a) => s + a.valor_mensalidade, 0)
  const inadimplentes = alunos.filter((a) => a.status === 'inadimplente')
  const emRisco = alunos.filter((a) => a.faltas_consecutivas >= 3 && a.status === 'ativo')
  const renovacoes7d = alunos.filter((a) => {
    const dias = diasAte(a.data_vencimento)
    return dias >= 0 && dias <= 7 && (a.status === 'ativo' || a.status === 'inadimplente')
  })

  // Planos
  const planoCount = {}
  ativos.forEach((a) => { planoCount[a.plano] = (planoCount[a.plano] || 0) + 1 })
  const planoData = Object.entries(planoCount).map(([name, value]) => ({ name, value }))
  const CORES = ['#00E5FF', '#A78BFA', '#22C55E', '#FFB800', '#FF8800']

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }} className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={22} color="#00E5FF" /> Gestão do Box
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {alunos.length} alunos · {ativos.length} ativos · {turmas.length} turmas
        </p>
      </div>

      {/* Info */}
      <div style={{
        background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <Zap size={14} color="#00E5FF" style={{ marginTop: 1, flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#00E5FF' }}>Como testar:</strong> Navegue pelas abas para ver a lista de alunos com busca e filtro,
          o painel de turmas com ocupação visual, e o resumo financeiro do box com MRR, planos e alertas de vencimento.
        </span>
      </div>

      {/* Resumo rápido */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'MRR', value: formatCurrency(mrr), cor: '#22C55E', emoji: '💰' },
          { label: `${term('clientes', 'Alunos')} ativos`, value: ativos.length, cor: '#00E5FF', emoji: '💪' },
          { label: 'Inadimplentes', value: inadimplentes.length, cor: '#FF4444', emoji: '⚠️' },
          { label: 'Em risco (faltas)', value: emRisco.length, cor: '#FFB800', emoji: '🔔' },
          { label: 'Renovam em 7d', value: renovacoes7d.length, cor: '#A78BFA', emoji: '📅' },
        ].map(({ label, value, cor, emoji }) => (
          <div key={label} className="stat-card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 26, marginBottom: 4 }}>{emoji}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: cor }}>{value}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { key: 'alunos', label: term('clientes', 'Alunos'), icon: <Users size={14} /> },
          { key: 'turmas', label: term('grupos', 'Turmas'), icon: <LayoutGrid size={14} /> },
          { key: 'financeiro', label: 'Financeiro', icon: <DollarSign size={14} /> },
        ].map((t) => (
          <button key={t.key} id={`gestao-tab-${t.key}`} onClick={() => setAba(t.key)}
            className={`tab-btn ${aba === t.key ? 'active' : ''}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ABA: ALUNOS */}
      {aba === 'alunos' && (
        <div>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                id="gestao-busca-aluno"
                type="text"
                placeholder="Buscar aluno por nome..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={{ width: '100%', padding: '8px 10px 8px 32px', fontSize: 13, borderRadius: 8 }}
              />
            </div>
            <select
              id="gestao-filtro-status"
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              style={{ padding: '8px 12px', fontSize: 13, borderRadius: 8, cursor: 'pointer' }}
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_ALUNO).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center' }}>
              {alunosFiltrados.length} resultado{alunosFiltrados.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Tabela de alunos */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Aluno', 'WhatsApp', 'Plano', 'Mensalidade', 'Vencimento', 'Faltas', 'NPS', 'Status', ''].map((h) => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {alunosFiltrados.map((aluno, i) => {
                    const st = STATUS_ALUNO[aluno.status] || STATUS_ALUNO.ativo
                    const dias = diasAte(aluno.data_vencimento)
                    const vencendo = dias <= 7 && dias >= 0
                    return (
                      <tr key={aluno.id} style={{ borderBottom: i < alunosFiltrados.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 30, height: 30, borderRadius: 8,
                              background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.2)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, color: '#00E5FF', flexShrink: 0,
                            }}>
                              {aluno.nome.slice(0, 1)}
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{aluno.nome}</p>
                              {aluno.email && <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{aluno.email}</p>}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {aluno.whatsapp?.replace('+55', '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 13, whiteSpace: 'nowrap' }}>{aluno.plano}</td>
                        <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#22C55E', whiteSpace: 'nowrap' }}>
                          {formatCurrency(aluno.valor_mensalidade)}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: 12, whiteSpace: 'nowrap' }}>
                          <span style={{ color: vencendo ? '#FFB800' : aluno.status === 'inadimplente' ? '#FF4444' : 'var(--text-secondary)' }}>
                            {formatDate(aluno.data_vencimento)}
                            {vencendo && <span style={{ fontSize: 10, marginLeft: 4 }}>({dias}d)</span>}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: aluno.faltas_consecutivas >= 5 ? '#FF4444' : aluno.faltas_consecutivas >= 3 ? '#FFB800' : 'var(--text-secondary)' }}>
                            {aluno.faltas_consecutivas}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          {aluno.nps_score != null
                            ? <span style={{ fontSize: 13, fontWeight: 700, color: aluno.nps_score >= 9 ? '#22C55E' : aluno.nps_score >= 7 ? '#FFB800' : '#FF4444' }}>{aluno.nps_score}</span>
                            : <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: st.cor, background: st.bg, borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <a
                            href={linkWhatsApp(aluno.whatsapp)}
                            target="_blank" rel="noopener noreferrer"
                            id={`btn-contatar-aluno-${aluno.id}`}
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: 28, height: 28, borderRadius: 6,
                              background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)',
                              color: '#25D366', textDecoration: 'none',
                            }}
                          >
                            <MessageCircle size={12} />
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA: TURMAS */}
      {aba === 'turmas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {turmas.map((turma) => {
            const ocupacao = Math.round((turma.inscritos / turma.capacidade) * 100)
            const cor = ocupacao >= 90 ? '#FF4444' : ocupacao >= 70 ? '#FFB800' : '#22C55E'
            return (
              <div key={turma.id} className="glass" style={{ borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600 }}>{turma.nome}</h3>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>⏰ {turma.horario}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                      {turma.dias.map((d) => (
                        <span key={d} style={{
                          fontSize: 10, fontWeight: 600,
                          color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 4, padding: '2px 6px',
                        }}>{d}</span>
                      ))}
                    </div>
                    {/* Barra de ocupação */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }}>
                        <div style={{
                          height: '100%', borderRadius: 4,
                          width: `${ocupacao}%`,
                          background: cor,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: cor, minWidth: 70, textAlign: 'right' }}>
                        {turma.inscritos}/{turma.capacidade}
                      </span>
                      <span style={{ fontSize: 11, color: cor, minWidth: 36 }}>{ocupacao}%</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: 28, fontWeight: 800, color: cor }}>{turma.capacidade - turma.inscritos}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>vagas</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ABA: FINANCEIRO */}
      {aba === 'financeiro' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* MRR por plano */}
          <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>📊 Alunos por plano</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planoData} barSize={36}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 12 }} />
                  <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#141420', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Alunos">
                    {planoData.map((_, i) => <Cell key={i} fill={CORES[i % CORES.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Breakdown financeiro */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>💰 Receita por plano</h3>
              {Object.entries(planoCount).map(([plano, count], i) => {
                const valorPlano = ativos.filter((a) => a.plano === plano).reduce((s, a) => s + a.valor_mensalidade, 0)
                return (
                  <div key={plano} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: '1px solid var(--border-subtle)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: CORES[i % CORES.length] }} />
                      <span style={{ fontSize: 13 }}>{plano}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({count})</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#22C55E' }}>{formatCurrency(valorPlano)}</span>
                  </div>
                )
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Total MRR</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#22C55E' }}>{formatCurrency(mrr)}</span>
              </div>
            </div>

            <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>📈 Saúde financeira</h3>
              {[
                { label: 'Alunos pagantes', value: ativos.length, cor: '#22C55E', icon: <CheckCircle2 size={14} /> },
                { label: 'Inadimplentes', value: inadimplentes.length, cor: '#FF4444', icon: <XCircle size={14} /> },
                { label: 'A vencer em 7d', value: renovacoes7d.length, cor: '#FFB800', icon: '📅' },
                { label: 'Ticket médio', value: formatCurrency(mrr / Math.max(ativos.length, 1)), cor: '#A78BFA', icon: <TrendingUp size={14} /> },
                {
                  label: 'Receita em risco',
                  value: formatCurrency(inadimplentes.reduce((s, a) => s + a.valor_mensalidade, 0)),
                  cor: '#FF4444',
                  icon: '⚠️'
                },
              ].map(({ label, value, cor, icon }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: cor }}>
                    {typeof icon === 'string' ? <span>{icon}</span> : icon}
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: cor }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
