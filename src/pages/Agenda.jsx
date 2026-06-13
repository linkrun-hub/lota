/**
 * src/pages/Agenda.jsx
 * Painel do Bloco AGENDA (Fase 2): serviços, disponibilidade e agendamentos.
 * Página pública correspondente: /agendar/:slug
 */
import { useState, useEffect, useCallback } from 'react'
import {
  Calendar, Plus, Trash2, Copy, Check, X, Clock,
  CheckCircle2, UserCheck, UserX, Loader,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

const STATUS_APT = {
  agendado:   { label: 'Agendado',    color: '#00E5FF' },
  confirmado: { label: 'Confirmado',  color: '#A78BFA' },
  compareceu: { label: 'Compareceu',  color: '#22C55E' },
  no_show:    { label: 'Não veio',    color: '#FF4444' },
  cancelado:  { label: 'Cancelado',   color: '#6B7280' },
}

const input = {
  padding: '9px 12px', fontSize: 13, background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)',
}
const btn = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
  borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600,
  color: 'var(--text-secondary)', cursor: 'pointer',
}
const card = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
  borderRadius: 14, padding: 18,
}

export default function Agenda() {
  const { box } = useApp()
  const [aba, setAba] = useState('agendamentos')
  const [servicos, setServicos] = useState([])
  const [disponibilidades, setDisponibilidades] = useState([])
  const [agendamentos, setAgendamentos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [copiado, setCopiado] = useState(false)

  const [novoServico, setNovoServico] = useState(null)
  const [novaJanela, setNovaJanela] = useState({}) // service_id → {dia, inicio, fim}

  const carregar = useCallback(async () => {
    if (!box?.id) return
    setCarregando(true)
    const [s, d, a] = await Promise.all([
      supabase.from('services').select('*').eq('box_id', box.id).order('nome'),
      supabase.from('availability').select('*').eq('box_id', box.id),
      supabase.from('appointments').select('*, services(nome)').eq('box_id', box.id)
        .gte('data_hora', new Date(Date.now() - 86400000).toISOString())
        .order('data_hora'),
    ])
    setServicos(s.data || [])
    setDisponibilidades(d.data || [])
    setAgendamentos(a.data || [])
    setCarregando(false)
  }, [box?.id])

  useEffect(() => { carregar() }, [carregar])

  const linkPublico = `${window.location.origin}/agendar/${box?.slug}`

  const copiarLink = () => {
    navigator.clipboard.writeText(linkPublico)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  // ─── Serviços ──────────────────────────────────────────────────────────────
  const salvarServico = async () => {
    if (!novoServico?.nome) return
    await supabase.from('services').insert({
      box_id: box.id,
      nome: novoServico.nome,
      descricao: novoServico.descricao || null,
      duracao_min: Number(novoServico.duracao_min) || 60,
      preco: Number(novoServico.preco) || 0,
      capacidade: Number(novoServico.capacidade) || 1,
      ativo: true,
    })
    setNovoServico(null)
    carregar()
  }

  const toggleServico = async (s) => {
    await supabase.from('services').update({ ativo: !s.ativo }).eq('id', s.id)
    carregar()
  }

  const excluirServico = async (s) => {
    if (!window.confirm(`Excluir o serviço "${s.nome}"? Agendamentos dele também somem.`)) return
    await supabase.from('services').delete().eq('id', s.id)
    carregar()
  }

  // ─── Disponibilidade ───────────────────────────────────────────────────────
  const addJanela = async (serviceId) => {
    const j = novaJanela[serviceId]
    if (!j?.inicio || !j?.fim) return
    await supabase.from('availability').insert({
      box_id: box.id, service_id: serviceId,
      dia_semana: Number(j.dia ?? 1), hora_inicio: j.inicio, hora_fim: j.fim,
      vagas: j.vagas ? Number(j.vagas) : null,
    })
    setNovaJanela((p) => ({ ...p, [serviceId]: {} }))
    carregar()
  }

  const removerJanela = async (id) => {
    await supabase.from('availability').delete().eq('id', id)
    carregar()
  }

  // ─── Agendamentos ──────────────────────────────────────────────────────────
  const mudarStatus = async (apt, status) => {
    await supabase.from('appointments').update({ status }).eq('id', apt.id)
    // No-show → follow-up de remarcação pela fila
    if (status === 'no_show' && apt.lead_id) {
      await supabase.from('disparo_fila').insert({
        box_id: box.id,
        destinatario_tipo: 'lead',
        destinatario_id: apt.lead_id,
        canal: 'whatsapp',
        template_key: 'agendamento_no_show',
        payload: { nome: apt.nome, box_nome: box.nome, servico: apt.services?.nome || 'agendamento' },
        agendado_para: new Date().toISOString(),
        status: 'pendente',
      })
    }
    carregar()
  }

  const fmtData = (iso) => {
    const d = new Date(iso)
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header + link público */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Calendar size={22} color="var(--accent)" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Agenda</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Aulas experimentais, avaliações e serviços agendáveis pelo link público
            </p>
          </div>
        </div>
        <button style={btn} onClick={copiarLink}>
          {copiado ? <Check size={14} color="#22C55E" /> : <Copy size={14} />}
          {copiado ? 'Copiado!' : linkPublico.replace(/^https?:\/\//, '')}
        </button>
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[['agendamentos', 'Agendamentos'], ['servicos', 'Serviços e horários']].map(([k, l]) => (
          <button key={k} onClick={() => setAba(k)} style={{
            ...btn,
            background: aba === k ? 'rgba(0,229,255,0.12)' : btn.background,
            color: aba === k ? 'var(--accent)' : btn.color,
            borderColor: aba === k ? 'rgba(0,229,255,0.4)' : 'var(--border-subtle)',
          }}>
            {l}
          </button>
        ))}
      </div>

      {carregando && (
        <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)', padding: 30, justifyContent: 'center' }}>
          <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Carregando…
        </div>
      )}

      {/* ─── ABA AGENDAMENTOS ─── */}
      {!carregando && aba === 'agendamentos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {agendamentos.length === 0 && (
            <div style={{ ...card, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              Nenhum agendamento futuro. Compartilhe o link público pra começar! 🚀
            </div>
          )}
          {agendamentos.map((a) => {
            const st = STATUS_APT[a.status] || STATUS_APT.agendado
            return (
              <div key={a.id} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{a.nome}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${st.color}22`, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
                    <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                    {fmtData(a.data_hora)} · {a.services?.nome} · {a.whatsapp}
                  </p>
                </div>
                {['agendado', 'confirmado'].includes(a.status) && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ ...btn, color: '#22C55E' }} title="Compareceu" onClick={() => mudarStatus(a, 'compareceu')}>
                      <UserCheck size={14} /> Veio
                    </button>
                    <button style={{ ...btn, color: '#FF4444' }} title="Não compareceu (dispara remarcação)" onClick={() => mudarStatus(a, 'no_show')}>
                      <UserX size={14} /> Faltou
                    </button>
                    <button style={btn} title="Cancelar" onClick={() => mudarStatus(a, 'cancelado')}>
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ─── ABA SERVIÇOS ─── */}
      {!carregando && aba === 'servicos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {servicos.map((s) => (
            <div key={s.id} style={{ ...card, opacity: s.ativo ? 1 : 0.55 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{s.nome}</span>
                  <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 3 }}>
                    {s.duracao_min} min · {Number(s.preco) > 0 ? `R$ ${Number(s.preco).toFixed(2)}` : 'Grátis'} · até {s.capacidade} pessoa{s.capacidade > 1 ? 's' : ''}/horário
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button style={btn} onClick={() => toggleServico(s)}>{s.ativo ? 'Desativar' : 'Ativar'}</button>
                  <button style={{ ...btn, color: '#FF4444' }} onClick={() => excluirServico(s)}><Trash2 size={13} /></button>
                </div>
              </div>

              {/* Janelas de disponibilidade */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>Horários disponíveis</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {disponibilidades.filter((d) => d.service_id === s.id).map((d) => (
                    <span key={d.id} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12,
                      background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)',
                      borderRadius: 8, padding: '5px 10px',
                    }}>
                      {DIAS[d.dia_semana]} {String(d.hora_inicio).slice(0, 5)}–{String(d.hora_fim).slice(0, 5)}
                      {d.vagas ? ` (${d.vagas} vagas)` : ''}
                      <button onClick={() => removerJanela(d.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <select style={input} value={novaJanela[s.id]?.dia ?? 1}
                    onChange={(e) => setNovaJanela((p) => ({ ...p, [s.id]: { ...p[s.id], dia: e.target.value } }))}>
                    {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                  <input type="time" style={input} value={novaJanela[s.id]?.inicio ?? ''}
                    onChange={(e) => setNovaJanela((p) => ({ ...p, [s.id]: { ...p[s.id], inicio: e.target.value } }))} />
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>até</span>
                  <input type="time" style={input} value={novaJanela[s.id]?.fim ?? ''}
                    onChange={(e) => setNovaJanela((p) => ({ ...p, [s.id]: { ...p[s.id], fim: e.target.value } }))} />
                  <input type="number" placeholder="vagas" min="1" style={{ ...input, width: 80 }} value={novaJanela[s.id]?.vagas ?? ''}
                    onChange={(e) => setNovaJanela((p) => ({ ...p, [s.id]: { ...p[s.id], vagas: e.target.value } }))} />
                  <button style={btn} onClick={() => addJanela(s.id)}><Plus size={13} /> Adicionar</button>
                </div>
              </div>
            </div>
          ))}

          {/* Novo serviço */}
          {novoServico ? (
            <div style={card}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Novo serviço</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input style={{ ...input, flex: 2, minWidth: 180 }} placeholder="Nome (ex: Aula experimental)" value={novoServico.nome ?? ''}
                  onChange={(e) => setNovoServico((p) => ({ ...p, nome: e.target.value }))} />
                <input style={{ ...input, width: 110 }} type="number" placeholder="Duração (min)" value={novoServico.duracao_min ?? ''}
                  onChange={(e) => setNovoServico((p) => ({ ...p, duracao_min: e.target.value }))} />
                <input style={{ ...input, width: 100 }} type="number" placeholder="Preço (R$)" value={novoServico.preco ?? ''}
                  onChange={(e) => setNovoServico((p) => ({ ...p, preco: e.target.value }))} />
                <input style={{ ...input, width: 100 }} type="number" placeholder="Capacidade" value={novoServico.capacidade ?? ''}
                  onChange={(e) => setNovoServico((p) => ({ ...p, capacidade: e.target.value }))} />
              </div>
              <input style={{ ...input, width: '100%', marginTop: 8 }} placeholder="Descrição curta (opcional)" value={novoServico.descricao ?? ''}
                onChange={(e) => setNovoServico((p) => ({ ...p, descricao: e.target.value }))} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button style={{ ...btn, background: 'rgba(0,229,255,0.12)', color: 'var(--accent)' }} onClick={salvarServico}>
                  <CheckCircle2 size={14} /> Salvar serviço
                </button>
                <button style={btn} onClick={() => setNovoServico(null)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button style={{ ...btn, alignSelf: 'flex-start' }} onClick={() => setNovoServico({})}>
              <Plus size={14} /> Novo serviço
            </button>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
