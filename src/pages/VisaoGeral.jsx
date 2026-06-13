/**
 * VisaoGeral.jsx — Dashboard Avançado LOTA
 * KPIs em tempo real, funil, crescimento, ROI por canal, alertas
 */
import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/utils'
import { ORIGEM_LEAD, STATUS_LEAD } from '../lib/constants'
import {
  TrendingUp, TrendingDown, Users, Dumbbell, AlertTriangle,
  Target, Gift, DollarSign, Zap, ChevronRight, Activity,
  BarChart2, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'

// ─── Paleta ────────────────────────────────────────────────────────────────────
const ACCENT   = '#00E5FF'
const SUCCESS  = '#22C55E'
const WARNING  = '#FFB800'
const DANGER   = '#FF4444'
const PURPLE   = '#A78BFA'
const BLUE     = '#0070F3'
const MUTED    = 'rgba(255,255,255,0.12)'

const CANAL_CORES = {
  whatsapp:       '#25D366',
  lead_ads_meta:  '#1877F2',
  lead_ads_google:'#EA4335',
  landing_page:   ACCENT,
  indicacao:      PURPLE,
  manual:         '#6B7280',
  outro:          '#9CA3AF',
}

// ─── Meses últimos 6 ──────────────────────────────────────────────────────────
function ultimosMeses(n = 6) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - (n - 1 - i))
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      month: d.getMonth(),
      year: d.getFullYear(),
    }
  })
}

