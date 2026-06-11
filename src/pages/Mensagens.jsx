import { useState, useEffect, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { createClient } from '@supabase/supabase-js'
import { Search, Send, User, Loader, MessageSquare, RefreshCw, Paperclip, Mic, MicOff, Bot, Check, X, Edit3, Volume2, FileText, Image } from 'lucide-react'

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

const normalizar = (n) => n?.replace(/\D/g, '') ?? ''

// ─── Renderizador de mídia ────────────────────────────────────────────────────
function MidiaMsg({ tipo, mediaUrl, texto }) {
  const [imgError, setImgError] = useState(false)
  const [lightbox, setLightbox] = useState(false)

  if (tipo === 'imagem' && mediaUrl && !imgError) {
    return (
      <>
        <img
          src={mediaUrl}
          alt="imagem"
          onError={() => setImgError(true)}
          onClick={() => setLightbox(true)}
          style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, cursor: 'zoom-in', display: 'block', marginBottom: 4 }}
        />
        {lightbox && (
          <div onClick={() => setLightbox(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
            <img src={mediaUrl} alt="imagem" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8 }} />
          </div>
        )}
      </>
    )
  }

  if (tipo === 'audio' && mediaUrl) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
        <Volume2 size={16} color="#00E5FF" />
        <audio controls src={mediaUrl} style={{ height: 32, flex: 1 }} />
      </div>
    )
  }

  if (tipo === 'doc' && mediaUrl) {
    const nomeArq = mediaUrl.split('/').pop() || 'documento'
    return (
      <a href={mediaUrl} target="_blank" rel="noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 8, textDecoration: 'none', color: '#E8E8F0', fontSize: 12 }}>
        <FileText size={18} color="#FFB800" />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeArq}</span>
        <span style={{ fontSize: 10, color: '#00E5FF' }}>Baixar</span>
      </a>
    )
  }

  if (tipo === 'sticker' && mediaUrl) {
    return <img src={mediaUrl} alt="sticker" style={{ width: 80, height: 80 }} />
  }

  // texto simples ou fallback
  return <p style={{ fontSize: 13, lineHeight: 1.5, color: '#E8E8F0', wordBreak: 'break-word', whiteSpace: 'pre-wrap', margin: 0 }}>{texto || (tipo !== 'texto' ? `[${tipo}]` : '')}</p>
}

