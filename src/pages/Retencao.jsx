/**
 * Retencao.jsx — Alunos em risco + renovações próximas + NPS
 */
import { useState } from 'react'
import { RefreshCw, AlertTriangle, Calendar, Star, MessageCircle, Zap, CheckCircle2, Play, Loader } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { linkWhatsApp, formatDate, formatCurrency } from '../lib/utils'
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts'
import { supabase } from '../lib/supabase'

// Dias até uma data
function diasAte(dataStr) {
  const hoje = new Date()
  const alvo = new Date(dataStr)
  return Math.ceil((alvo - hoje) / 86400000)
}

// Alunos renovando em breve (até 10 dias)
function renovacaoProxima(alunos) {
  return alunos
    .filter((a) => a.status === 'ativo' || a.status === 'inadimplente')
    .map((a) => ({ ...a, diasAte: diasAte(a.data_vencimento) }))
    .filter((a) => a.diasAte <= 10)
    .sort((a, b) => a.diasAte - b.diasAte)
}

// Classificação de risco por faltas
function nivelRisco(faltas) {
  if (faltas >= 7) return { nivel: 'crítico', cor: '#FF4444', emoji: '🔴' }
  if (faltas >= 5) return { nivel: 'alto', cor: '#FF8800', emoji: '🟠' }
  if (faltas >= 3) return { nivel: 'atenção', cor: '#FFB800', emoji: '🟡' }
  return null
}

// Classificação NPS
function npsLabel(score) {
  if (score >= 9) return { label: 'Promotor', cor: '#22C55E', emoji: '😍' }
  if (score >= 7) return { label: 'Neutro', cor: '#FFB800', emoji: '😐' }
  return { label: 'Detrator', cor: '#FF4444', emoji: '😤' }
}