// ─── Componentes ─────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color = ACCENT, delta, onClick }) {
  const positive = delta === undefined ? null : delta >= 0
  return (
    <div
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid rgba(255,255,255,0.07)`,
        borderRadius: 16, padding: '20px 22px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s, transform 0.15s',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = color + '44' }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: color + '15', border: `1px solid ${color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={17} color={color} />
        </div>
        {delta !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700,
            color: positive ? SUCCESS : DANGER }}>
            {positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
      <div>
        <p style={{ fontSize: 26, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{sub}</p>}
      </div>
    </div>
  )
}

function SectionTitle({ icon: Icon, title, sub, color = ACCENT }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: color + '15', border: `1px solid ${color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={15} color={color} />
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 700 }}>{title}</p>
        {sub && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{sub}</p>}
      </div>
    </div>
  )
}

const TOOLTIP_STYLE = {
  contentStyle: {
    background: '#0D0D18',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, fontSize: 12, color: '#E8E8F0',
  },
  labelStyle: { color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  itemStyle: { color: '#E8E8F0' },
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function VisaoGeral() {
  const { leads, alunos, indicacoes, term } = useApp()
  const [periodo, setPeriodo] = useState('mes') // mes | trimestre | ano

  // ─── Filtro temporal ──────────────────────────────────────────────────────
  const agora = new Date()
  const filtrarPorPeriodo = (arr, campo = 'created_at') => {
    const inicio = new Date(agora)
    if (periodo === 'mes')      inicio.setDate(1)
    if (periodo === 'trimestre') inicio.setMonth(agora.getMonth() - 3)
    if (periodo === 'ano')      inicio.setMonth(0), inicio.setDate(1)
    return arr.filter(x => new Date(x[campo]) >= inicio)
  }

  const leadsP     = useMemo(() => filtrarPorPeriodo(leads), [leads, periodo])
  const alunosAtivos  = alunos.filter(a => a.status === 'ativo')
  const convertidos   = leads.filter(l => l.status === 'convertido')
  const inadimplentes = alunos.filter(a => a.status === 'inadimplente')
  const emRisco       = alunos.filter(a => a.faltas_consecutivas >= 3 && a.status === 'ativo')

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const mrr          = alunosAtivos.reduce((s, a) => s + (a.valor_mensalidade || 0), 0)
  const arr          = mrr * 12
  const taxaConversao = leads.length ? Math.round((convertidos.length / leads.length) * 100) : 0
  const churnRate    = alunos.length ? Math.round(((inadimplentes.length + alunos.filter(a=>a.status==='cancelado').length) / alunos.length) * 100) : 0
  const ticketMedio  = alunosAtivos.length ? mrr / alunosAtivos.length : 0
  const ltv          = churnRate > 0 ? Math.round(ticketMedio / (churnRate / 100)) : ticketMedio * 12
  const indicacoesConv = indicacoes.filter(i => i.status === 'convertido').length

  // ─── Crescimento mensal (6 meses) ────────────────────────────────────────
  const meses = ultimosMeses(6)
  const crescimentoData = meses.map(m => {
    const leadsM = leads.filter(l => {
      const d = new Date(l.created_at)
      return d.getMonth() === m.month && d.getFullYear() === m.year
    })
    const convM = leadsM.filter(l => l.status === 'convertido')
    return {
      name: m.label,
      leads: leadsM.length,
      conversoes: convM.length,
      receita: alunos.filter(a => {
        const d = new Date(a.created_at)
        return d.getMonth() === m.month && d.getFullYear() === m.year
      }).reduce((s, a) => s + (a.valor_mensalidade || 0), 0),
    }
  })

  // ─── Funil de conversão ───────────────────────────────────────────────────
  const ETAPAS = ['novo', 'em_conversa', 'qualificado', 'agendado', 'convertido']
  const funilData = ETAPAS.map((s, i) => {
    const count = leads.filter(l => l.status === s).length
    const prev  = i === 0 ? leads.length : leads.filter(l => l.status === ETAPAS[i - 1]).length
    const pct   = prev > 0 ? Math.round((count / leads.length) * 100) : 0
    return { stage: STATUS_LEAD[s]?.label || s, count, pct, color: STATUS_LEAD[s]?.color || ACCENT }
  })
  const maxFunil = Math.max(...funilData.map(f => f.count), 1)

  // ─── ROI por canal ────────────────────────────────────────────────────────
  const roiCanal = Object.entries(
    leads.reduce((acc, l) => {
      if (!acc[l.origem]) acc[l.origem] = { leads: 0, conv: 0 }
      acc[l.origem].leads++
      if (l.status === 'convertido') acc[l.origem].conv++
      return acc
    }, {})
  ).map(([k, v]) => ({
    name: ORIGEM_LEAD[k]?.label || k,
    leads: v.leads,
    conversoes: v.conv,
    taxa: v.leads > 0 ? Math.round((v.conv / v.leads) * 100) : 0,
    receita: alunos.filter(a => {
      const lead = leads.find(l => l.id === a.lead_id)
      return lead?.origem === k && a.status === 'ativo'
    }).reduce((s, a) => s + (a.valor_mensalidade || 0), 0),
    color: CANAL_CORES[k] || '#6B7280',
  })).sort((a, b) => b.conversoes - a.conversoes)

  // ─── Ranking de indicadores ───────────────────────────────────────────────
  const rankingMap = {}
  indicacoes.forEach(ind => {
    const key = ind.aluno_indicador_id
    if (!rankingMap[key]) {
      rankingMap[key] = { nome: ind.aluno_indicador?.nome || '—', total: 0, conv: 0 }
    }
    rankingMap[key].total++
    if (ind.status === 'convertido') rankingMap[key].conv++
  })
  const ranking = Object.values(rankingMap).sort((a, b) => b.conv - a.conv).slice(0, 5)

  // ─── Alertas ──────────────────────────────────────────────────────────────
  const alertas = [
    ...emRisco.slice(0, 3).map(a => ({
      tipo: a.faltas_consecutivas >= 5 ? 'critico' : 'atencao',
      msg: `${a.nome} — ${a.faltas_consecutivas} faltas consecutivas`,
      icon: '🏃',
    })),
    ...inadimplentes.slice(0, 3).map(a => ({
      tipo: 'critico',
      msg: `${a.nome} — plano inadimplente`,
      icon: '💸',
    })),
    ...leads.filter(l => l.status === 'novo').slice(0, 2).map(l => ({
      tipo: 'info',
      msg: `Lead novo sem contato: ${l.nome}`,
      icon: '👤',
    })),
  ]

  const alertaCor = { critico: DANGER, atencao: WARNING, info: ACCENT }
  const alertaBg  = { critico: 'rgba(255,68,68,0.06)', atencao: 'rgba(255,184,0,0.06)', info: 'rgba(0,229,255,0.06)' }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }} className="fade-in">

      {/* ─── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            Desempenho em tempo real · {agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {/* Seletor de período */}
        <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4 }}>
          {[
            { key: 'mes',       label: 'Este mês' },
            { key: 'trimestre', label: 'Trimestre' },
            { key: 'ano',       label: 'Este ano' },
          ].map(p => (
            <button key={p.key} id={`btn-periodo-${p.key}`} onClick={() => setPeriodo(p.key)} style={{
              padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: periodo === p.key ? 'rgba(0,229,255,0.12)' : 'transparent',
              border: periodo === p.key ? '1px solid rgba(0,229,255,0.2)' : '1px solid transparent',
              color: periodo === p.key ? ACCENT : 'rgba(255,255,255,0.4)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}>{p.label}</button>
          ))}
        </div>
      </div>

      {/* ─── Banner informativo ──────────────────────────────────────────────── */}
      <div style={{
        background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)',
        borderRadius: 10, padding: '10px 16px', marginBottom: 24,
        fontSize: 12, color: 'rgba(255,255,255,0.4)',
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <Activity size={13} color={ACCENT} />
        <span>
          <strong style={{ color: ACCENT }}>Dashboard Avançado:</strong> KPIs financeiros, funil completo com drop-off, crescimento mensal,
          ROI por canal de aquisição e ranking de indicadores. Use o seletor de período para filtrar.
        </span>
      </div>

      {/* ─── KPIs principais (linha 1) ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <KpiCard icon={Target}      label="Leads no período"   value={leadsP.length}               sub={`${leads.length} total`}                     color={ACCENT}   delta={12} />
        <KpiCard icon={TrendingUp}  label="Taxa de conversão"  value={`${taxaConversao}%`}          sub={`${convertidos.length} matrículas`}           color={SUCCESS}  delta={5}  />
        <KpiCard icon={DollarSign}  label="MRR"                value={formatCurrency(mrr)}          sub={`ARR ${formatCurrency(arr)}`}                 color={SUCCESS}  delta={8}  />
        <KpiCard icon={Dumbbell}    label={`${term('clientes', 'Alunos')} ativos`} value={alunosAtivos.length}           sub={`Ticket médio ${formatCurrency(ticketMedio)}`} color={PURPLE}              />
        <KpiCard icon={Activity}    label="Churn rate"         value={`${churnRate}%`}              sub={`${inadimplentes.length} inadimplentes`}      color={churnRate > 10 ? DANGER : WARNING} delta={-2} />
        <KpiCard icon={Gift}        label="Indicações conv."   value={indicacoesConv}               sub={`${indicacoes.length} geradas`}              color={BLUE}               />
      </div>

      {/* ─── KPIs secundários (linha 2) ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'LTV estimado',        value: formatCurrency(ltv),                   color: SUCCESS, icon: '📈' },
          { label: `${term('clientes', 'Alunos')} em risco`, value: emRisco.length,     color: WARNING, icon: '⚠️' },
          { label: 'Leads sem contato',   value: leads.filter(l=>l.status==='novo').length, color: DANGER, icon: '📬' },
          { label: 'Follow-ups ativos',   value: leads.filter(l=>l.status==='em_conversa').length, color: ACCENT, icon: '💬' },
          { label: 'Renovações (7 dias)', value: alunos.filter(a => {
              const v = a.data_vencimento ? new Date(a.data_vencimento) : null
              if (!v) return false
              const diff = Math.ceil((v - agora) / 86400000)
              return diff >= 0 && diff <= 7 && a.status === 'ativo'
            }).length, color: PURPLE, icon: '📅' },
        ].map(k => (
          <div key={k.label} style={{
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 12, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>{k.icon}</span>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: k.color }}>{k.value}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Crescimento mensal ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 22 }}>
          <SectionTitle icon={TrendingUp} title="Crescimento mensal" sub="Leads e conversões nos últimos 6 meses" />
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={crescimentoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="leads"     stroke={ACCENT}   strokeWidth={2} dot={{ r: 4, fill: ACCENT }}   name="Leads" />
                <Line type="monotone" dataKey="conversoes" stroke={SUCCESS}  strokeWidth={2} dot={{ r: 4, fill: SUCCESS }}  name="Conversões" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            {[{ label: 'Leads', color: ACCENT }, { label: 'Conversões', color: SUCCESS }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                <div style={{ width: 24, height: 2, background: l.color, borderRadius: 1 }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Funil visual ─────────────────────────────────────────────────────── */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 22 }}>
          <SectionTitle icon={Target} title="Funil de conversão" sub="Drop-off em cada etapa" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {funilData.map((etapa, i) => (
              <div key={etapa.stage}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{etapa.stage}</span>
                  <span style={{ color: etapa.color, fontWeight: 700 }}>{etapa.count} <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>({etapa.pct}%)</span></span>
                </div>
                <div style={{ height: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 6,
                    width: `${Math.round((etapa.count / maxFunil) * 100)}%`,
                    background: etapa.color,
                    transition: 'width 0.8s ease',
                    boxShadow: `0 0 8px ${etapa.color}60`,
                  }} />
                </div>
                {i < funilData.length - 1 && funilData[i + 1].count > 0 && etapa.count > 0 && (
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2, textAlign: 'right' }}>
                    ↓ {Math.round(((etapa.count - funilData[i+1].count) / etapa.count) * 100)}% sai
                  </p>
                )}
              </div>
            ))}
          </div>
          {/* Taxa final */}
          <div style={{
            marginTop: 14, background: `${SUCCESS}10`, border: `1px solid ${SUCCESS}25`,
            borderRadius: 10, padding: '10px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Taxa total de conversão</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: SUCCESS }}>{taxaConversao}%</span>
          </div>
        </div>
      </div>

      {/* ─── ROI por canal ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 22 }}>
          <SectionTitle icon={BarChart2} title="ROI por canal de aquisição" sub="Leads, conversões e receita por origem" color={WARNING} />
          {roiCanal.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', paddingTop: 40, textAlign: 'center' }}>
              Nenhum lead cadastrado ainda
            </p>
          ) : (
            <>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roiCanal} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis type="number" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip {...TOOLTIP_STYLE} />
                    <Bar dataKey="leads"     name="Leads"      radius={[0,4,4,0]} opacity={0.5}>
                      {roiCanal.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Bar>
                    <Bar dataKey="conversoes" name="Conversões" radius={[0,4,4,0]}>
                      {roiCanal.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Tabela resumo */}
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {roiCanal.slice(0, 4).map(c => (
                  <div key={c.name} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', background: 'rgba(255,255,255,0.02)',
                    borderRadius: 8, fontSize: 12,
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{c.name}</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)' }}>{c.leads} leads</span>
                    <span style={{ color: c.color, fontWeight: 700 }}>{c.taxa}% conv.</span>
                    {c.receita > 0 && <span style={{ color: SUCCESS }}>{formatCurrency(c.receita)}/mês</span>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Ranking de Indicadores ─────────────────────────────────────────────── */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 22 }}>
          <SectionTitle icon={Gift} title="Top Indicadores" sub="Alunos que mais trouxeram amigos" color={PURPLE} />
          {ranking.length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', paddingTop: 40, textAlign: 'center' }}>
              Nenhuma indicação registrada ainda
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ranking.map((r, i) => (
                <div key={r.nome} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: i === 0 ? `${PURPLE}10` : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${i === 0 ? PURPLE + '25' : 'rgba(255,255,255,0.04)'}`,
                  borderRadius: 10,
                }}>
                  <span style={{
                    fontSize: i === 0 ? 18 : 14, fontWeight: 800,
                    color: i === 0 ? WARNING : 'rgba(255,255,255,0.3)',
                    width: 24, textAlign: 'center',
                  }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{r.nome}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                      {r.total} indicações · {r.conv} convertidas
                    </p>
                  </div>
                  <div style={{
                    background: `${PURPLE}15`, border: `1px solid ${PURPLE}25`,
                    borderRadius: 8, padding: '4px 10px',
                    fontSize: 12, fontWeight: 700, color: PURPLE,
                  }}>
                    {r.total > 0 ? Math.round((r.conv / r.total) * 100) : 0}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Mini pie de status de indicações */}
          {indicacoes.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>Status das indicações</p>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { label: 'Pendentes',  val: indicacoes.filter(i=>i.status==='pendente').length,   color: WARNING },
                  { label: 'Convertidas', val: indicacoes.filter(i=>i.status==='convertido').length, color: SUCCESS },
                  { label: 'Expiradas',  val: indicacoes.filter(i=>i.status==='expirado').length,   color: 'rgba(255,255,255,0.2)' },
                ].map(s => (
                  <div key={s.label} style={{
                    flex: 1, textAlign: 'center', padding: '8px 4px',
                    background: s.color + '10', borderRadius: 8,
                    border: `1px solid ${s.color}25`,
                  }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.val}</p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Receita mensal + Alertas ────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Gráfico receita mensal */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 22 }}>
          <SectionTitle icon={DollarSign} title="Receita mensal (novas matrículas)" sub="Valor acumulado por mês" color={SUCCESS} />
          <div style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={crescimentoData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} tickFormatter={v => v === 0 ? '0' : `R$${(v/1000).toFixed(0)}k`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={v => formatCurrency(v)} />
                <Bar dataKey="receita" name="Receita" fill={SUCCESS} radius={[4,4,0,0]} opacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Cards MRR/ARR */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            {[
              { label: 'MRR atual', value: formatCurrency(mrr), color: SUCCESS },
              { label: 'ARR projetado', value: formatCurrency(arr), color: BLUE },
            ].map(k => (
              <div key={k.label} style={{
                background: k.color + '08', border: `1px solid ${k.color}20`,
                borderRadius: 10, padding: '12px 14px', textAlign: 'center',
              }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: k.color }}>{k.value}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{k.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas prioritários */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 22 }}>
          <SectionTitle icon={AlertTriangle} title="Alertas prioritários" sub="Ações que precisam de atenção agora" color={DANGER} />
          {alertas.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 40 }}>
              <p style={{ fontSize: 24 }}>✅</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>Tudo em dia!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alertas.slice(0, 6).map((a, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px',
                  background: alertaBg[a.tipo],
                  border: `1px solid ${alertaCor[a.tipo]}20`,
                  borderRadius: 8,
                }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', flex: 1, lineHeight: 1.4 }}>{a.msg}</p>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: alertaCor[a.tipo], flexShrink: 0,
                    boxShadow: `0 0 6px ${alertaCor[a.tipo]}`,
                  }} />
                </div>
              ))}
              {alertas.length > 6 && (
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 4 }}>
                  +{alertas.length - 6} outros alertas
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Resumo WhatsApp (preview) ───────────────────────────────────────── */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 22, marginBottom: 20 }}>
        <SectionTitle icon={Zap} title="Preview do resumo diário (21h no WhatsApp)" sub="Como o dono recebe o resumo" color={SUCCESS} />
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{
            background: '#128C7E', borderRadius: 16, padding: '16px 20px',
            minWidth: 300, maxWidth: 380,
            fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8, color: '#fff',
          }}>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>⚡ LOTA — Resumo do dia</p>
            <p>📥 Leads novos: <strong>{leadsP.length}</strong></p>
            <p>✅ Convertidos: <strong>{convertidos.length}</strong></p>
            <p>💰 MRR atual: <strong>{formatCurrency(mrr)}</strong></p>
            <p>⚠️ Em risco: <strong>{emRisco.length}</strong></p>
            <p>💸 Inadimplentes: <strong>{inadimplentes.length}</strong></p>
            <p>🎁 Indicações ativas: <strong>{indicacoes.filter(i=>i.status==='pendente').length}</strong></p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
              Enviado às 21:00 · via LOTA
            </p>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>
              ✅ Esse resumo é enviado automaticamente todo dia às 21h via WhatsApp para o dono do box.<br/>
              ✅ Não requer ação manual.<br/>
              ✅ Dados calculados em tempo real do banco de dados.<br/>
              ✅ Configurado via Edge Function <code style={{ color: ACCENT }}>resumo-diario</code>.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}