// ─── Card de sugestão da IA ───────────────────────────────────────────────────
function CardIASugestao({ sugestao, onAprovar, onDescartar }) {
  const [editando, setEditando] = useState(false)
  const [textoEdit, setTextoEdit] = useState(sugestao.texto_sugerido)

  return (
    <div style={{ margin: '8px 0', padding: '12px 14px', background: 'rgba(250,204,21,0.07)', border: '1px solid rgba(250,204,21,0.25)', borderRadius: 12, borderLeft: '3px solid #FACC15' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Bot size={14} color="#FACC15" />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#FACC15' }}>Sugestão da IA</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{formatarHora(sugestao.created_at)}</span>
      </div>
      {editando ? (
        <textarea value={textoEdit} onChange={e => setTextoEdit(e.target.value)}
          rows={3} autoFocus
          style={{ width: '100%', padding: '8px 10px', fontSize: 12, resize: 'vertical', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(250,204,21,0.3)', borderRadius: 8, color: '#E8E8F0', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box', marginBottom: 8 }} />
      ) : (
        <p style={{ fontSize: 12, lineHeight: 1.6, color: '#E8E8F0', margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{textoEdit}</p>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={() => onAprovar(textoEdit)} style={{ flex: 1, padding: '5px 0', borderRadius: 7, fontSize: 11, fontWeight: 700, background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)', color: '#22C55E', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Check size={12} /> Enviar
        </button>
        <button onClick={() => setEditando(!editando)} style={{ flex: 1, padding: '5px 0', borderRadius: 7, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Edit3 size={12} /> {editando ? 'Confirmar' : 'Editar'}
        </button>
        <button onClick={() => onDescartar(sugestao.id)} style={{ padding: '5px 10px', borderRadius: 7, fontSize: 11, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
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
  const [sugestaoIA, setSugestaoIA]       = useState(null)
  const [gravando, setGravando]           = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState('conectando')
  const [showInfo, setShowInfo]           = useState(true)
  const messagesEndRef  = useRef(null)
  const mediaRecRef     = useRef(null)
  const audioChunksRef  = useRef([])
  const fileInputRef    = useRef(null)
  const conversaRef     = useRef(null)
  const mensagensRef    = useRef([])

  useEffect(() => { conversaRef.current = conversa }, [conversa])
  useEffect(() => { mensagensRef.current = mensagens }, [mensagens])

  // ─── Conversas ────────────────────────────────────────────────────────────
  const carregarConversas = useCallback(async () => {
    if (!box?.id) return
    const { data } = await supabase
      .from('mensagens')
      .select('contato_whatsapp, contato_nome, texto, direcao, lida, created_at, lead_id, aluno_id, tipo')
      .eq('box_id', box.id)
      .order('created_at', { ascending: false })

    setCarregando(false)
    if (!data || data.length === 0) return  // nunca limpa sidebar com dado vazio
    const mapa = {}
    for (const m of data) {
      if (!mapa[m.contato_whatsapp]) mapa[m.contato_whatsapp] = { ...m, nao_lidas: 0 }
      if (!m.lida && m.direcao === 'entrada') mapa[m.contato_whatsapp].nao_lidas++
    }
    setConversas(Object.values(mapa).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
  }, [box?.id])

  // ─── Mensagens da conversa ────────────────────────────────────────────────
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

  // ─── Sugestão IA da conversa aberta ──────────────────────────────────────
  const carregarSugestaoIA = useCallback(async (whatsapp) => {
    if (!box?.id) return
    const { data } = await supabase
      .from('ia_sugestoes')
      .select('*')
      .eq('box_id', box.id)
      .eq('whatsapp', whatsapp)
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    setSugestaoIA(data || null)
  }, [box?.id])

  // ─── Perfil ───────────────────────────────────────────────────────────────
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

  // ─── Realtime ─────────────────────────────────────────────────────────────
  // Sem filtro server-side (funciona independente da configuração da publication).
  // Filtragem por box_id feita no callback. Sidebar atualizada inline, sem refetch.
  useEffect(() => {
    if (!box?.id) return
    carregarConversas()
    carregarTemplates()
    setRealtimeStatus('conectando')

    const canal = supabase
      .channel(`chat-${box.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens' }, (payload) => {
        const nova = payload.new
        if (nova.box_id !== box.id) return

        const isAtiva = conversaRef.current &&
          normalizar(nova.contato_whatsapp) === normalizar(conversaRef.current.contato_whatsapp)

        // Atualiza sidebar inline — sem fetch, sem flicker
        setConversas(prev => {
          const idx = prev.findIndex(c => normalizar(c.contato_whatsapp) === normalizar(nova.contato_whatsapp))
          const incremento = !isAtiva && nova.direcao === 'entrada' ? 1 : 0
          if (idx >= 0) {
            const atualizado = {
              ...prev[idx],
              texto: nova.texto,
              created_at: nova.created_at,
              direcao: nova.direcao,
              tipo: nova.tipo,
              nao_lidas: isAtiva ? 0 : (prev[idx].nao_lidas || 0) + incremento,
            }
            const lista = [...prev]
            lista.splice(idx, 1)
            return [atualizado, ...lista]
          }
          return [{
            contato_whatsapp: nova.contato_whatsapp,
            contato_nome: nova.contato_nome,
            texto: nova.texto,
            direcao: nova.direcao,
            tipo: nova.tipo,
            lida: isAtiva || nova.direcao === 'saida',
            created_at: nova.created_at,
            lead_id: nova.lead_id,
            aluno_id: nova.aluno_id,
            nao_lidas: incremento,
          }, ...prev]
        })

        // Adiciona na conversa aberta
        if (isAtiva) {
          setMensagens(prev => prev.some(m => m.id === nova.id) ? prev : [...prev, nova])
          if (nova.direcao === 'entrada') {
            supabase.from('mensagens').update({ lida: true }).eq('id', nova.id)
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ia_sugestoes' }, (payload) => {
        const nova = payload.new
        if (nova.box_id !== box.id) return
        if (!conversaRef.current) return
        if (normalizar(nova.whatsapp) !== normalizar(conversaRef.current.contato_whatsapp)) return
        if (payload.eventType === 'INSERT' && nova.status === 'pendente') setSugestaoIA(nova)
        else if (payload.eventType === 'UPDATE' && nova.status !== 'pendente') setSugestaoIA(null)
      })

    canal.subscribe((status) => {
      if (status === 'SUBSCRIBED') setRealtimeStatus('conectado')
      else if (status === 'CLOSED') setRealtimeStatus('desconectado')
      else setRealtimeStatus('erro')
    })

    return () => { supabase.removeChannel(canal) }
  }, [box?.id, carregarConversas, carregarTemplates])

  // ─── Polling fallback (garante mensagens mesmo se Realtime não entregar) ──
  useEffect(() => {
    if (!box?.id) return

    const pollMensagens = async () => {
      // 1. Novas mensagens na conversa aberta
      if (conversaRef.current) {
        const msgs = mensagensRef.current
        const since = msgs.length > 0
          ? msgs[msgs.length - 1].created_at
          : new Date(Date.now() - 120000).toISOString()

        const { data: novas } = await supabase
          .from('mensagens')
          .select('*')
          .eq('box_id', box.id)
          .eq('contato_whatsapp', conversaRef.current.contato_whatsapp)
          .gte('created_at', since)
          .order('created_at', { ascending: true })

        if (novas && novas.length > 0) {
          setMensagens(prev => {
            const ids = new Set(prev.map(m => m.id))
            const adicionais = novas.filter(m => !ids.has(m.id))
            return adicionais.length > 0 ? [...prev, ...adicionais] : prev
          })
          const ultima = novas[novas.length - 1]
          setConversas(prev => prev.map(c =>
            normalizar(c.contato_whatsapp) === normalizar(conversaRef.current?.contato_whatsapp || '')
              ? { ...c, texto: ultima.texto, created_at: ultima.created_at, direcao: ultima.direcao, tipo: ultima.tipo }
              : c
          ))
        }
      }

      // 2. Refresh da sidebar (novas conversas, contadores) — nunca limpa
      const { data: sidebarData } = await supabase
        .from('mensagens')
        .select('contato_whatsapp, contato_nome, texto, direcao, lida, created_at, lead_id, aluno_id, tipo')
        .eq('box_id', box.id)
        .order('created_at', { ascending: false })

      if (sidebarData && sidebarData.length > 0) {
        const mapa = {}
        for (const m of sidebarData) {
          if (!mapa[m.contato_whatsapp]) mapa[m.contato_whatsapp] = { ...m, nao_lidas: 0 }
          if (!m.lida && m.direcao === 'entrada') mapa[m.contato_whatsapp].nao_lidas++
        }
        const lista = Object.values(mapa).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        setConversas(lista)
        setCarregando(false)
      }
    }

    const interval = setInterval(pollMensagens, 4000)
    return () => clearInterval(interval)
  }, [box?.id])

  // ─── Carregar dados quando a conversa selecionada mudar ───────────────────
  useEffect(() => {
    if (!conversa || !box?.id) {
      setMensagens([])
      setSugestaoIA(null)
      setPerfil(null)
      return
    }

    carregarMensagens(conversa.contato_whatsapp)
    carregarPerfil(conversa)
    carregarSugestaoIA(conversa.contato_whatsapp)
  }, [conversa, box?.id, carregarMensagens, carregarPerfil, carregarSugestaoIA])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens, sugestaoIA])

  // ─── Enviar texto ─────────────────────────────────────────────────────────
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
      const newId = crypto.randomUUID()
      const novaMensagem = {
        id: newId,
        box_id: box.id,
        contato_whatsapp: conversa.contato_whatsapp,
        contato_nome: conversa.contato_nome,
        direcao: 'saida',
        texto,
        tipo: 'texto',
        lead_id: conversa.lead_id || null,
        aluno_id: conversa.aluno_id || null,
        lida: true,
        created_at: new Date().toISOString(),
      }
      await supabase.from('mensagens').insert(novaMensagem)
      setMensagens(prev => [...prev, novaMensagem])
      setTextoEnvio('')
      setShowTemplates(false)
    } catch (err) { alert('Erro ao enviar: ' + err.message) }
    finally { setEnviando(false) }
  }

  // ─── Enviar mídia (imagem / doc) ──────────────────────────────────────────
  const enviarMidia = async (arquivo) => {
    if (!arquivo || !conversa) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('number', conversa.contato_whatsapp.replace(/\D/g, ''))
      formData.append('mediatype', arquivo.type.startsWith('image') ? 'image' : arquivo.type.startsWith('audio') ? 'audio' : 'document')
      formData.append('media', arquivo)
      formData.append('caption', '')

      const res = await fetch(`${EVOLUTION_URL}/message/sendMedia/${slug}`, {
        method: 'POST',
        headers: { 'apikey': EVOLUTION_KEY },
        body: formData,
      })
      if (!res.ok) throw new Error(`Erro ${res.status}`)

      const tipo = arquivo.type.startsWith('image') ? 'imagem' : arquivo.type.startsWith('audio') ? 'audio' : 'doc'
      const localUrl = URL.createObjectURL(arquivo)
      await supabase.from('mensagens').insert({
        box_id: box.id, contato_whatsapp: conversa.contato_whatsapp,
        contato_nome: conversa.contato_nome, direcao: 'saida',
        texto: arquivo.name, tipo, media_url: localUrl,
        lead_id: conversa.lead_id || null, aluno_id: conversa.aluno_id || null, lida: true,
      })
    } catch (err) { alert('Erro ao enviar mídia: ' + err.message) }
    finally { setUploading(false) }
  }

  // ─── Gravar áudio ─────────────────────────────────────────────────────────
  const toggleGravacao = async () => {
    if (gravando) {
      mediaRecRef.current?.stop()
      setGravando(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      audioChunksRef.current = []
      rec.ondataavailable = e => audioChunksRef.current.push(e.data)
      rec.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], 'audio.webm', { type: 'audio/webm' })
        enviarMidia(file)
        stream.getTracks().forEach(t => t.stop())
      }
      rec.start()
      mediaRecRef.current = rec
      setGravando(true)
    } catch { alert('Permita acesso ao microfone para gravar áudio.') }
  }

  // ─── Aprovação sugestão IA ────────────────────────────────────────────────
  const aprovarSugestao = async (texto) => {
    await enviarMensagem(texto)
    if (sugestaoIA?.id) {
      await supabase.from('ia_sugestoes').update({ status: 'aprovado' }).eq('id', sugestaoIA.id)
      setSugestaoIA(null)
    }
  }

  const descartarSugestao = async (id) => {
    await supabase.from('ia_sugestoes').update({ status: 'descartado' }).eq('id', id)
    setSugestaoIA(null)
  }

  // ─── Filtros ──────────────────────────────────────────────────────────────
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
    <div style={{ display: 'flex', height: 'calc(100vh - var(--topbar-height))', width: 'calc(100% + 48px)', margin: '-24px', background: 'var(--bg-primary)', overflow: 'hidden' }}>

      {/* ════ PAINEL ESQUERDO ════ */}
      <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={18} color="#00E5FF" />
              <span style={{ fontWeight: 700, fontSize: 15 }}>Mensagens</span>
              {totalNaoLidas > 0 && (
                <span style={{ background: '#FF4444', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{totalNaoLidas}</span>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8 }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: realtimeStatus === 'conectado' ? '#22C55E' : realtimeStatus === 'conectando' ? '#FACC15' : '#EF4444',
                  boxShadow: realtimeStatus === 'conectado' ? '0 0 8px #22C55E' : 'none',
                  animation: realtimeStatus === 'conectando' ? 'pulse 1s infinite' : 'none'
                }} />
                <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 500 }}>
                  {realtimeStatus === 'conectado' ? 'Realtime' : realtimeStatus === 'conectando' ? 'Conectando' : 'Erro Sync'}
                </span>
              </div>
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

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {carregando && <div style={{ padding: 32, textAlign: 'center' }}><Loader size={24} color="var(--text-muted)" style={{ animation: 'spin 1s linear infinite' }} /></div>}
          {!carregando && conversasFiltradas.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>Nenhuma conversa ainda</p>
              <p style={{ fontSize: 11, marginTop: 6 }}>Execute a migration SQL 008 para ativar o histórico de mensagens</p>
            </div>
          )}
          {conversasFiltradas.map(c => {
            const tag = tagContato(c)
            const isSelected = conversa?.contato_whatsapp === c.contato_whatsapp
            const nomeExib = c.contato_nome || c.contato_whatsapp
            const previewTexto = c.tipo !== 'texto' ? `[${c.tipo}]` : (c.texto?.substring(0, 35) || '...')
            return (
              <div key={c.contato_whatsapp} id={`conversa-${c.contato_whatsapp.replace(/\D/g, '')}`}
                onClick={() => setConversa(c)}
                style={{ padding: '12px 16px', cursor: 'pointer', background: isSelected ? 'rgba(0,229,255,0.06)' : 'transparent', borderLeft: `3px solid ${isSelected ? '#00E5FF' : 'transparent'}`, borderBottom: '1px solid var(--border-subtle)', transition: 'all 0.15s' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: isSelected ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: tag.cor }}>
                    {nomeExib.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontWeight: c.nao_lidas > 0 ? 700 : 500, fontSize: 13, color: '#E8E8F0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nomeExib.length > 20 ? nomeExib.substring(0, 20) + '…' : nomeExib}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0, marginLeft: 4 }}>{formatarHora(c.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {c.direcao === 'saida' && '✓ '}{previewTexto}
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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--bg-primary)' }}>
        
        {/* Aba Informativa (Objetivos e Instruções) */}
        <div style={{ 
          background: 'rgba(0, 229, 255, 0.02)', 
          borderBottom: '1px solid var(--border-subtle)',
          padding: '10px 20px',
          fontSize: 12,
          color: 'var(--text-secondary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setShowInfo(!showInfo)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#00E5FF' }}>
              <Bot size={14} />
              <span>Instruções e Objetivos da Tela de Chat</span>
            </div>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {showInfo ? 'Recolher ▲' : 'Expandir ▼'}
            </span>
          </div>
          
          {showInfo && (
            <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, lineHeight: 1.5, animation: 'fadeIn 0.2s ease-out' }}>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 4, color: '#E8E8F0', fontSize: 11 }}>🎯 Objetivo</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>Centralizar o atendimento do seu Box. Receba mensagens em tempo real (delay ~100ms) de leads e alunos e interaja diretamente sem precisar abrir o WhatsApp Web.</p>
              </div>
              <div>
                <p style={{ fontWeight: 600, marginBottom: 4, color: '#E8E8F0', fontSize: 11 }}>🧪 Como Testar Facilmente</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: 0 }}>Com esta conversa aberta, envie um WhatsApp para o número do seu Box. A mensagem deve aparecer <b>imediatamente</b> no chat. O status <span style={{ color: '#22C55E', fontWeight: 600 }}>Realtime</span> confirma a sincronia.</p>
              </div>
            </div>
          )}
        </div>

        {!conversa ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-muted)' }}>
            <MessageSquare size={48} style={{ opacity: 0.2 }} />
            <p style={{ fontSize: 15 }}>Selecione uma conversa</p>
            <p style={{ fontSize: 12, textAlign: 'center', maxWidth: 280, lineHeight: 1.6 }}>Suas mensagens do WhatsApp aparecem aqui em tempo real. Responda sem abrir o WhatsApp Web.</p>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Header conversa */}
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
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(0,0,0,0.2)' }}>
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
                    <div style={{ maxWidth: '72%', padding: m.tipo === 'imagem' ? '4px 6px' : '9px 13px', borderRadius: saida ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: saida ? 'rgba(34,197,94,0.18)' : 'rgba(255,255,255,0.07)', border: `1px solid ${saida ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}` }}>
                      <MidiaMsg tipo={m.tipo} mediaUrl={m.media_url} texto={m.texto} />
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4, textAlign: 'right' }}>
                        {formatarHora(m.created_at)}{saida && ' ✓✓'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Card de sugestão da IA */}
            {sugestaoIA && (
              <CardIASugestao
                sugestao={sugestaoIA}
                onAprovar={aprovarSugestao}
                onDescartar={descartarSugestao}
              />
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input + ferramentas */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(255,255,255,0.01)', position: 'relative' }}>
            {/* Templates */}
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

            {/* Barra de gravação */}
            {gravando && (
              <div style={{ marginBottom: 8, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#EF4444' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite' }} />
                Gravando áudio... Clique no microfone para parar e enviar
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              {/* Botão templates */}
              <button id="btn-templates" onClick={() => setShowTemplates(v => !v)} title="Templates rápidos"
                style={{ padding: '10px 12px', borderRadius: 10, fontSize: 16, background: showTemplates ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.05)', border: `1px solid ${showTemplates ? '#00E5FF' : 'var(--border-subtle)'}`, cursor: 'pointer', flexShrink: 0 }}>
                📋
              </button>

              {/* Botão arquivo */}
              <input ref={fileInputRef} type="file" accept="image/*,audio/*,application/pdf,.doc,.docx" style={{ display: 'none' }}
                onChange={e => { if (e.target.files[0]) enviarMidia(e.target.files[0]); e.target.value = '' }} />
              <button id="btn-anexar" onClick={() => fileInputRef.current?.click()} title="Enviar imagem, áudio ou documento"
                disabled={uploading}
                style={{ padding: '10px 12px', borderRadius: 10, background: uploading ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', cursor: uploading ? 'not-allowed' : 'pointer', flexShrink: 0, color: uploading ? '#00E5FF' : 'var(--text-muted)' }}>
                {uploading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Paperclip size={16} />}
              </button>

              {/* Textarea */}
              <textarea id="input-mensagem" value={textoEnvio} onChange={e => setTextoEnvio(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagem(textoEnvio) } }}
                placeholder={gravando ? 'Gravando áudio...' : 'Digite sua mensagem... (Enter envia · Shift+Enter quebra linha)'}
                rows={2} disabled={gravando}
                style={{ flex: 1, padding: '10px 14px', fontSize: 13, resize: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', borderRadius: 10, color: 'var(--text-primary)', outline: 'none', lineHeight: 1.5 }}
              />

              {/* Botão microfone */}
              <button id="btn-microfone" onClick={toggleGravacao} title={gravando ? 'Parar gravação' : 'Gravar áudio'}
                style={{ padding: '10px 12px', borderRadius: 10, background: gravando ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${gravando ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)'}`, cursor: 'pointer', flexShrink: 0, color: gravando ? '#EF4444' : 'var(--text-muted)' }}>
                {gravando ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              {/* Botão enviar */}
              <button id="btn-enviar" onClick={() => enviarMensagem(textoEnvio)} disabled={!textoEnvio.trim() || enviando || gravando}
                style={{ padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: textoEnvio.trim() && !enviando ? 'linear-gradient(135deg, #16A34A, #22C55E)' : 'rgba(255,255,255,0.04)', border: 'none', color: textoEnvio.trim() && !enviando ? '#000' : 'rgba(255,255,255,0.2)', cursor: textoEnvio.trim() && !enviando ? 'pointer' : 'not-allowed', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}>
                {enviando ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }
      `}</style>
    </div>
  )
}
