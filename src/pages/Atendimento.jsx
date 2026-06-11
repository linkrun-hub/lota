import { useState, useEffect, useCallback } from 'react'
import {
  Users, Plus, Search, Edit3, Trash2, Phone, Tag,
  Info, Building2, Handshake, Ban, Star, HelpCircle,
  Save, X, CheckCircle, AlertTriangle,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

// ─── Tipos de contato ─────────────────────────────────────────────────────────
const TIPOS = [
  { key: 'fornecedor', label: 'Fornecedor', cor: '#F59E0B', icon: Building2, desc: 'Recebe resposta automática + notifica dono' },
  { key: 'parceiro',   label: 'Parceiro',   cor: '#10B981', icon: Handshake, desc: 'Recebe resposta automática + notifica dono' },
  { key: 'vip',        label: 'VIP',        cor: '#7C3AED', icon: Star,      desc: 'Recebe resposta VIP + dono é notificado com prioridade' },
  { key: 'bloqueado',  label: 'Bloqueado',  cor: '#EF4444', icon: Ban,       desc: 'Mensagens ignoradas silenciosamente' },
  { key: 'outro',      label: 'Outro',      cor: '#6B7280', icon: HelpCircle,desc: 'Recebe resposta padrão + notifica dono' },
]

function TipoBadge({ tipo }) {
  const t = TIPOS.find(x => x.key === tipo) || TIPOS[4]
  const Icon = t.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      background: `${t.cor}18`, border: `1px solid ${t.cor}40`,
      color: t.cor, fontSize: 12, fontWeight: 600,
    }}>
      <Icon size={11} />
      {t.label}
    </span>
  )
}

