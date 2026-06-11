import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { createClient } from '@supabase/supabase-js'
import { Search, Send, User, Loader, MessageSquare, RefreshCw } from 'lucide-react'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const EVOLUTION_URL = import.meta.env.VITE_EVOLUTION_API_URL
const EVOLUTION_KEY = import.meta.env.VITE_EVOLUTION_API_KEY

function formatarHora(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const hoje = new Date()
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1)
  if (d.toDateString() === hoje.toDateString())
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === ontem.toDateString()) return 'Ontem'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function tagContato(c) {
  if (c.aluno_id) return { label: 'Aluno', cor: '#22C55E', bg: 'rgba(34,197,94,0.12)' }
  if (c.lead_id)  return { label: 'Lead',  cor: '#00E5FF', bg: 'rgba(0,229,255,0.12)' }
  return { label: 'Externo', cor: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.06)' }
}

export default function Mensagens() {
  const { box } = useApp()
  const slug = box?.slug || 'bravefit'

  const [conversas, setConversas]         = useState([])
  const [conversa, setConversa]           = useState(null)
  const [mensagens, setMensagens]         = useState([])
  const [busca, setBusca]                 = useState('')
  const [filtro, setFiltro]               = useState('todos')
  const [textoEnvio, setTextoEnvio]       = useState('')
  const [enviando, setEnviando]           = useState(false)
  const [carregando, setCarregando]       = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [templates, setTemplates]         = useState([])
  const [perfil, setPerfil]               = useState(null)
  const messagesEndRef = useRef(null)
  const pollingRef = useRef(null)

  const carregarConversas = useCallback(async () => {
    if (!box?.id) return
    const { data } = await supabase
      .from('mensagens')
      .select('contato_whatsapp, contato_nome, texto, direcao, lida, created_at, lead_id, aluno_id')
      .eq('box_id', box.id)
      .order('created_at', { ascending: false })

    if (!data) return
    const mapa = {}
    for (const m of data) {
      if (!mapa[m.contato_whatsapp]) mapa[m.contato_whatsapp] = { ...m, nao_lidas: 0 }
      if (!m.lida && m.direcao === 'entrada') mapa[m.contato_whatsapp].nao_lidas++
    }
    setConversas(Object.values(mapa).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    setCarregando(false)
  }, [box?.id])

  const carregarMensagens = useCallback(async (whatsapp) => {
    if (!box?.id) return
    const { data } = await supabase
      .from('mensagens')
      .select('*')
      .eq('box_id', box.id)
      .eq('contato_whatsapp', whatsapp)
      .order('created_at', { ascending: true })
    setMensagens(data || [])
    await supabase.from('mensagens')
      .update({ lida: true })
      .eq('box_id', box.id).eq('contato_whatsapp', whatsapp).eq('lida', false)
    setConversas(prev => prev.map(c =>
      c.contato_whatsapp === whatsapp ? { ...c, nao_lidas: 0 } : c
    ))
  }, [box?.id])

  const carregarPerfil = useCallback(async (c) => {
    if (!c) return setPerfil(null)
    if (c.aluno_id) {
      const { data } = await supabase.from('alunos').select('*').eq('id', c.aluno_id).single()
      setPerfil({ tipo: 'aluno', ...data })
    } else if (c.lead_id) {
      const { data } = await supabase.from('leads').select('*').eq('id', c.lead_id).single()
      setPerfil({ tipo: 'lead', ...data })
    } else {
      setPerfil(null)
    }
  }, [])

  const carregarTemplates = useCallback(async () => {
    if (!box?.id) return
    const { data } = await supabase.from('templates')
      .select('key, nome, texto').eq('box_id', box.id).eq('ativo', true)
    setTemplates(data || [])
  }, [box?.id])

  useEffect(() => {
    carregarConversas()
    carregarTemplates()
    pollingRef.current = setInterval(carregarConversas, 15000)
    return () => clearInterval(pollingRef.current)
  }, [carregarConversas, carregarTemplates])

  useEffect(() => {
    if (!conversa) return
    carregarMensagens(conversa.contato_whatsapp)
    carregarPerfil(conversa)
    const t = setInterval(() => carregarMensagens(conversa.contato_whatsapp), 8000)
    return () => clearInterval(t)
  }, [conversa, carregarMensagens, carregarPerfil])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  const enviarMensagem = async (texto) => {
    if (!texto?.trim() || !conversa || enviando) return
    setEnviando(true)
    const to = conversa.contato_whatsapp.replace(/\D/g, '')
    try {
      const res = await fetch(`${EVOLUTION_URL}/message/sendText/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_KEY },
        body: JSON.stringify({ number: to, text: texto }),
      })
      if (!res.ok) throw new Error(`Erro ${res.status}`)
      await supabase.from('mensagens').insert({
        box_id: box.id, contato_whatsapp: conversa.contato_whatsapp,
        contato_nome: conversa.contato_nome, direcao: 'saida', texto, tipo: 'texto',
        lead_id: conversa.lead_id || null, aluno_id: conversa.aluno_id || null, lida: true,
      })
      setTextoEnvio('')
      setShowTemplates(false)
      await carregarMensagens(conversa.contato_whatsapp)
    } catch (err) { alert('Erro ao enviar: ' + err.message) }
    finally { setEnviando(false) }
  }

  const conversasFiltradas = conversas.filter(c => {
    const nome = (c.contato_nome || c.contato_whatsapp).toLowerCase()
    const ok = nome.includes(busca.toLowerCase()) || c.contato_whatsapp.includes(busca)
    if (!ok) return false
    if (filtro === 'leads')    return !!c.lead_id && !c.aluno_id
    if (filtro === 'alunos')   return !!c.aluno_id
    if (filtro === 'externos') return !c.lead_id && !c.aluno_id
    if (filtro === 'nao_lidos') return c.nao_lidas > 0
    return true
  })

  const totalNaoLidas = conversas.reduce((s, c) => s + (c.nao_lidas || 0), 0)

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 60px)', background: 'var(--bg-primary)', overflow: 'hidden' }}>

      {/* ════ PAINEL ESQUERDO ════ */}
      <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.01)' }}>
        {/* Header */}
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={18} color="#00E5FF" />
              <span style={{ fontWeight: 700, fontSize: 15 }}>Mensagens</span>
              {totalNaoLidas > 0 && (
                <span style={{ background: '#FF4444', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{totalNaoLidas}</span>
              )}
            </div>
            <button onClick={carregarConversas} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
              <RefreshCw size={14} />
            </button>
          </div>

          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input id="busca-conversas" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome ou número..."
              style={{ width: '100%', padding: '8px 10px 8px 32px', fontSize: 13, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {[{ key: 'todos', label: 'Todos' }, { key: 'leads', label: 'Leads' }, { key: 'alunos', label: 'Alunos' }, { key: 'externos', label: 'Externos' }, { key: 'nao_lidos', label: '🔴 Não lidos' }].map(f => (
              <button key={f.key} id={`filtro-${f.key}`} onClick={() => setFiltro(f.key)} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 6, cursor: 'pointer', background: filtro === f.key ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${filtro === f.key ? '#00E5FF' : 'var(--border-subtle)'}`, color: filtro === f.key ? '#00E5FF' : 'var(--text-muted)', fontWeight: filtro === f.key ? 600 : 400 }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {carregando && <div style={{ padding: 32, textAlign: 'center' }}><Loader size={24} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite' }} /></div>}
          {!carregando && conversasFiltradas.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>Nenhuma conversa ainda</p>
              <p style={{ fontSize: 11, marginTop: 6 }}>Mensagens recebidas pelo WhatsApp aparecem aqui automaticamente após executar a migration SQL</p>
            </div>
          )}
          {conversasFiltradas.map(c => {
            const tag = tagContato(c)
            const isSelected = conversa?.contato_whatsapp === c.contato_whatsapp
            const nome = c.contato_nome || c.contato_whatsapp
            return (
              <div key={c.contato_whatsapp} id={`conversa-${c.contato_whatsapp.replace(/\D/g, '')}`}
                onClick={() => setConversa(c)}
                style={{ padding: '12px 16px', cursor: 'pointer', background: isSelected ? 'rgba(0,229,255,0.06)' : 'transparent', borderLeft: `3px solid ${isSelected ? '#00E5FF' : 'transparent'}`, borderBottom: '1px solid var(--border-subtle)', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: isSelected ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: tag.cor }}>
                    {nome.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontWeight: c.nao_lidas > 0 ? 700 : 500, fontSize: 13, color: '#E8E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nome.length > 20 ? nome.substring(0, 20) + '…' : nome}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 4 }}>{formatarHora(c.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {c.direcao === 'saida' && '✓ '}{c.texto?.substring(0, 35) || '...'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginLeft: 4 }}>
                        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 5, background: tag.bg, color: tag.cor, fontWeight: 600 }}>{tag.label}</span>
                        {c.nao_lidas > 0 && <span style={{ background: '#22C55E', color: '#000', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{c.nao_lidas}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ════ PAINEL DIREITO — CHAT ════ */}
      {!conversa ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
          <MessageSquare size={48} style={{ opacity: 0.2 }} />
          <p style={{ fontSize: 15 }}>Selecione uma conversa</p>
          <p style={{ fontSize: 12, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>Suas mensagens do WhatsApp aparecem aqui. Você pode responder sem precisar abrir o WhatsApp Web.</p>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Header */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.01)' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,229,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#00E5FF' }}>
              {(conversa.contato_nome || conversa.contato_whatsapp).charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 14 }}>{conversa.contato_nome || conversa.contato_whatsapp}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {conversa.contato_whatsapp}
                {perfil && <span style={{ marginLeft: 8, padding: '1px 6px', borderRadius: 4, background: 'rgba(34,197,94,0.12)', color: '#22C55E', fontSize: 10, fontWeight: 600 }}>{perfil.tipo === 'aluno' ? `Aluno · ${perfil.status}` : `Lead · ${perfil.status}`}</span>}
              </p>
            </div>
            {perfil && (
              <a href={perfil.tipo === 'aluno' ? `/alunos` : `/leads`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                <User size={13} /> Ver perfil
              </a>
            )}
          </div>

          {/* Mensagens */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(0,0,0,0.2)' }}>
            {mensagens.length === 0 && (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, paddingTop: 40 }}>
                Sem mensagens nesta conversa
              </div>
            )}
            {mensagens.map((m, i) => {
              const saida = m.direcao === 'saida'
              const dataAtual = new Date(m.created_at).toDateString()
              const dataPrev = i > 0 ? new Date(mensagens[i-1].created_at).toDateString() : null
              return (
                <div key={m.id}>
                  {dataAtual !== dataPrev && (
                    <div style={{ textAlign: 'center', margin: '8px 0' }}>
                      <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '3px 12px', fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(m.created_at).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: saida ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '72%', padding: '9px 13px', borderRadius: saida ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: saida ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.07)', border: `1px solid ${saida ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}` }}>
                      <p style={{ fontSize: 13, lineHeight: 1.5, color: '#E8E8F0', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                        {m.texto || (m.tipo !== 'texto' ? `[${m.tipo}]` : '')}
                      </p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4, textAlign: 'right' }}>
                        {formatarHora(m.created_at)}{saida && ' ✓✓'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.01)', position: 'relative' }}>
            {showTemplates && (
              <div style={{ position: 'absolute', bottom: '100%', left: 16, right: 16, background: '#0D0D18', border: '1px solid var(--border-subtle)', borderRadius: 12, overflow: 'hidden', marginBottom: 4, maxHeight: 260, overflowY: 'auto' }}>
                <div style={{ padding: '10px 14px', fontSize: 11, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', fontWeight: 600 }}>📋 Escolha um template</div>
                {templates.length === 0 && <div style={{ padding: '12px 14px', fontSize: 12, color: 'var(--text-muted)' }}>Nenhum template ativo cadastrado</div>}
                {templates.map(t => (
                  <div key={t.key} id={`template-${t.key}`}
                    onClick={() => { setTextoEnvio(t.texto.replace('{nome}', conversa.contato_nome || 'cliente').replace('{box_nome}', box?.nome || '')); setShowTemplates(false) }}
                    style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#E8E8F0', marginBottom: 2 }}>{t.nome || t.key}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.texto?.substring(0, 80)}...</p>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button id="btn-templates" onClick={() => setShowTemplates(v => !v)} title="Templates rápidos"
                style={{ padding: '10px 12px', borderRadius: 10, fontSize: 16, background: showTemplates ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showTemplates ? '#00E5FF' : 'var(--border-subtle)'}`, cursor: 'pointer', flexShrink: 0 }}>
                📋
              </button>
              <textarea id="input-mensagem" value={textoEnvio} onChange={e => setTextoEnvio(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(textoEnvio) } }}
                placeholder="Digite sua mensagem... (Enter envia · Shift+Enter quebra linha)"
                rows={2}
                style={{ flex: 1, padding: '10px 14px', fontSize: 13, resize: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', borderRadius: 10, color: 'var(--text-primary)', outline: 'none', lineHeight: 1.5 }}
              />
              <button id="btn-enviar" onClick={() => enviarMensagem(textoEnvio)} disabled={!textoEnvio.trim() || enviando}
                style={{ padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: textoEnvio.trim() && !enviando ? 'linear-gradient(135deg, #16A34A, #22C55E)' : 'rgba(255,255,255,0.04)', border: 'none', color: textoEnvio.trim() && !enviando ? '#000' : 'rgba(255,255,255,0.2)', cursor: textoEnvio.trim() && !enviando ? 'pointer' : 'not-allowed', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                {enviando ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }
      `}</style>
    </div>
  )
}