export default function Retencao() {
  const { alunos, alunosEmRisco, alunosInadimplentes, nps } = useApp()
  const [aba, setAba] = useState('risco')
  const [disparando, setDisparando] = useState(false)
  const [ultimoDisparo, setUltimoDisparo] = useState(null)
  const [resultadoDisparo, setResultadoDisparo] = useState(null)

  const dispararRetencao = async () => {
    setDisparando(true)
    setResultadoDisparo(null)
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
      const res = await fetch(
        `${SUPABASE_URL}/functions/v1/retencao-alunos`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ trigger: 'manual' }),
        }
      )
      const data = await res.json()
      setResultadoDisparo(data)
      setUltimoDisparo(new Date().toLocaleTimeString('pt-BR'))
    } catch (err) {
      setResultadoDisparo({ error: String(err) })
    } finally {
      setDisparando(false)
    }
  }

  const renovacao = renovacaoProxima(alunos)
  const npsMedia = nps.length > 0
    ? (nps.reduce((s, n) => s + n.score, 0) / nps.length).toFixed(1)
    : 0

  const promotores = nps.filter((n) => n.score >= 9).length
  const neutros = nps.filter((n) => n.score >= 7 && n.score < 9).length
  const detratores = nps.filter((n) => n.score < 7).length
  const npsCalc = Math.round(((promotores - detratores) / Math.max(nps.length, 1)) * 100)

  const radarData = [
    { subject: 'Promotores', A: promotores },
    { subject: 'Neutros', A: neutros },
    { subject: 'Detratores', A: detratores },
  ]

  // Mensagens pré-prontas
  const msgRisco = (nome) => `Oi ${nome.split(' ')[0]}, sentimos sua falta no treino! 💪 Tudo certo por aí? Podemos remarcar ou ajudar em algo?`
  const msgRenovacao = (nome, dias) => `Oi ${nome.split(' ')[0]}, seu plano vence em ${dias === 0 ? 'hoje' : `${dias} dia${dias > 1 ? 's' : ''}`}! Podemos renovar? 😊`
  const msgInad = (nome) => `Oi ${nome.split(' ')[0]}, identificamos uma pendência no seu plano. Como posso te ajudar a regularizar? 🙏`

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }} className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <RefreshCw size={22} color="#00E5FF" /> Retenção
          </h1>
          <button
            id="btn-disparar-retencao"
            onClick={dispararRetencao}
            disabled={disparando}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 18px', borderRadius: 8, border: 'none',
              background: disparando
                ? 'rgba(0,229,255,0.1)'
                : 'linear-gradient(135deg, #00E5FF, #0070F3)',
              color: disparando ? '#00E5FF' : '#000',
              fontWeight: 600, fontSize: 13, cursor: disparando ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {disparando
              ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Verificando...</>
              : <><Play size={14} /> Disparar automação agora</>
            }
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {alunosEmRisco.length} em risco · {renovacao.length} renovações próximas · {alunosInadimplentes.length} inadimplentes · NPS {npsMedia}
          {ultimoDisparo && <span style={{ marginLeft: 12, color: '#00E5FF' }}>· Última execução: {ultimoDisparo}</span>}
        </p>
      </div>

      {/* Resultado do disparo manual */}
      {resultadoDisparo && (
        <div style={{
          background: resultadoDisparo.error ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
          border: `1px solid ${resultadoDisparo.error ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          borderRadius: 10, padding: '14px 16px', marginBottom: 20,
          display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center',
        }}>
          {resultadoDisparo.error ? (
            <span style={{ color: '#EF4444', fontSize: 13 }}>❌ Erro: {resultadoDisparo.error}</span>
          ) : (
            <>
              <span style={{ color: '#10B981', fontSize: 14, fontWeight: 600 }}>✅ Automação executada!</span>
              {[
                { label: 'Alertas 3 faltas', val: resultadoDisparo.faltas_3 },
                { label: 'Alertas 5 faltas', val: resultadoDisparo.faltas_5 },
                { label: 'Renovações 7d', val: resultadoDisparo.renovacoes_7d },
                { label: 'Renovações 1d', val: resultadoDisparo.renovacoes_1d },
                { label: 'Cobranças', val: resultadoDisparo.inadimplentes },
                { label: 'Status atualizados', val: resultadoDisparo.status_atualizados },
              ].map(({ label, val }) => (
                <span key={label} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{val ?? 0}</strong> {label}
                </span>
              ))}
            </>
          )}
        </div>
      )}

      {/* Info */}
      <div style={{
        background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <Zap size={14} color="#00E5FF" style={{ marginTop: 1, flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#00E5FF' }}>Como testar:</strong> Clique em "Contatar" em qualquer aluno para abrir o WhatsApp com uma mensagem pré-pronta.
          As abas mostram: <strong>Risco</strong> (alunos com faltas excessivas), <strong>Renovações</strong> (vencendo em até 10 dias) e <strong>NPS</strong> (satisfação geral).
        </span>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Em risco (3+ faltas)', value: alunosEmRisco.length, cor: '#FFB800', emoji: '⚠️' },
          { label: 'Renovação em até 10d', value: renovacao.length, cor: '#00E5FF', emoji: '📅' },
          { label: 'Inadimplentes', value: alunosInadimplentes.length, cor: '#FF4444', emoji: '💸' },
          { label: 'NPS médio', value: npsMedia, cor: '#22C55E', emoji: '⭐' },
          { label: 'NPS Score', value: `${npsCalc}`, cor: npsCalc > 50 ? '#22C55E' : npsCalc > 0 ? '#FFB800' : '#FF4444', emoji: '📊' },
        ].map(({ label, value, cor, emoji }) => (
          <div key={label} className="stat-card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 26, marginBottom: 4 }}>{emoji}</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: cor }}>{value}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { key: 'risco', label: 'Alunos em Risco', icon: <AlertTriangle size={14} /> },
          { key: 'renovacoes', label: 'Renovações', icon: <Calendar size={14} /> },
          { key: 'nps', label: 'NPS', icon: <Star size={14} /> },
        ].map((t) => (
          <button key={t.key} id={`retencao-tab-${t.key}`} onClick={() => setAba(t.key)}
            className={`tab-btn ${aba === t.key ? 'active' : ''}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ABA: RISCO */}
      {aba === 'risco' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alunosEmRisco.length === 0 ? (
            <div className="glass" style={{ borderRadius: 12, padding: 40, textAlign: 'center' }}>
              <CheckCircle2 size={40} color="#22C55E" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 16, fontWeight: 600 }}>Nenhum aluno em risco!</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Todos os alunos estão frequentando regularmente.</p>
            </div>
          ) : (
            alunosEmRisco.map((aluno) => {
              const risco = nivelRisco(aluno.faltas_consecutivas)
              return (
                <div key={aluno.id} className="glass" style={{
                  borderRadius: 12, padding: 16,
                  borderColor: `${risco.cor}25`,
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: `${risco.cor}15`, border: `1px solid ${risco.cor}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>
                    {risco.emoji}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <p style={{ fontSize: 14, fontWeight: 600 }}>{aluno.nome}</p>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: risco.cor, background: `${risco.cor}15`,
                        borderRadius: 20, padding: '2px 8px',
                        border: `1px solid ${risco.cor}30`,
                      }}>
                        {risco.nivel.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {aluno.faltas_consecutivas} faltas consecutivas · Plano {aluno.plano} · {formatCurrency(aluno.valor_mensalidade)}/mês
                    </p>
                  </div>
                  <a
                    href={linkWhatsApp(aluno.whatsapp, msgRisco(aluno.nome))}
                    target="_blank"
                    rel="noopener noreferrer"
                    id={`btn-contatar-risco-${aluno.id}`}
                    className="btn-ghost"
                    style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
                  >
                    <MessageCircle size={14} /> Contatar
                  </a>
                </div>
              )
            })
          )}

          {/* Inadimplentes */}
          {alunosInadimplentes.length > 0 && (
            <>
              <div style={{ marginTop: 16, marginBottom: 8 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#FF4444' }}>💸 Inadimplentes</h3>
              </div>
              {alunosInadimplentes.map((aluno) => (
                <div key={aluno.id} className="glass" style={{
                  borderRadius: 12, padding: 16,
                  borderColor: 'rgba(255,68,68,0.2)',
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: 'rgba(255,68,68,0.1)', border: '1px solid rgba(255,68,68,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>💸</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{aluno.nome}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Venceu em {formatDate(aluno.data_vencimento)} · {formatCurrency(aluno.valor_mensalidade)}/mês
                    </p>
                  </div>
                  <a
                    href={linkWhatsApp(aluno.whatsapp, msgInad(aluno.nome))}
                    target="_blank"
                    rel="noopener noreferrer"
                    id={`btn-contatar-inad-${aluno.id}`}
                    className="btn-ghost"
                    style={{ textDecoration: 'none', whiteSpace: 'nowrap', color: '#FF4444', borderColor: 'rgba(255,68,68,0.3)' }}
                  >
                    <MessageCircle size={14} /> Cobrar
                  </a>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ABA: RENOVAÇÕES */}
      {aba === 'renovacoes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {renovacao.length === 0 ? (
            <div className="glass" style={{ borderRadius: 12, padding: 40, textAlign: 'center' }}>
              <Calendar size={40} color="#22C55E" style={{ margin: '0 auto 12px' }} />
              <p style={{ fontSize: 16, fontWeight: 600 }}>Nenhuma renovação urgente!</p>
            </div>
          ) : (
            renovacao.map((aluno) => {
              const urgencia = aluno.diasAte <= 0 ? { cor: '#FF4444', label: 'VENCIDO' }
                : aluno.diasAte <= 1 ? { cor: '#FF8800', label: 'AMANHÃ' }
                : aluno.diasAte <= 3 ? { cor: '#FFB800', label: `${aluno.diasAte} dias` }
                : { cor: '#00E5FF', label: `${aluno.diasAte} dias` }

              return (
                <div key={aluno.id} className="glass" style={{
                  borderRadius: 12, padding: 16,
                  borderColor: `${urgencia.cor}20`,
                  display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                }}>
                  <div style={{
                    background: `${urgencia.cor}12`, border: `1px solid ${urgencia.cor}25`,
                    borderRadius: 10, padding: '8px 14px', textAlign: 'center', flexShrink: 0,
                  }}>
                    <p style={{ fontSize: 18, fontWeight: 800, color: urgencia.cor }}>{urgencia.label}</p>
                    <p style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      {aluno.diasAte <= 0 ? '' : 'restam'}
                    </p>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{aluno.nome}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {aluno.plano} · {formatCurrency(aluno.valor_mensalidade)}/mês · vence {formatDate(aluno.data_vencimento)}
                    </p>
                  </div>
                  <a
                    href={linkWhatsApp(aluno.whatsapp, msgRenovacao(aluno.nome, Math.max(0, aluno.diasAte)))}
                    target="_blank"
                    rel="noopener noreferrer"
                    id={`btn-renovar-${aluno.id}`}
                    className="btn-ghost"
                    style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
                  >
                    <MessageCircle size={14} /> Lembrar
                  </a>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ABA: NPS */}
      {aba === 'nps' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Métricas NPS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {[
              { label: `Promotores (9-10)`, count: promotores, cor: '#22C55E', emoji: '😍', pct: Math.round((promotores / Math.max(nps.length, 1)) * 100) },
              { label: `Neutros (7-8)`, count: neutros, cor: '#FFB800', emoji: '😐', pct: Math.round((neutros / Math.max(nps.length, 1)) * 100) },
              { label: `Detratores (1-6)`, count: detratores, cor: '#FF4444', emoji: '😤', pct: Math.round((detratores / Math.max(nps.length, 1)) * 100) },
            ].map(({ label, count, cor, emoji, pct }) => (
              <div key={label} className="glass" style={{ borderRadius: 12, padding: 16, textAlign: 'center' }}>
                <p style={{ fontSize: 28, marginBottom: 6 }}>{emoji}</p>
                <p style={{ fontSize: 26, fontWeight: 800, color: cor }}>{count}</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>{label}</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: cor }}>{pct}%</p>
              </div>
            ))}
          </div>

          {/* NPS Score grande */}
          <div className="glass" style={{
            borderRadius: 12, padding: 24, textAlign: 'center',
            background: `linear-gradient(135deg, ${npsCalc > 50 ? 'rgba(34,197,94,0.05)' : 'rgba(255,184,0,0.05)'}, transparent)`,
          }}>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>NPS Score calculado</p>
            <p style={{ fontSize: 60, fontWeight: 900, color: npsCalc > 50 ? '#22C55E' : npsCalc > 0 ? '#FFB800' : '#FF4444', lineHeight: 1 }}>
              {npsCalc}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
              {npsCalc > 75 ? '🏆 Excelente' : npsCalc > 50 ? '✅ Bom' : npsCalc > 0 ? '⚠️ Regular' : '❌ Ruim'}
            </p>
          </div>

          {/* Comentários */}
          <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>💬 Comentários recentes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {nps.map((n) => {
                const cat = npsLabel(n.score)
                return (
                  <div key={n.id} style={{
                    padding: '12px 14px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                      <p style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{n.aluno_nome}</p>
                      <span style={{
                        fontSize: 18, fontWeight: 800, color: cat.cor,
                        background: `${cat.cor}15`, borderRadius: 8, padding: '2px 10px',
                      }}>{n.score}</span>
                    </div>
                    {n.comentario && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>
                        "{n.comentario}"
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