// ─── Modal de criação/edição ──────────────────────────────────────────────────
function ContatoModal({ contato, onClose, onSalvar }) {
  const [form, setForm] = useState({
    nome:     contato?.nome || '',
    whatsapp: contato?.whatsapp || '',
    tipo:     contato?.tipo || 'fornecedor',
    nota:     contato?.nota || '',
    ativo:    contato?.ativo ?? true,
  })
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const handleSalvar = async () => {
    if (!form.whatsapp) { setErro('Número WhatsApp é obrigatório'); return }
    setSalvando(true)
    setErro('')
    try {
      await onSalvar({ ...contato, ...form })
      onClose()
    } catch (err) {
      setErro(String(err))
    } finally {
      setSalvando(false)
    }
  }

  const tipoAtual = TIPOS.find(t => t.key === form.tipo)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }} onClick={onClose}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 16, padding: 28,
          width: '100%', maxWidth: 480,
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {contato?.id ? '✏️ Editar Contato' : '➕ Novo Contato Especial'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Número WhatsApp */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              Número WhatsApp *
            </label>
            <input
              type="tel"
              value={form.whatsapp}
              onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
              placeholder="+5511999999999"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box',
              }}
            />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Formato internacional: +55 + DDD + número
            </p>
          </div>

          {/* Nome */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              Nome
            </label>
            <input
              value={form.nome}
              onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              placeholder="Ex: Fornecedor de Equipamentos"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Tipo */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>
              Tipo de contato
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {TIPOS.map(t => {
                const Icon = t.icon
                const ativo = form.tipo === t.key
                return (
                  <button
                    key={t.key}
                    onClick={() => setForm(p => ({ ...p, tipo: t.key }))}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                      background: ativo ? `${t.cor}15` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${ativo ? t.cor : 'var(--border-subtle)'}`,
                      color: ativo ? t.cor : 'var(--text-muted)',
                      fontSize: 13, fontWeight: ativo ? 600 : 400,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={14} />
                    {t.label}
                  </button>
                )
              })}
            </div>
            {tipoAtual && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0 0' }}>
                💡 {tipoAtual.desc}
              </p>
            )}
          </div>

          {/* Nota */}
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
              Nota interna
            </label>
            <textarea
              value={form.nota}
              onChange={e => setForm(p => ({ ...p, nota: e.target.value }))}
              placeholder="Ex: Fornecedor de barras olímpicas, ligar no cel"
              rows={2}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)', fontSize: 14, resize: 'none',
                boxSizing: 'border-box', fontFamily: 'inherit',
              }}
            />
          </div>

          {erro && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#EF4444', fontSize: 13 }}>
              <AlertTriangle size={14} /> {erro}
            </div>
          )}

          <button
            onClick={handleSalvar}
            disabled={salvando}
            style={{
              padding: '12px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #00E5FF, #0070F3)',
              color: '#000', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: salvando ? 0.7 : 1,
            }}
          >
            <Save size={16} />
            {salvando ? 'Salvando...' : 'Salvar Contato'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Atendimento() {
  const { currentBox } = useApp()
  const [contatos, setContatos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [modal, setModal] = useState(null) // null | {} | {contato existente}
  const [feedback, setFeedback] = useState(null)

  const boxId = currentBox?.id

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      if (boxId) {
        const { data } = await supabase
          .from('contatos_especiais')
          .select('*')
          .eq('box_id', boxId)
          .order('created_at', { ascending: false })
        setContatos(data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [boxId])

  useEffect(() => { carregar() }, [carregar])

  const handleSalvar = async (form) => {
    if (!boxId) throw new Error('Box não encontrado')

    if (form.id) {
      // Edição
      const { error } = await supabase
        .from('contatos_especiais')
        .update({
          nome: form.nome, tipo: form.tipo, nota: form.nota, ativo: form.ativo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', form.id)
      if (error) throw error
    } else {
      // Criação
      const { error } = await supabase
        .from('contatos_especiais')
        .upsert({
          box_id: boxId,
          whatsapp: form.whatsapp,
          nome: form.nome,
          tipo: form.tipo,
          nota: form.nota,
          ativo: form.ativo,
        }, { onConflict: 'box_id,whatsapp' })
      if (error) throw error
    }

    await carregar()
    setFeedback({ tipo: 'ok', msg: 'Contato salvo!' })
    setTimeout(() => setFeedback(null), 3000)
  }

  const handleRemover = async (id) => {
    if (!confirm('Remover este contato?')) return
    await supabase.from('contatos_especiais').delete().eq('id', id)
    setContatos(prev => prev.filter(c => c.id !== id))
  }

  const contatosFiltrados = contatos.filter(c => {
    const matchBusca = !busca || [c.nome, c.whatsapp, c.nota].some(v => v?.toLowerCase().includes(busca.toLowerCase()))
    const matchTipo = filtroTipo === 'todos' || c.tipo === filtroTipo
    return matchBusca && matchTipo
  })

  const contarPorTipo = (tipo) => contatos.filter(c => c.tipo === tipo).length

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #7C3AED22, #EC489922)',
              border: '1px solid rgba(124,58,237,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Users size={20} color="#7C3AED" />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Central de Contatos
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
                Gerencie fornecedores, parceiros, VIPs e contatos bloqueados
              </p>
            </div>
          </div>
          <button
            onClick={() => setModal({})}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 18px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #7C3AED, #EC4899)',
              color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            Novo Contato
          </button>
        </div>

        {/* Instruções */}
        <div style={{
          background: 'rgba(124,58,237,0.06)',
          border: '1px solid rgba(124,58,237,0.15)',
          borderRadius: 10, padding: '12px 16px',
          display: 'flex', gap: 10, alignItems: 'flex-start', marginTop: 16,
        }}>
          <Info size={16} color="#7C3AED" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Como usar:</strong>{' '}
            Cadastre aqui números que não são leads ou alunos. Quando essas pessoas mandarem mensagem no WhatsApp do box, o sistema identificará automaticamente e agirá conforme o tipo:
            {' '}<strong style={{ color: '#EF4444' }}>Bloqueado</strong> ignora silenciosamente,
            {' '}<strong style={{ color: '#F59E0B' }}>Fornecedor/Parceiro</strong> notifica o dono,
            {' '}<strong style={{ color: '#7C3AED' }}>VIP</strong> recebe resposta especial com prioridade.
          </div>
        </div>
      </div>

      {/* Cards de resumo por tipo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {TIPOS.map(t => {
          const Icon = t.icon
          const count = contarPorTipo(t.key)
          return (
            <button
              key={t.key}
              onClick={() => setFiltroTipo(filtroTipo === t.key ? 'todos' : t.key)}
              style={{
                background: filtroTipo === t.key ? `${t.cor}15` : 'var(--bg-card)',
                border: `1px solid ${filtroTipo === t.key ? t.cor : 'var(--border-subtle)'}`,
                borderRadius: 10, padding: '14px 12px',
                textAlign: 'center', cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={20} color={t.cor} style={{ marginBottom: 6 }} />
              <div style={{ fontSize: 22, fontWeight: 700, color: t.cor }}>{count}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{t.label}</div>
            </button>
          )
        })}
      </div>

      {/* Barra de busca */}
      <div style={{
        display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, número ou nota..."
            style={{
              width: '100%', padding: '10px 12px 10px 38px', borderRadius: 8,
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box',
            }}
          />
        </div>
        {filtroTipo !== 'todos' && (
          <button
            onClick={() => setFiltroTipo('todos')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px',
              borderRadius: 8, border: '1px solid var(--border-subtle)',
              background: 'var(--bg-card)', color: 'var(--text-muted)',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            <X size={14} /> Limpar filtro
          </button>
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
          borderRadius: 8, marginBottom: 16,
          background: 'rgba(16,185,129,0.1)', border: '1px solid #10B98140',
          color: '#10B981', fontSize: 13,
        }}>
          <CheckCircle size={16} /> {feedback.msg}
        </div>
      )}

      {/* Tabela de contatos */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr auto',
          padding: '12px 20px', borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(255,255,255,0.02)',
        }}>
          {['Nome / Nota', 'WhatsApp', 'Tipo', 'Cadastrado', 'Ações'].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {h}
            </span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>Carregando...</div>
        ) : contatosFiltrados.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <Users size={40} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 15, margin: 0 }}>
              {busca || filtroTipo !== 'todos' ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado ainda'}
            </p>
            {!busca && filtroTipo === 'todos' && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6, opacity: 0.7 }}>
                Clique em "Novo Contato" para cadastrar fornecedores, parceiros, VIPs e bloqueados
              </p>
            )}
          </div>
        ) : (
          contatosFiltrados.map(c => (
            <div
              key={c.id}
              style={{
                display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr auto',
                padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)',
                alignItems: 'center',
                opacity: c.ativo ? 1 : 0.5,
              }}
            >
              {/* Nome / Nota */}
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {c.nome || '—'}
                </div>
                {c.nota && (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {c.nota}
                  </div>
                )}
              </div>

              {/* WhatsApp */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13 }}>
                <Phone size={13} />
                {c.whatsapp}
              </div>

              {/* Tipo */}
              <TipoBadge tipo={c.tipo} />

              {/* Data */}
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {new Date(c.created_at).toLocaleDateString('pt-BR')}
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setModal(c)}
                  style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
                    borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: 'var(--text-muted)',
                    display: 'flex', alignItems: 'center',
                  }}
                  title="Editar"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => handleRemover(c.id)}
                  style={{
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 6, padding: '6px 8px', cursor: 'pointer', color: '#EF4444',
                    display: 'flex', alignItems: 'center',
                  }}
                  title="Remover"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Como funciona cada tipo */}
      <div style={{
        marginTop: 24, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
        borderRadius: 12, padding: 20,
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
          📋 Como cada tipo é tratado pelo sistema
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {TIPOS.map(t => {
            const Icon = t.icon
            return (
              <div key={t.key} style={{
                padding: '12px 14px', borderRadius: 8,
                background: `${t.cor}08`, border: `1px solid ${t.cor}25`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Icon size={16} color={t.cor} />
                  <span style={{ fontWeight: 600, color: t.cor, fontSize: 13 }}>{t.label}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {t.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal */}
      {modal !== null && (
        <ContatoModal
          contato={modal?.id ? modal : null}
          onClose={() => setModal(null)}
          onSalvar={handleSalvar}
        />
      )}
    </div>
  )
}
