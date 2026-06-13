/**
 * src/pages/Isca.jsx
 * Bloco ISCA V1 (Fase 4) — feed de sugestões de marketing geradas
 * pelo radar diário a partir dos dados reais da operação.
 */
import { useState, useEffect, useCallback } from 'react'
import { Fish, Copy, Check, X, ThumbsUp, RefreshCw, Loader, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

const TIPOS = {
  prova_social: { label: 'Prova social', emoji: '🏆', color: '#22C55E' },
  depoimento:   { label: 'Depoimento',   emoji: '⭐', color: '#FFB800' },
  vagas:        { label: 'Vagas',        emoji: '⏰', color: '#FF4444' },
  indicacao:    { label: 'Indicação',    emoji: '🎁', color: '#A78BFA' },
  sazonal:      { label: 'Pauta do dia', emoji: '📅', color: '#00E5FF' },
}

const btn = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
  borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600,
  color: 'var(--text-secondary)', cursor: 'pointer',
}

export default function Isca() {
  const { box } = useApp()
  const [iscas, setIscas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [copiadaId, setCopiadaId] = useState(null)
  const [filtro, setFiltro] = useState('ativas')

  const carregar = useCallback(async () => {
    if (!box?.id) return
    setCarregando(true)
    const { data } = await supabase
      .from('iscas').select('*').eq('box_id', box.id)
      .order('created_at', { ascending: false }).limit(60)
    setIscas(data || [])
    setCarregando(false)
  }, [box?.id])

  useEffect(() => { carregar() }, [carregar])

  const gerarAgora = async () => {
    setGerando(true)
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/radar-marketing`, {
        method: 'POST',
        headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      })
      await carregar()
    } finally {
      setGerando(false)
    }
  }

  const mudarStatus = async (isca, status) => {
    await supabase.from('iscas').update({ status }).eq('id', isca.id)
    setIscas((prev) => prev.map((i) => (i.id === isca.id ? { ...i, status } : i)))
  }

  const copiar = (isca) => {
    navigator.clipboard.writeText(isca.legenda)
    setCopiadaId(isca.id)
    setTimeout(() => setCopiadaId(null), 2000)
    if (isca.status === 'sugerida') mudarStatus(isca, 'aprovada')
  }

  const visiveis = iscas.filter((i) =>
    filtro === 'ativas' ? ['sugerida', 'aprovada'].includes(i.status) : true
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Fish size={22} color="var(--accent)" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>ISCA</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Sugestões diárias de posts geradas pelos SEUS dados — copie, poste e atraia
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn} onClick={() => setFiltro(filtro === 'ativas' ? 'todas' : 'ativas')}>
            {filtro === 'ativas' ? 'Ver histórico' : 'Ver ativas'}
          </button>
          <button style={{ ...btn, color: 'var(--accent)' }} onClick={gerarAgora} disabled={gerando}>
            {gerando ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={14} />}
            Gerar iscas agora
          </button>
          <button style={btn} onClick={carregar}><RefreshCw size={14} /></button>
        </div>
      </div>

      {carregando ? (
        <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)', padding: 30, justifyContent: 'center' }}>
          <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Carregando…
        </div>
      ) : visiveis.length === 0 ? (
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
          borderRadius: 14, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14,
        }}>
          🎣 Nenhuma isca por aqui. Clique em <strong>"Gerar iscas agora"</strong> — o radar
          analisa seus dados e prepara sugestões de post na hora.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 14 }}>
          {visiveis.map((isca) => {
            const t = TIPOS[isca.tipo] ?? TIPOS.sazonal
            const apagada = ['descartada', 'publicada'].includes(isca.status)
            return (
              <div key={isca.id} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
                borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 10,
                opacity: apagada ? 0.5 : 1,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                    background: `${t.color}1d`, color: t.color,
                  }}>
                    {t.emoji} {t.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(isca.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    {isca.status === 'publicada' && ' · publicada ✅'}
                  </span>
                </div>

                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{isca.ideia}</p>

                <pre style={{
                  fontSize: 12.5, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                  fontFamily: 'inherit', background: 'rgba(0,0,0,0.25)', borderRadius: 10,
                  padding: 12, margin: 0, lineHeight: 1.55, flex: 1,
                }}>
                  {isca.legenda}
                </pre>

                {!apagada && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ ...btn, color: copiadaId === isca.id ? '#22C55E' : 'var(--accent)' }} onClick={() => copiar(isca)}>
                      {copiadaId === isca.id ? <Check size={13} /> : <Copy size={13} />}
                      {copiadaId === isca.id ? 'Copiada!' : 'Copiar legenda'}
                    </button>
                    <button style={{ ...btn, color: '#22C55E' }} title="Marcar como publicada" onClick={() => mudarStatus(isca, 'publicada')}>
                      <ThumbsUp size={13} /> Postei
                    </button>
                    <button style={btn} title="Descartar" onClick={() => mudarStatus(isca, 'descartada')}>
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
