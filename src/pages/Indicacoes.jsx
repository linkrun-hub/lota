/**
 * Indicacoes.jsx — Programa de indicações + ranking + ROI
 */
import { useState } from 'react'
import { Gift, Trophy, TrendingUp, Link, Copy, Check, Crown, Zap, Users } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { timeAgo, formatCurrency } from '../lib/utils'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const RECOMPENSAS = [
  { tipo: 'desconto', label: 'Desconto na mensalidade', valor: 30, gatilho: 'Conversão do indicado' },
]

// Simula dados de linha para o gráfico
const dadosLinha = [
  { mes: 'Jan', indicacoes: 2, convertidas: 1 },
  { mes: 'Fev', indicacoes: 3, convertidas: 1 },
  { mes: 'Mar', indicacoes: 1, convertidas: 0 },
  { mes: 'Abr', indicacoes: 4, convertidas: 2 },
  { mes: 'Mai', indicacoes: 5, convertidas: 2 },
  { mes: 'Jun', indicacoes: 7, convertidas: 3 },
]

function PremiumBanner() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,184,0,0.08), rgba(167,139,250,0.08))',
      border: '1px solid rgba(255,184,0,0.2)',
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: 'rgba(255,184,0,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        🔒
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Módulo Premium — Indicações</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Você está no modo demonstração. As funcionalidades abaixo são um preview do que estará disponível no plano Pro.
        </p>
      </div>
      <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13, flexShrink: 0 }}>
        <Zap size={13} /> Ativar Pro
      </button>
    </div>
  )
}

