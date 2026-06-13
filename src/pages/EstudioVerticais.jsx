/**
 * src/pages/EstudioVerticais.jsx
 * Estúdio de Verticais — super_admin configura cada nicho pela interface.
 * Disponível apenas quando o Modo Configuração está ligado (app_config).
 * Edição grava via Edge Function admin-api; leitura é direta (RLS permite).
 */
import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Layers, Save, Loader, Tag, LayoutGrid, Bot, RefreshCw, MessageSquareText,
  DollarSign, CheckCircle2, AlertTriangle, Lock, Plus, Trash2,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'
import { MODULOS } from '../lib/constants'

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-api`

async function chamarAdmin(body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(FUNC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro na operação')
  return data
}

// Rótulos de terminologia que o sistema usa
const CHAVES_TERMO = [
  ['cliente', 'Cliente (singular)', 'Aluno'],
  ['clientes', 'Clientes (plural)', 'Alunos'],
  ['unidade', 'Unidade/negócio', 'Box'],
  ['visita', 'Presença/visita', 'Check-in'],
  ['grupo', 'Grupo (singular)', 'Turma'],
  ['grupos', 'Grupos (plural)', 'Turmas'],
  ['mensalidade', 'Cobrança', 'Mensalidade'],
]

const MODELOS_FIN = [
  ['recorrente', 'Recorrente (mensalidade)'],
  ['os', 'Ordem de serviço'],
  ['pedido', 'Pedido avulso'],
]
const TIPOS_RET = [
  ['faltas', 'Faltas consecutivas'],
  ['vencimento', 'Vencimento de plano'],
  ['retorno', 'Retorno periódico (dias)'],
  ['recompra', 'Recompra (dias)'],
]

const ABAS = [
  ['termo', 'Terminologia', Tag],
  ['modulos', 'Módulos', LayoutGrid],
  ['ia', 'Persona IA', Bot],
  ['retencao', 'Retenção', RefreshCw],
  ['templates', 'Templates', MessageSquareText],
]

const input = {
  padding: '9px 12px', fontSize: 13, background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)', width: '100%',
}
const btn = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
  borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 600,
  color: 'var(--text-secondary)', cursor: 'pointer',
}
const card = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
  borderRadius: 14, padding: 18,
}

export default function EstudioVerticais() {
  const { usuario, modoConfig, setModoConfig } = useApp()
  const [verticais, setVerticais] = useState([])
  const [slug, setSlug] = useState('')
  const [vert, setVert] = useState(null)
  const [vtemplates, setVtemplates] = useState([])
  const [aba, setAba] = useState('termo')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState(null) // {tipo, texto}

  const carregarVerticais = useCallback(async () => {
    const { data } = await supabase.from('verticals').select('*').order('nome')
    setVerticais(data || [])
    if (data?.length && !slug) setSlug(data[0].slug)
    setCarregando(false)
  }, [slug])

  useEffect(() => { carregarVerticais() }, [carregarVerticais])

  const carregarVertical = useCallback(async () => {
    if (!slug) return
    const [{ data: v }, { data: vts }] = await Promise.all([
      supabase.from('verticals').select('*').eq('slug', slug).single(),
      supabase.from('vertical_templates').select('*').eq('vertical_slug', slug).order('categoria').order('key'),
    ])
    setVert(v ? { ...v, terminologia: v.terminologia || {}, retencao_config: v.retencao_config || {}, financeiro_config: v.financeiro_config || {}, modulos_default: v.modulos_default || [] } : null)
    setVtemplates(vts || [])
  }, [slug])

  useEffect(() => { carregarVertical() }, [carregarVertical])

  const flash = (tipo, texto) => { setMsg({ tipo, texto }); setTimeout(() => setMsg(null), 3000) }

  const salvarCampos = async (campos) => {
    setSalvando(true)
    try {
      await chamarAdmin({ action: 'vertical-salvar', slug, ...campos })
      flash('ok', 'Salvo! Vale para novos clientes deste nicho.')
    } catch (e) { flash('erro', e.message) }
    finally { setSalvando(false) }
  }

  // só super_admin com modo config ligado
  if (usuario && usuario.role !== 'super_admin') return <Navigate to="/" replace />

  const setTermo = (k, v) => setVert((p) => ({ ...p, terminologia: { ...p.terminologia, [k]: v } }))
  const toggleModulo = (k) =>
    setVert((p) => ({
      ...p,
      modulos_default: p.modulos_default.includes(k)
        ? p.modulos_default.filter((m) => m !== k)
        : [...p.modulos_default, k],
    }))
  const setRet = (campo, v) => setVert((p) => ({ ...p, retencao_config: { ...p.retencao_config, [campo]: v } }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Layers size={22} color="var(--accent)" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Estúdio de Verticais</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Configure cada nicho. Mudanças valem para novos clientes do nicho.
            </p>
          </div>
        </div>
        <button
          style={{ ...btn, color: '#FFB800', borderColor: 'rgba(255,184,0,0.4)' }}
          onClick={async () => {
            if (!window.confirm('Desligar o Modo Configuração? O Estúdio some da interface (você pode religar pelo banco).')) return
            try { await chamarAdmin({ action: 'config-set', chave: 'modo_configuracao', valor: false }); setModoConfig(false) }
            catch (e) { flash('erro', e.message) }
          }}
        >
          <Lock size={14} /> Concluir configuração
        </button>
      </div>

      {/* Seletor de vertical */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nicho:</span>
        <select style={{ ...input, width: 'auto', minWidth: 240 }} value={slug} onChange={(e) => setSlug(e.target.value)}>
          {verticais.map((v) => <option key={v.slug} value={v.slug}>{v.nome}</option>)}
        </select>
        {msg && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: msg.tipo === 'ok' ? '#22C55E' : '#FF4444' }}>
            {msg.tipo === 'ok' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />} {msg.texto}
          </span>
        )}
      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {ABAS.map(([k, label, Icon]) => (
          <button key={k} onClick={() => setAba(k)} style={{
            ...btn,
            background: aba === k ? 'rgba(0,229,255,0.12)' : btn.background,
            color: aba === k ? 'var(--accent)' : btn.color,
            borderColor: aba === k ? 'rgba(0,229,255,0.4)' : 'var(--border-subtle)',
          }}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {(carregando || !vert) ? (
        <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)', padding: 30, justifyContent: 'center' }}>
          <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Carregando…
        </div>
      ) : (
        <>
          {/* TERMINOLOGIA */}
          {aba === 'termo' && (
            <div style={card}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                Como o sistema chama as coisas neste nicho. Reflete em todo o painel.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                {CHAVES_TERMO.map(([k, label, ph]) => (
                  <div key={k}>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>{label}</label>
                    <input style={input} placeholder={ph} value={vert.terminologia[k] ?? ''} onChange={(e) => setTermo(k, e.target.value)} />
                  </div>
                ))}
              </div>
              <button style={{ ...btn, marginTop: 16, background: 'rgba(0,229,255,0.12)', color: 'var(--accent)' }} disabled={salvando}
                onClick={() => salvarCampos({ terminologia: vert.terminologia })}>
                <Save size={14} /> Salvar terminologia
              </button>
            </div>
          )}

          {/* MÓDULOS */}
          {aba === 'modulos' && (
            <div style={card}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                Quais funções (abas da esquerda) aparecem por padrão neste nicho.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                {Object.values(MODULOS).map((m) => {
                  const on = vert.modulos_default.includes(m.key)
                  const fixo = m.sempre_ativo
                  return (
                    <label key={m.key} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, cursor: fixo ? 'default' : 'pointer',
                      background: on ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${on ? 'rgba(0,229,255,0.3)' : 'var(--border-subtle)'}`, opacity: fixo ? 0.7 : 1,
                    }}>
                      <input type="checkbox" checked={on} disabled={fixo} onChange={() => toggleModulo(m.key)} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600 }}>{m.label}{fixo && ' (sempre)'}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.descricao}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
              <button style={{ ...btn, marginTop: 16, background: 'rgba(0,229,255,0.12)', color: 'var(--accent)' }} disabled={salvando}
                onClick={() => salvarCampos({ modulos_default: vert.modulos_default })}>
                <Save size={14} /> Salvar módulos
              </button>
            </div>
          )}

          {/* PERSONA IA */}
          {aba === 'ia' && (
            <div style={card}>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>
                Tom de voz e instruções da IA que sugere respostas no chat deste nicho.
              </p>
              <textarea
                rows={6} style={{ ...input, lineHeight: 1.55, resize: 'vertical', fontFamily: 'inherit' }}
                value={vert.ia_persona_default || ''}
                onChange={(e) => setVert((p) => ({ ...p, ia_persona_default: e.target.value }))}
                placeholder="Ex: Você é atendente de um box de CrossFit. Tom enérgico e motivador..."
              />
              <button style={{ ...btn, marginTop: 16, background: 'rgba(0,229,255,0.12)', color: 'var(--accent)' }} disabled={salvando}
                onClick={() => salvarCampos({ ia_persona_default: vert.ia_persona_default })}>
                <Save size={14} /> Salvar persona
              </button>
            </div>
          )}

          {/* RETENÇÃO + FINANCEIRO */}
          {aba === 'retencao' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={card}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}><RefreshCw size={14} style={{ display: 'inline', marginRight: 6 }} />Regra de retenção</p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>Tipo</label>
                    <select style={{ ...input, width: 'auto', minWidth: 200 }} value={vert.retencao_config.tipo || 'faltas'} onChange={(e) => setRet('tipo', e.target.value)}>
                      {TIPOS_RET.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                      {vert.retencao_config.tipo === 'faltas' ? 'Níveis de falta (ex: 3,5,7)' : 'Dias (ex: 30,60,90)'}
                    </label>
                    <input style={{ ...input, width: 200 }}
                      value={(vert.retencao_config.tipo === 'faltas' ? vert.retencao_config.niveis : vert.retencao_config.dias) ?? ''}
                      onChange={(e) => {
                        const nums = e.target.value.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n))
                        if (vert.retencao_config.tipo === 'faltas') setRet('niveis', nums)
                        else setRet('dias', vert.retencao_config.tipo === 'retorno' ? (nums[0] ?? 180) : nums)
                      }}
                      placeholder={vert.retencao_config.tipo === 'faltas' ? '3,5,7' : '30,60,90'}
                    />
                  </div>
                </div>
                <button style={{ ...btn, marginTop: 16, background: 'rgba(0,229,255,0.12)', color: 'var(--accent)' }} disabled={salvando}
                  onClick={() => salvarCampos({ retencao_config: vert.retencao_config })}>
                  <Save size={14} /> Salvar retenção
                </button>
              </div>

              <div style={card}>
                <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}><DollarSign size={14} style={{ display: 'inline', marginRight: 6 }} />Modelo financeiro</p>
                <select style={{ ...input, width: 'auto', minWidth: 240 }} value={vert.financeiro_config.modelo || 'recorrente'}
                  onChange={(e) => setVert((p) => ({ ...p, financeiro_config: { ...p.financeiro_config, modelo: e.target.value } }))}>
                  {MODELOS_FIN.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <button style={{ ...btn, marginTop: 16, background: 'rgba(0,229,255,0.12)', color: 'var(--accent)' }} disabled={salvando}
                  onClick={() => salvarCampos({ financeiro_config: vert.financeiro_config })}>
                  <Save size={14} /> Salvar financeiro
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                ⓘ Vale para novos clientes deste nicho. Clientes já existentes mantêm as regras atuais (edite por box, se preciso).
              </p>
            </div>
          )}

          {/* TEMPLATES */}
          {aba === 'templates' && (
            <TemplatesVertical slug={slug} lista={vtemplates} onChange={carregarVertical} chamarAdmin={chamarAdmin} flash={flash} />
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

/* ─── Editor de templates do vertical ─── */
function TemplatesVertical({ slug, lista, onChange, chamarAdmin, flash }) {
  const [editando, setEditando] = useState(null)
  const [draft, setDraft] = useState({ texto: '', nome: '' })
  const [salvando, setSalvando] = useState(false)

  const porCategoria = lista.reduce((acc, t) => {
    (acc[t.categoria] = acc[t.categoria] || []).push(t)
    return acc
  }, {})

  const salvar = async (t) => {
    setSalvando(true)
    try {
      await chamarAdmin({ action: 'vtemplate-salvar', vertical_slug: slug, key: t.key, nome: draft.nome, texto: draft.texto, categoria: t.categoria })
      flash('ok', 'Template salvo!')
      setEditando(null)
      onChange()
    } catch (e) { flash('erro', e.message) }
    finally { setSalvando(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        Os textos de mensagem deste nicho. Variáveis: <code>{'{nome}'}</code>, <code>{'{box_nome}'}</code>. Novos clientes nascem com estes.
      </p>
      {Object.entries(porCategoria).map(([cat, items]) => (
        <div key={cat} style={card}>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>{cat}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((t) => (
              <div key={t.key} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{t.nome}</span>
                  {editando !== t.key && (
                    <button style={{ ...btn, padding: '5px 10px' }} onClick={() => { setEditando(t.key); setDraft({ texto: t.texto, nome: t.nome }) }}>Editar</button>
                  )}
                </div>
                {editando === t.key ? (
                  <div style={{ marginTop: 8 }}>
                    <textarea rows={4} style={{ ...input, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }}
                      value={draft.texto} onChange={(e) => setDraft((d) => ({ ...d, texto: e.target.value }))} />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button style={{ ...btn, background: 'rgba(0,229,255,0.12)', color: 'var(--accent)' }} disabled={salvando} onClick={() => salvar(t)}>
                        <Save size={13} /> Salvar
                      </button>
                      <button style={btn} onClick={() => setEditando(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <pre style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: '6px 0 0', lineHeight: 1.5 }}>{t.texto}</pre>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      {lista.length === 0 && (
        <div style={{ ...card, textAlign: 'center', color: 'var(--text-muted)' }}>Nenhum template neste nicho ainda.</div>
      )}
    </div>
  )
}
