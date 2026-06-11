/**
 * Indicacoes.jsx — Programa de indicações com links reais
 */
import { useState, useEffect, useCallback } from 'react'
import {
  Gift, Trophy, TrendingUp, Link2, Copy, Check, Crown,
  Zap, Send, RefreshCw, Plus, ExternalLink, Info,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { formatCurrency } from '../lib/utils'
import { supabase } from '../lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

// ─── Gera token único de 8 chars ─────────────────────────────────────────────
function gerarToken() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ─── URL base do sistema ──────────────────────────────────────────────────────
const BASE_URL = 'https://www.lota.app.br/i'

export default function Indicacoes() {
  const { alunos, currentBox } = useApp()
  const [aba, setAba] = useState('programa')
  const [copied, setCopied] = useState(null)
  const [indicacoes, setIndicacoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [gerando, setGerando] = useState(null) // ID do aluno gerando link
  const [filtro, setFiltro] = useState('ativas') // ativas | todas

  const boxId = currentBox?.id
  const boxNome = currentBox?.nome || 'Box'

  // ─── Carrega indicações reais ───────────────────────────────────────────────
  const carregar = useCallback(async () => {
    if (!boxId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('indicacoes')
        .select(`
          *,
          aluno_indicador:aluno_indicador_id (id, nome, whatsapp),
          lead_indicado:lead_indicado_id (id, nome, whatsapp)
        `)
        .eq('box_id', boxId)
        .order('created_at', { ascending: false })

      setIndicacoes(data || [])
    } finally {
      setLoading(false)
    }
  }, [boxId])

  useEffect(() => { carregar() }, [carregar])

  // ─── Copia link ───────────────────────────────────────────────────────────
  const copiarLink = (token) => {
    const url = `${BASE_URL}/${token}`
    navigator.clipboard.writeText(url).catch(() => {})
    setCopied(token)
    setTimeout(() => setCopied(null), 2500)
  }

  // ─── Abre no WhatsApp (envia o link para o aluno) ─────────────────────────
  const enviarWhatsApp = (aluno, token) => {
    const url = `${BASE_URL}/${token}`
    const msg = encodeURIComponent(
      `Oi ${aluno.nome.split(' ')[0]}! 🎁\n\nAqui está seu link exclusivo de indicação do *${boxNome}*:\n\n👉 ${url}\n\nCompartilhe com amigos e ganhe benefícios quando eles se matricularem! 💪`
    )
    window.open(`https://wa.me/${aluno.whatsapp.replace(/\D/g, '')}?text=${msg}`, '_blank')
  }

  // ─── Gera novo link para um aluno ─────────────────────────────────────────
  const gerarLink = async (aluno) => {
    if (gerando) return
    setGerando(aluno.id)
    try {
      // Verifica se já tem uma indicação ativa
      const existente = indicacoes.find(
        i => i.aluno_indicador_id === aluno.id && i.status === 'pendente'
      )
      if (existente) {
        enviarWhatsApp(aluno, existente.token)
        setGerando(null)
        return
      }

      // Gera novo token
      const token = gerarToken()
      const { data: novaInd, error } = await supabase
        .from('indicacoes')
        .insert({
          box_id:             boxId,
          aluno_indicador_id: aluno.id,
          token,
          status:             'pendente',
          expira_em:          new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single()

      if (error) throw error

      await carregar()
      // Envia link por WhatsApp
      enviarWhatsApp(aluno, token)
    } catch (e) {
      alert('Erro ao gerar link: ' + e.message)
    } finally {
      setGerando(null)
    }
  }

  // ─── Dispara convites em massa (alunos elegíveis: > 3 meses ou NPS >= 5) ──
  const dispararConvitesEmMassa = async () => {
    const tresMetresAtras = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const elegiveis = alunos.filter(a =>
      a.status === 'ativo' &&
      !a.opt_out &&
      (a.data_inicio < tresMetresAtras || a.nps_score >= 5)
    )

    if (elegiveis.length === 0) {
      alert('Nenhum aluno elegível encontrado (3 meses de casa ou NPS ≥ 5)')
      return
    }

    if (!confirm(`Enviar link de indicação para ${elegiveis.length} alunos elegíveis?`)) return

    for (const aluno of elegiveis) {
      await gerarLink(aluno)
    }
  }

  // ─── Métricas ──────────────────────────────────────────────────────────────
  const totalConvertidas = indicacoes.filter(i => i.status === 'convertido').length
  const totalPendentes   = indicacoes.filter(i => i.status === 'pendente').length
  const taxaConversao    = indicacoes.length > 0
    ? Math.round((totalConvertidas / indicacoes.length) * 100) : 0
  const receitaGerada    = totalConvertidas * 189 * 3
  const custoRecompensas = totalConvertidas * 30
  const roi              = custoRecompensas > 0 ? Math.round((receitaGerada / custoRecompensas) * 100) : 0

  // ─── Ranking de indicadores ───────────────────────────────────────────────
  const rankingMap: Record<string, { id: string; nome: string; total: number; convertidas: number }> = {}
  indicacoes.forEach(ind => {
    const key = ind.aluno_indicador_id
    if (!rankingMap[key]) {
      rankingMap[key] = {
        id: key,
        nome: ind.aluno_indicador?.nome || '—',
        total: 0, convertidas: 0,
      }
    }
    rankingMap[key].total++
    if (ind.status === 'convertido') rankingMap[key].convertidas++
  })
  const ranking = Object.values(rankingMap)
    .sort((a, b) => b.convertidas - a.convertidas || b.total - a.total)
  const top3 = ranking.slice(0, 3)

  const indicacoesFiltradas = filtro === 'ativas'
    ? indicacoes.filter(i => i.status === 'pendente')
    : indicacoes

  // ─── Alunos elegíveis para convite ────────────────────────────────────────
  const tresMetresAtras = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const alunosElegiveis = alunos.filter(a =>
    a.status === 'ativo' &&
    !a.opt_out &&
    (a.data_inicio < tresMetresAtras || (a.nps_score ?? 0) >= 5)
  )

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }} className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Gift size={22} color="#FFB800" /> Indicações
          </h1>
          <button
            onClick={dispararConvitesEmMassa}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 16px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #FFB800, #FF8800)',
              color: '#000', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}
          >
            <Send size={14} /> Enviar convites em massa
          </button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {indicacoes.length} indicações · {totalConvertidas} convertidas · {alunosElegiveis.length} alunos elegíveis para convite
        </p>
      </div>

      {/* Banner informativo */}
      <div style={{
        background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <Info size={14} color="#00E5FF" style={{ marginTop: 1, flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#00E5FF' }}>Como funciona:</strong>{' '}
          Cada aluno recebe um link único (<code style={{ color: '#FFB800' }}>www.lota.app.br/i/TOKEN</code>).
          Quando um amigo preenche o formulário pelo link, vira lead automaticamente no sistema.
          Use "Gerar link" na lista de alunos ou "Enviar convites em massa" para alunos elegíveis (3+ meses ou NPS ≥ 5).
        </span>
      </div>

      {/* Cards de resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Indicações ativas', value: totalPendentes, cor: '#FFB800', emoji: '⏳' },
          { label: 'Convertidas', value: totalConvertidas, cor: '#22C55E', emoji: '✅' },
          { label: 'Taxa de conversão', value: `${taxaConversao}%`, cor: '#00E5FF', emoji: '🎯' },
          { label: 'Receita gerada', value: formatCurrency(receitaGerada), cor: '#10B981', emoji: '💰' },
          { label: 'ROI', value: `${roi}%`, cor: roi > 200 ? '#22C55E' : '#FFB800', emoji: '📊' },
        ].map(({ label, value, cor, emoji }) => (
          <div key={label} className="stat-card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, marginBottom: 4 }}>{emoji}</p>
            <p style={{ fontSize: 20, fontWeight: 800, color: cor }}>{value}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.3 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { key: 'programa', label: 'Links Ativos', icon: <Link2 size={14} /> },
          { key: 'alunos', label: 'Gerar Links', icon: <Plus size={14} /> },
          { key: 'ranking', label: 'Ranking', icon: <Trophy size={14} /> },
          { key: 'roi', label: 'ROI', icon: <TrendingUp size={14} /> },
        ].map(t => (
          <button key={t.key} id={`indicacoes-tab-${t.key}`} onClick={() => setAba(t.key)}
            className={`tab-btn ${aba === t.key ? 'active' : ''}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ABA: LINKS ATIVOS */}
      {aba === 'programa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            {[
              { key: 'ativas', label: 'Pendentes' },
              { key: 'todas', label: 'Todas' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFiltro(f.key)}
                style={{
                  padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
                  background: filtro === f.key ? 'rgba(255,184,0,0.15)' : 'transparent',
                  border: `1px solid ${filtro === f.key ? 'rgba(255,184,0,0.4)' : 'var(--border-subtle)'}`,
                  color: filtro === f.key ? '#FFB800' : 'var(--text-muted)',
                  fontSize: 12, fontWeight: filtro === f.key ? 600 : 400,
                }}
              >
                {f.label}
              </button>
            ))}
            <button onClick={carregar} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <RefreshCw size={14} />
            </button>
          </div>

          {loading ? (
            <div className="glass" style={{ borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              Carregando...
            </div>
          ) : indicacoesFiltradas.length === 0 ? (
            <div className="glass" style={{ borderRadius: 12, padding: 40, textAlign: 'center' }}>
              <Gift size={40} color="var(--text-muted)" style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
              <p style={{ color: 'var(--text-muted)' }}>Nenhuma indicação {filtro === 'ativas' ? 'pendente' : ''} ainda.</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', opacity: 0.7, marginTop: 6 }}>
                Use a aba "Gerar Links" para criar links individuais para cada aluno.
              </p>
            </div>
          ) : (
            <div className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
              {indicacoesFiltradas.map((ind) => (
                <div key={ind.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: 'rgba(255,184,0,0.1)', border: '1px solid rgba(255,184,0,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 700, color: '#FFB800', flexShrink: 0,
                  }}>
                    {(ind.aluno_indicador?.nome || '?').charAt(0)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>{ind.aluno_indicador?.nome || '—'}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      www.lota.app.br/i/{ind.token}
                    </p>
                    {ind.lead_indicado && (
                      <p style={{ fontSize: 11, color: '#22C55E', marginTop: 2 }}>
                        ✅ Lead: {ind.lead_indicado.nome}
                      </p>
                    )}
                  </div>

                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: ind.status === 'convertido' ? '#22C55E' : ind.status === 'expirado' ? '#EF4444' : '#FFB800',
                    background: ind.status === 'convertido' ? 'rgba(34,197,94,0.1)'
                      : ind.status === 'expirado' ? 'rgba(239,68,68,0.1)' : 'rgba(255,184,0,0.1)',
                    borderRadius: 20, padding: '3px 10px',
                    border: `1px solid ${ind.status === 'convertido' ? 'rgba(34,197,94,0.3)' : ind.status === 'expirado' ? 'rgba(239,68,68,0.3)' : 'rgba(255,184,0,0.3)'}`,
                  }}>
                    {ind.status === 'convertido' ? '✅ Convertida' : ind.status === 'expirado' ? '❌ Expirada' : '⏳ Pendente'}
                  </span>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => copiarLink(ind.token)}
                      title="Copiar link"
                      style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
                        borderRadius: 6, padding: '6px 8px', cursor: 'pointer',
                        color: copied === ind.token ? '#22C55E' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
                      }}
                    >
                      {copied === ind.token ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                    </button>
                    <a
                      href={`${BASE_URL}/${ind.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Ver página"
                      style={{
                        background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
                        borderRadius: 6, padding: '6px 8px', cursor: 'pointer',
                        color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                        textDecoration: 'none',
                      }}
                    >
                      <ExternalLink size={12} />
                    </a>
                    {ind.aluno_indicador?.whatsapp && ind.status === 'pendente' && (
                      <button
                        onClick={() => enviarWhatsApp(ind.aluno_indicador, ind.token)}
                        title="Reenviar por WhatsApp"
                        style={{
                          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                          borderRadius: 6, padding: '6px 8px', cursor: 'pointer',
                          color: '#22C55E', display: 'flex', alignItems: 'center',
                        }}
                      >
                        <Send size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ABA: GERAR LINKS (lista de alunos) */}
      {aba === 'alunos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
            Clique em "Gerar link" para criar um link único para o aluno e enviar por WhatsApp automaticamente.
          </p>
          {alunos.filter(a => a.status === 'ativo').map(aluno => {
            const jaTemLink = indicacoes.find(i => i.aluno_indicador_id === aluno.id && i.status === 'pendente')
            const isElegivel = aluno.data_inicio < tresMetresAtras || (aluno.nps_score ?? 0) >= 5
            return (
              <div key={aluno.id} className="glass" style={{
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: isElegivel ? 'rgba(255,184,0,0.1)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isElegivel ? 'rgba(255,184,0,0.25)' : 'var(--border-subtle)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, color: isElegivel ? '#FFB800' : 'var(--text-muted)',
                  fontSize: 13, flexShrink: 0,
                }}>
                  {aluno.nome?.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{aluno.nome}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {aluno.plano}
                    {isElegivel && <span style={{ color: '#FFB800', marginLeft: 8 }}>⭐ Elegível</span>}
                    {jaTemLink && <span style={{ color: '#00E5FF', marginLeft: 8 }}>🔗 Tem link ativo</span>}
                  </p>
                </div>
                <button
                  id={`btn-gerar-link-${aluno.id}`}
                  onClick={() => gerarLink(aluno)}
                  disabled={gerando === aluno.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', borderRadius: 7, border: 'none',
                    background: jaTemLink
                      ? 'rgba(0,229,255,0.08)' : 'rgba(255,184,0,0.12)',
                    border: `1px solid ${jaTemLink ? 'rgba(0,229,255,0.2)' : 'rgba(255,184,0,0.25)'}`,
                    color: jaTemLink ? '#00E5FF' : '#FFB800',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    opacity: gerando === aluno.id ? 0.6 : 1,
                  }}
                >
                  <Send size={12} />
                  {gerando === aluno.id ? 'Gerando...' : jaTemLink ? 'Reenviar por WPP' : 'Gerar link + WPP'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ABA: RANKING */}
      {aba === 'ranking' && (
        <div>
          {top3.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, textAlign: 'center' }}>
                🏆 Top 3 Indicadores
              </h3>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 16 }}>
                {[top3[1], top3[0], top3[2]].map((r, i) => r ? (
                  <div key={r.id} style={{ textAlign: 'center', flex: 1, maxWidth: i === 1 ? 180 : 160 }}>
                    <div style={{
                      background: i === 1 ? 'rgba(255,184,0,0.1)' : i === 0 ? 'rgba(192,192,192,0.1)' : 'rgba(205,127,50,0.1)',
                      border: `2px solid ${i === 1 ? 'rgba(255,184,0,0.3)' : i === 0 ? 'rgba(192,192,192,0.3)' : 'rgba(205,127,50,0.3)'}`,
                      borderRadius: 12, padding: `${i === 1 ? 20 : 16}px 12px`, marginBottom: 8,
                    }}>
                      {i === 1 && <Crown size={14} color="#FFB800" style={{ marginBottom: 4 }} />}
                      <div style={{ fontSize: i === 1 ? 36 : 28, marginBottom: 4 }}>
                        {i === 0 ? '🥈' : i === 1 ? '🥇' : '🥉'}
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600 }}>{r.nome.split(' ')[0]}</p>
                      <p style={{ fontSize: i === 1 ? 26 : 20, fontWeight: 800, color: i === 1 ? '#FFB800' : i === 0 ? '#C0C0C0' : '#CD7F32', marginTop: 4 }}>
                        {r.convertidas}
                      </p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>convertidas</p>
                    </div>
                  </div>
                ) : null)}
              </div>
            </div>
          )}

          {ranking.length === 0 ? (
            <div className="glass" style={{ borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              Nenhuma indicação registrada ainda
            </div>
          ) : (
            <div className="glass" style={{ borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['#', 'Aluno', 'Indicações', 'Convertidas', 'Taxa'].map(h => (
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
                        <span style={{ fontSize: 12, fontWeight: 600, color: r.total > 0 && r.convertidas / r.total > 0.5 ? '#22C55E' : '#FFB800' }}>
                          {r.total > 0 ? Math.round((r.convertidas / r.total) * 100) : 0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ABA: ROI */}
      {aba === 'roi' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
            {[
              { label: 'Receita gerada', value: formatCurrency(receitaGerada), color: '#22C55E', sub: `${totalConvertidas} matrículas × 3 meses` },
              { label: 'Custo recompensas', value: formatCurrency(custoRecompensas), color: '#FF4444', sub: `${totalConvertidas} × R$30 desconto` },
              { label: 'ROI', value: `${roi}%`, color: '#00E5FF', sub: 'Retorno sobre investimento' },
              { label: 'Indicações ativas', value: String(totalPendentes), color: '#FFB800', sub: 'Aguardando conversão' },
            ].map(({ label, value, color, sub }) => (
              <div key={label} className="stat-card">
                <p style={{ fontSize: 28, fontWeight: 800, color }}>{value}</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginTop: 4 }}>{label}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>
              </div>
            ))}
          </div>
          <div className="glass" style={{ borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>🏆 Conversão por indicador</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ranking.map(r => (
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