export default function Indicacoes() {
  const { indicacoes, alunos } = useApp()
  const [aba, setAba] = useState('programa')
  const [copied, setCopied] = useState(null)

  const handleCopy = (token) => {
    navigator.clipboard.writeText(`https://lota.app/i/${token}`).catch(() => {})
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  // Ranking de indicadores
  const rankingMap = {}
  indicacoes.forEach((ind) => {
    const key = ind.aluno_indicador_id
    if (!rankingMap[key]) {
      rankingMap[key] = {
        id: key,
        nome: ind.aluno_indicador_nome,
        total: 0,
        convertidas: 0,
      }
    }
    rankingMap[key].total++
    if (ind.status === 'convertido') rankingMap[key].convertidas++
  })
  const ranking = Object.values(rankingMap)
    .sort((a, b) => b.convertidas - a.convertidas || b.total - a.total)

  const top3 = ranking.slice(0, 3)
  const resto = ranking.slice(3)

  // ROI
  const totalConvertidas = indicacoes.filter((i) => i.status === 'convertido').length
  const receitaGerada = totalConvertidas * 189 * 3 // média 3 meses
  const custoRecompensas = totalConvertidas * 30
  const roi = custoRecompensas > 0 ? Math.round((receitaGerada / custoRecompensas) * 100) : 0

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }} className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Gift size={22} color="#FFB800" /> Indicações
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Programa de referral · {indicacoes.length} indicações · {totalConvertidas} convertidas
        </p>
      </div>

      <PremiumBanner />

      {/* Info */}
      <div style={{
        background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <Zap size={14} color="#00E5FF" style={{ marginTop: 1, flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#00E5FF' }}>Como testar:</strong> Explore o programa de indicações com os dados mockados.
          Veja os links únicos por aluno, o ranking dos melhores indicadores e o ROI calculado automaticamente.
          No plano Pro, os links são enviados automaticamente via WhatsApp quando o aluno completa 3 meses.
        </span>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { key: 'programa', label: 'Programa', icon: <Gift size={14} /> },
          { key: 'ranking', label: 'Ranking', icon: <Trophy size={14} /> },
          { key: 'roi', label: 'ROI', icon: <TrendingUp size={14} /> },
        ].map((t) => (
          <button key={t.key} id={`indicacoes-tab-${t.key}`} onClick={() => setAba(t.key)}
            className={`tab-btn ${aba === t.key ? 'active' : ''}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ABA: PROGRAMA */}
      {aba === 'programa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Card explicativo */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,184,0,0.06), rgba(255,184,0,0.02))',
            border: '1px solid rgba(255,184,0,0.15)',
            borderRadius: 12, padding: 20,
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>🎁 Como funciona o programa</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                '1. Cada aluno recebe um link único de indicação',
                '2. Quando um amigo se matricula pelo link, o aluno ganha a recompensa',
                '3. O LOTA acompanha cliques, conversões e libera o prêmio automaticamente',
              ].map((step) => (
                <p key={step} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{step}</p>
              ))}
            </div>
          </div>

          {/* Recompensa configurada */}
          <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>⚙️ Recompensa configurada</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{
                background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.2)',
                borderRadius: 10, padding: '12px 20px', textAlign: 'center',
              }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#FFB800' }}>30%</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Desconto no mês</p>
              </div>
              <div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Gatilho: <strong style={{ color: 'var(--text-primary)' }}>Quando o indicado se matricula</strong>
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  O aluno indicador recebe 30% de desconto na próxima mensalidade automaticamente.
                </p>
              </div>
            </div>
          </div>

          {/* Links ativos */}
          <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>🔗 Links ativos por aluno</h3>
              <button className="btn-primary" style={{ padding: '7px 14px', fontSize: 12 }}>
                <Link size={13} /> Gerar novo link
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {indicacoes.filter((i) => i.status !== 'expirado').map((ind) => (
                <div key={ind.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#FFB800', flexShrink: 0,
                  }}>
                    {ind.aluno_indicador_nome.slice(0, 1)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{ind.aluno_indicador_nome}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      lota.app/i/{ind.token}
                    </p>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: ind.status === 'convertido' ? '#22C55E' : '#00E5FF',
                    background: ind.status === 'convertido' ? 'rgba(34,197,94,0.1)' : 'rgba(0,229,255,0.1)',
                    borderRadius: 20, padding: '2px 8px',
                  }}>
                    {ind.status === 'convertido' ? '✅ Convertida' : '⏳ Pendente'}
                  </span>
                  <button
                    id={`btn-copiar-link-${ind.token}`}
                    onClick={() => handleCopy(ind.token)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: copied === ind.token ? '#22C55E' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 28, height: 28,
                    }}
                    title="Copiar link"
                  >
                    {copied === ind.token ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA: RANKING */}
      {aba === 'ranking' && (
        <div>
          {/* Pódio top 3 */}
          {top3.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, textAlign: 'center' }}>
                🏆 Top 3 Indicadores do Mês
              </h3>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 16 }}>
                {/* 2º lugar */}
                {top3[1] && (
                  <div style={{ textAlign: 'center', flex: 1, maxWidth: 160 }}>
                    <div style={{ background: 'rgba(192,192,192,0.1)', border: '2px solid rgba(192,192,192,0.3)', borderRadius: 12, padding: '16px 12px', marginBottom: 8 }}>
                      <div style={{ fontSize: 28, marginBottom: 4 }}>🥈</div>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{top3[1].nome.split(' ')[0]}</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: '#C0C0C0', marginTop: 4 }}>{top3[1].convertidas}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>convertidas</p>
                    </div>
                  </div>
                )}
                {/* 1º lugar */}
                {top3[0] && (
                  <div style={{ textAlign: 'center', flex: 1, maxWidth: 180 }}>
                    <div style={{ background: 'rgba(255,184,0,0.1)', border: '2px solid rgba(255,184,0,0.3)', borderRadius: 12, padding: '20px 12px', marginBottom: 8, position: 'relative' }}>
                      <Crown size={16} color="#FFB800" style={{ position: 'absolute', top: 10, right: 10 }} />
                      <div style={{ fontSize: 36, marginBottom: 6 }}>🥇</div>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{top3[0].nome.split(' ')[0]}</p>
                      <p style={{ fontSize: 28, fontWeight: 800, color: '#FFB800', marginTop: 4 }}>{top3[0].convertidas}</p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>convertidas</p>
                    </div>
                  </div>
                )}
                {/* 3º lugar */}
                {top3[2] && (
                  <div style={{ textAlign: 'center', flex: 1, maxWidth: 160 }}>
                    <div style={{ background: 'rgba(205,127,50,0.1)', border: '2px solid rgba(205,127,50,0.3)', borderRadius: 12, padding: '16px 12px', marginBottom: 8 }}>
                      <div style={{ fontSize: 28, marginBottom: 4 }}>🥉</div>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{top3[2].nome.split(' ')[0]}</p>
                      <p style={{ fontSize: 20, fontWeight: 800, color: '#CD7F32', marginTop: 4 }}>{top3[2].convertidas}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>convertidas</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabela completa */}
          <div className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['#', 'Aluno', 'Indicações', 'Convertidas', 'Taxa'].map((h) => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranking.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 16 }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{r.nome}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700 }}>{r.total}</td>
                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, color: '#22C55E' }}>{r.convertidas}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: r.total > 0 && r.convertidas / r.total > 0.5 ? '#22C55E' : '#FFB800',
                      }}>
                        {r.total > 0 ? Math.round((r.convertidas / r.total) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA: ROI */}
      {aba === 'roi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Cards de ROI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {[
              { label: 'Receita gerada', value: formatCurrency(receitaGerada), color: '#22C55E', sub: `${totalConvertidas} matrículas × 3 meses` },
              { label: 'Custo recompensas', value: formatCurrency(custoRecompensas), color: '#FF4444', sub: `${totalConvertidas} × R$30 desconto` },
              { label: 'ROI', value: `${roi}%`, color: '#00E5FF', sub: 'Retorno sobre investimento' },
              { label: 'Indicações ativas', value: indicacoes.filter(i => i.status === 'pendente').length.toString(), color: '#FFB800', sub: 'Aguardando conversão' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="stat-card">
                <p style={{ fontSize: 28, fontWeight: 800, color }}>{value}</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginTop: 4 }}>{label}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>
              </div>
            ))}
          </div>

          {/* Gráfico de linha */}
          <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>📈 Indicações ao longo do tempo</h3>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dadosLinha}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="mes" stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="rgba(255,255,255,0.2)" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#141420', border: '1px solid var(--border-medium)', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="indicacoes" stroke="#FFB800" strokeWidth={2} dot={{ fill: '#FFB800' }} name="Indicações" />
                  <Line type="monotone" dataKey="convertidas" stroke="#22C55E" strokeWidth={2} dot={{ fill: '#22C55E' }} name="Convertidas" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Conversão por indicador */}
          <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>🏆 Conversão por indicador</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ranking.map((r) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <p style={{ fontSize: 13, minWidth: 140, color: 'var(--text-secondary)' }}>{r.nome.split(' ')[0]}</p>
                  <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${r.total > 0 ? (r.convertidas / r.total) * 100 : 0}%`,
                      background: 'linear-gradient(135deg, #FFB800, #22C55E)',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#22C55E', minWidth: 36, textAlign: 'right' }}>
                    {r.total > 0 ? Math.round((r.convertidas / r.total) * 100) : 0}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
