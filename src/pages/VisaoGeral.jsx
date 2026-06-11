import { useApp } from '../context/AppContext'
import { Users, TrendingUp, Dumbbell, AlertTriangle, Target, RefreshCw, Gift, BarChart2, Zap } from 'lucide-react'
import { formatCurrency } from '../lib/utils'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { COLORS, STATUS_LEAD, MOMENTO_COMPRA, ORIGEM_LEAD } from '../lib/constants'

const ACCENT = '#00E5FF'
const PIE_COLORS = [ACCENT, '#0070F3', '#A78BFA', '#FFB800', '#22C55E', '#6B7280']

function StatCard({ icon: Icon, label, value, sub, color = ACCENT, trend }) {
  return (
    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={18} color={color} />
        </div>
        {trend !== undefined && (
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: trend >= 0 ? '#22C55E' : '#FF4444',
          }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p style={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  )
}

export default function VisaoGeral() {
  const { leads, alunos, leadsComFollowUp, alunosEmRisco, alunosInadimplentes, indicacoes } = useApp()

  const leadsDoMes = leads.filter((l) => {
    const c = new Date(l.created_at)
    const now = new Date()
    return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear()
  })

  const convertidos = leads.filter((l) => l.status === 'convertido').length
  const taxaConversao = leads.length ? Math.round((convertidos / leads.length) * 100) : 0
  const alunosAtivos = alunos.filter((a) => a.status === 'ativo').length
  const receitaTotal = alunos.filter((a) => a.status === 'ativo').reduce((s, a) => s + a.valor_mensalidade, 0)

  // Dados para gráfico por origem
  const porOrigem = Object.entries(
    leads.reduce((acc, l) => {
      acc[l.origem] = (acc[l.origem] || 0) + 1
      return acc
    }, {})
  ).map(([k, v]) => ({ name: ORIGEM_LEAD[k]?.label || k, value: v }))

  // Dados para gráfico de funil (bar)
  const funilData = ['novo', 'em_conversa', 'qualificado', 'convertido'].map((s) => ({
    name: STATUS_LEAD[s]?.label || s,
    count: leads.filter((l) => l.status === s).length,
    color: STATUS_LEAD[s]?.color,
  }))

  const resumoDia = {
    novos: leadsDoMes.length,
    convertidos,
    emRisco: alunosEmRisco.length,
    inadimplentes: alunosInadimplentes.length,
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }} className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Visão Geral</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Resumo do desempenho do seu box · BraveFit
        </p>
      </div>

      {/* Info da tela */}
      <div style={{
        background: 'rgba(0,229,255,0.05)',
        border: '1px solid rgba(0,229,255,0.12)',
        borderRadius: 10,
        padding: '12px 16px',
        marginBottom: 24,
        fontSize: 13,
        color: 'var(--text-secondary)',
        display: 'flex',
        gap: 8,
        alignItems: 'flex-start',
      }}>
        <Zap size={14} color={ACCENT} style={{ marginTop: 1, flexShrink: 0 }} />
        <span>
          <strong style={{ color: ACCENT }}>Dashboard:</strong> Visão consolidada do funil, alertas e desempenho.
          Os dados são carregados em memória (mock). Clique nos módulos na sidebar para explorar cada seção.
        </span>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 28,
      }}>
        <StatCard icon={Target} label="Leads este mês" value={leadsDoMes.length} sub={`${leads.length} total`} color={ACCENT} trend={12} />
        <StatCard icon={TrendingUp} label="Taxa de conversão" value={`${taxaConversao}%`} sub={`${convertidos} matrículas`} color="#22C55E" trend={5} />
        <StatCard icon={Dumbbell} label="Alunos ativos" value={alunosAtivos} sub={formatCurrency(receitaTotal) + '/mês'} color="#A78BFA" />
        <StatCard icon={AlertTriangle} label="Alunos em risco" value={alunosEmRisco.length} sub={`${alunosInadimplentes.length} inadimplentes`} color="#FF4444" />
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* COLUNA ESQUERDA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Follow-up pendentes */}
          <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={16} color={ACCENT} />
              Leads aguardando follow-up
              {leadsComFollowUp.length > 0 && (
                <span style={{
                  background: 'rgba(255,68,68,0.15)', color: '#FF4444',
                  borderRadius: 12, padding: '1px 8px', fontSize: 12,
                }}>
                  {leadsComFollowUp.length}
                </span>
              )}
            </h3>
            {leadsComFollowUp.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>✅ Todos os follow-ups em dia!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {leadsComFollowUp.slice(0, 4).map((l) => (
                  <div key={l.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'rgba(255,68,68,0.05)',
                    border: '1px solid rgba(255,68,68,0.1)',
                    borderRadius: 8,
                  }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{l.nome}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {MOMENTO_COMPRA[l.momento_compra]?.emoji} {MOMENTO_COMPRA[l.momento_compra]?.label}
                      </p>
                    </div>
                    <span style={{
                      background: 'rgba(255,68,68,0.12)', color: '#FF4444',
                      borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 600,
                    }}>
                      ⚡ Agora
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alunos em risco */}
          <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={16} color="#FF4444" />
              Alunos em risco de cancelamento
            </h3>
            {alunosEmRisco.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>✅ Nenhum aluno em risco!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alunosEmRisco.slice(0, 4).map((a) => (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'rgba(255,68,68,0.05)',
                    border: '1px solid rgba(255,68,68,0.1)',
                    borderRadius: 8,
                  }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{a.nome}</p>
                    <span style={{
                      background: a.faltas_consecutivas >= 5 ? 'rgba(255,68,68,0.15)' : 'rgba(255,184,0,0.12)',
                      color: a.faltas_consecutivas >= 5 ? '#FF4444' : '#FFB800',
                      borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 600,
                    }}>
                      {a.faltas_consecutivas >= 5 ? '🔴' : '🟡'} {a.faltas_consecutivas} faltas
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Gráfico por origem */}
          <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
              📊 Leads por origem
            </h3>
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={porOrigem}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {porOrigem.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#141420',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {porOrigem.map((item, i) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mini funil */}
          <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
              🎯 Funil de conversão
            </h3>
            <div style={{ height: 140 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funilData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip
                    contentStyle={{ background: '#141420', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {funilData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo do dia */}
      <div className="glass" style={{ borderRadius: 12, padding: 20, marginTop: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
          📱 Resumo do dia — como ficaria no WhatsApp
        </h3>
        <div style={{
          background: '#128C7E',
          borderRadius: 12,
          padding: 16,
          maxWidth: 360,
          fontFamily: 'monospace',
          fontSize: 13,
          lineHeight: 1.7,
          color: '#fff',
        }}>
          <p style={{ fontWeight: 700, marginBottom: 8 }}>⚡ LOTA — Resumo do dia</p>
          <p>📥 Leads novos: <strong>{resumoDia.novos}</strong></p>
          <p>✅ Convertidos: <strong>{resumoDia.convertidos}</strong></p>
          <p>⚠️ Alunos em risco: <strong>{resumoDia.emRisco}</strong></p>
          <p>💸 Inadimplentes: <strong>{resumoDia.inadimplentes}</strong></p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
            Enviado às 21:00 via BotConversa
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .visao-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
