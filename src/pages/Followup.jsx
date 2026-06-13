/**
 * src/pages/Followup.jsx
 * Painel de Follow-up com revisão humana (inspirado no BRAVE HUB).
 *
 * Modelo:
 *  - "Envio automático" LIGADO  → sequências ficam 'ativo'; o processar-fila
 *    envia sozinho nos horários (comportamento padrão).
 *  - "Envio automático" DESLIGADO → sequências viram 'pausado'; nada sai
 *    sozinho. Cada lead aparece aqui com a próxima mensagem pronta pra você
 *    revisar, editar e enviar UMA A UMA.
 *
 * O envio usa o mesmo caminho do chat (Evolution API + registro em mensagens).
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ListChecks, Send, SkipForward, CheckCircle2, Loader, Flame, Calendar,
  Search, Edit3, Phone, RefreshCw, Power, Crown,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

const EVOLUTION_URL = import.meta.env.VITE_EVOLUTION_API_URL
const EVOLUTION_KEY = import.meta.env.VITE_EVOLUTION_API_KEY

// Timing sugerido por momento (horas até cada step) — espelha _shared/regras.ts
const HORAS = { agora: [1, 3, 24], em_breve: [3, 24, 72], comparando: [24, 168, 336] }

const MOMENTOS = {
  agora:      { label: 'Quer agora', color: '#FF4444', Icon: Flame },
  em_breve:   { label: 'Em breve',   color: '#FFB800', Icon: Calendar },
  comparando: { label: 'Comparando', color: '#A78BFA', Icon: Search },
}

const btn = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '8px 14px',
  fontSize: 12.5, fontWeight: 600, cursor: 'pointer', background: 'rgba(255,255,255,0.05)',
  color: 'var(--text-secondary)',
}

function fmtQuando(iso) {
  const d = new Date(iso)
  if (d <= new Date()) return { texto: 'Pronta pra enviar', cor: '#22C55E', pronta: true }
  return {
    texto: `Sugerida ${d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`,
    cor: 'var(--text-muted)', pronta: false,
  }
}

export default function Followup() {
  const { box, term, isPro } = useApp()
  const navigate = useNavigate()
  const [itens, setItens] = useState([])      // sequências + lead + texto montado
  const [templates, setTemplates] = useState({})
  const [carregando, setCarregando] = useState(true)
  const [auto, setAuto] = useState(true)
  const [acao, setAcao] = useState(null)       // id em processamento
  const [editando, setEditando] = useState(null) // id em edição
  const [rascunho, setRascunho] = useState('') // texto editado
  const [busca, setBusca] = useState('')

  const montarTexto = useCallback((tmpls, momento, step, nome) => {
    const key = `followup_${momento}_${step}`
    const base = tmpls[key]
    if (!base) return null
    return base
      .replace(/\{nome\}/g, nome || '')
      .replace(/\{box_nome\}/g, box?.nome || 'seu box')
  }, [box?.nome])

  const carregar = useCallback(async () => {
    if (!box?.id) return
    setCarregando(true)

    const [{ data: tmplData }, { data: seqs }] = await Promise.all([
      supabase.from('templates').select('key, texto').eq('box_id', box.id).like('key', 'followup%'),
      supabase
        .from('follow_up_sequencias')
        .select('id, momento_compra, step_atual, proximo_disparo_at, status, leads!inner(id, nome, whatsapp, status, opt_out)')
        .eq('box_id', box.id)
        .in('status', ['ativo', 'pausado'])
        .order('proximo_disparo_at', { ascending: true }),
    ])

    const tmpls = Object.fromEntries((tmplData || []).map((t) => [t.key, t.texto]))
    setTemplates(tmpls)

    // Estado do toggle reflete a realidade: se há sequência 'ativo', o
    // automático está ligado; se só há 'pausado', está em revisão manual.
    const lista0 = seqs || []
    if (lista0.some((s) => s.status === 'ativo')) setAuto(true)
    else if (lista0.length > 0) setAuto(false)
    else setAuto(box.config?.followup_auto !== false)

    const lista = (seqs || [])
      .filter((s) => s.leads && !s.leads.opt_out && !['convertido'].includes(s.leads.status))
      .map((s) => ({
        ...s,
        lead: s.leads,
        texto: montarTexto(tmpls, s.momento_compra, s.step_atual, s.leads.nome),
      }))
    setItens(lista)
    setCarregando(false)
  }, [box, montarTexto])

  useEffect(() => { carregar() }, [carregar])

  // Liga/desliga envio automático: alterna status das sequências do box
  const toggleAuto = async (ligar) => {
    // Ligar o automático é recurso Pro; Básico vai pro upsell
    if (ligar && !isPro) { navigate('/planos'); return }
    setAcao('toggle')
    const de = ligar ? 'pausado' : 'ativo'
    const para = ligar ? 'ativo' : 'pausado'
    await supabase.from('follow_up_sequencias').update({ status: para })
      .eq('box_id', box.id).eq('status', de)
    await supabase.from('boxes').update({ config: { ...(box.config || {}), followup_auto: ligar } }).eq('id', box.id)
    if (box) box.config = { ...(box.config || {}), followup_auto: ligar }
    setAuto(ligar)
    setAcao(null)
    carregar()
  }

  // Avança a sequência (após enviar ou pular)
  const avancar = async (item) => {
    const proximo = item.step_atual + 1
    if (proximo > 3) {
      await supabase.from('follow_up_sequencias').update({ status: 'concluido' }).eq('id', item.id)
    } else {
      const horas = HORAS[item.momento_compra]?.[proximo - 1] ?? 24
      await supabase.from('follow_up_sequencias').update({
        step_atual: proximo,
        proximo_disparo_at: new Date(Date.now() + horas * 3600000).toISOString(),
      }).eq('id', item.id)
    }
  }

  const enviar = async (item, textoFinal) => {
    const texto = (textoFinal ?? item.texto)?.trim()
    if (!texto) return
    setAcao(item.id)
    try {
      const numero = item.lead.whatsapp.replace(/\D/g, '')
      const res = await fetch(`${EVOLUTION_URL}/message/sendText/${box.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: EVOLUTION_KEY },
        body: JSON.stringify({ number: numero, text: texto }),
      })
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'WhatsApp desconectado — reconecte em Configurações' : `Erro ${res.status}`)
      }
      // registra no histórico de mensagens (aparece no chat)
      await supabase.from('mensagens').insert({
        box_id: box.id,
        contato_whatsapp: item.lead.whatsapp,
        contato_nome: item.lead.nome,
        direcao: 'saida', texto, tipo: 'texto',
        lead_id: item.lead.id, lida: true,
      })
      await avancar(item)
      setEditando(null)
      setItens((prev) => prev.filter((i) => i.id !== item.id))
    } catch (err) {
      alert(err.message)
    } finally {
      setAcao(null)
    }
  }

  const pular = async (item) => {
    setAcao(item.id)
    await avancar(item)
    setItens((prev) => prev.filter((i) => i.id !== item.id))
    setAcao(null)
  }

  const encerrar = async (item) => {
    if (!window.confirm(`Encerrar o follow-up de ${item.lead.nome}? A sequência não retoma.`)) return
    setAcao(item.id)
    await supabase.from('follow_up_sequencias').update({ status: 'concluido' }).eq('id', item.id)
    setItens((prev) => prev.filter((i) => i.id !== item.id))
    setAcao(null)
  }

  const visiveis = itens.filter((i) =>
    !busca || i.lead.nome.toLowerCase().includes(busca.toLowerCase()) || i.lead.whatsapp.includes(busca)
  )
  const prontas = visiveis.filter((i) => new Date(i.proximo_disparo_at) <= new Date()).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ListChecks size={22} color="var(--accent)" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Follow-up</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Revise e envie o follow-up dos seus {term('clientes', 'leads').toLowerCase()} uma mensagem por vez
            </p>
          </div>
        </div>
        <button style={btn} onClick={carregar}><RefreshCw size={14} /> Atualizar</button>
      </div>

      {/* Toggle de modo */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        background: auto ? 'rgba(34,197,94,0.06)' : 'rgba(255,184,0,0.06)',
        border: `1px solid ${auto ? 'rgba(34,197,94,0.25)' : 'rgba(255,184,0,0.25)'}`,
        borderRadius: 12, padding: '14px 18px',
      }}>
        <div>
          <p style={{ fontSize: 14, fontWeight: 700, color: auto ? '#22C55E' : '#FFB800' }}>
            {auto ? '⚡ Envio automático LIGADO' : '✋ Revisão manual (automático desligado)'}
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
            {auto
              ? 'O sistema envia os follow-ups sozinho nos horários. Você ainda pode adiantar/encerrar manualmente abaixo.'
              : 'Nada é enviado automaticamente. Você controla cada mensagem aqui embaixo.'}
          </p>
        </div>
        {!auto && !isPro ? (
          <button
            style={{ ...btn, color: '#1a1500', border: 'none', background: 'linear-gradient(135deg, #FFB800, #FF8A00)', fontWeight: 800 }}
            onClick={() => navigate('/planos')}
          >
            <Crown size={14} /> Ligar automático (Pro)
          </button>
        ) : (
          <button
            style={{ ...btn, color: auto ? '#FFB800' : '#22C55E', borderColor: auto ? 'rgba(255,184,0,0.4)' : 'rgba(34,197,94,0.4)' }}
            onClick={() => toggleAuto(!auto)}
            disabled={acao === 'toggle'}
          >
            <Power size={14} /> {auto ? 'Desligar automático' : 'Ligar automático'}
          </button>
        )}
      </div>

      {/* Busca + contador */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={busca} onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou WhatsApp…"
            style={{ width: '100%', padding: '9px 12px 9px 34px', fontSize: 13, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)' }}
          />
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
          {visiveis.length} em follow-up · <strong style={{ color: '#22C55E' }}>{prontas}</strong> prontas pra enviar
        </span>
      </div>

      {/* Lista */}
      {carregando ? (
        <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)', padding: 30, justifyContent: 'center' }}>
          <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Carregando…
        </div>
      ) : visiveis.length === 0 ? (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
          🎉 Nenhum follow-up pendente. Quando entrarem leads novos, a sequência aparece aqui.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visiveis.map((item) => {
            const m = MOMENTOS[item.momento_compra] || { label: item.momento_compra, color: '#6B7280', Icon: Flame }
            const quando = fmtQuando(item.proximo_disparo_at)
            const emEdicao = editando === item.id
            const semTemplate = !item.texto
            return (
              <div key={item.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 14, padding: 16 }}>
                {/* Cabeçalho do lead */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{item.lead.nome}</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${m.color}1d`, color: m.color }}>
                      <m.Icon size={11} /> {m.label}
                    </span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Mensagem {item.step_atual} de 3</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--text-muted)' }}>
                      <Phone size={11} /> {item.lead.whatsapp}
                    </span>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: quando.cor }}>{quando.texto}</span>
                </div>

                {/* Mensagem */}
                {semTemplate ? (
                  <p style={{ fontSize: 13, color: '#FFB800', background: 'rgba(255,184,0,0.08)', padding: 12, borderRadius: 10 }}>
                    ⚠️ Sem template de follow-up para "{item.momento_compra}" (passo {item.step_atual}). Edite o texto abaixo ou encerre.
                  </p>
                ) : emEdicao ? (
                  <textarea
                    value={rascunho} onChange={(e) => setRascunho(e.target.value)} rows={5}
                    style={{ width: '100%', fontSize: 13, lineHeight: 1.55, fontFamily: 'inherit', background: 'rgba(0,0,0,0.25)', color: 'var(--text-primary)', border: '1px solid rgba(0,229,255,0.3)', borderRadius: 10, padding: 12, resize: 'vertical' }}
                  />
                ) : (
                  <pre style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'inherit', background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: 12, margin: 0, lineHeight: 1.55 }}>
                    {item.texto}
                  </pre>
                )}

                {/* Ações */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {emEdicao ? (
                    <>
                      <button style={{ ...btn, color: '#22C55E', borderColor: 'rgba(34,197,94,0.4)' }} disabled={acao === item.id} onClick={() => enviar(item, rascunho)}>
                        {acao === item.id ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />} Enviar editada
                      </button>
                      <button style={btn} onClick={() => setEditando(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button style={{ ...btn, background: 'rgba(34,197,94,0.12)', color: '#22C55E', borderColor: 'rgba(34,197,94,0.4)' }} disabled={acao === item.id || semTemplate} onClick={() => enviar(item)}>
                        {acao === item.id ? <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />} Enviar agora
                      </button>
                      <button style={btn} onClick={() => { setEditando(item.id); setRascunho(item.texto || '') }}>
                        <Edit3 size={13} /> Editar
                      </button>
                      <button style={btn} disabled={acao === item.id} onClick={() => pular(item)}>
                        <SkipForward size={13} /> Pular
                      </button>
                      <button style={{ ...btn, color: 'var(--text-muted)' }} disabled={acao === item.id} onClick={() => encerrar(item)}>
                        <CheckCircle2 size={13} /> Encerrar
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
