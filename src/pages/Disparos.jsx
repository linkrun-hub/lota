/**
 * Disparos.jsx — Campanhas de WhatsApp e Email + nova campanha
 */
import { useState } from 'react'
import { Send, Plus, MessageCircle, Mail, Eye, Clock, CheckCircle2, FileEdit, Zap, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { timeAgo, formatDate } from '../lib/utils'

const STATUS_CAMP = {
  enviada: { label: 'Enviada', cor: '#22C55E', bg: 'rgba(34,197,94,0.1)', icon: <CheckCircle2 size={12} /> },
  agendada: { label: 'Agendada', cor: '#00E5FF', bg: 'rgba(0,229,255,0.1)', icon: <Clock size={12} /> },
  rascunho: { label: 'Rascunho', cor: '#6B7280', bg: 'rgba(107,114,128,0.1)', icon: <FileEdit size={12} /> },
}

const SEGMENTOS = [
  { key: 'leads_qualificados', label: 'Leads qualificados', descricao: 'Leads com status qualificado ou agendado' },
  { key: 'leads_inativos', label: 'Leads inativos', descricao: 'Leads sem interação há mais de 30 dias' },
  { key: 'leads_novos', label: 'Leads novos', descricao: 'Leads recebidos nas últimas 48h' },
  { key: 'todos_alunos', label: 'Todos os alunos', descricao: 'Todos os alunos ativos' },
  { key: 'alunos_risco', label: 'Alunos em risco', descricao: 'Alunos com 3+ faltas consecutivas' },
  { key: 'alunos_renovacao', label: 'Renovação próxima', descricao: 'Alunos com vencimento em até 10 dias' },
]

const TEMPLATES_WHATSAPP = [
  {
    key: 'promo_mes',
    nome: 'Promoção do mês',
    preview: 'Oi {nome}! 🎉 Temos uma oferta especial para você: primeiro mês com 30% de desconto. Quer conhecer o BraveFit? Responda QUERO e te chamo! 💪',
  },
  {
    key: 'follow_up',
    nome: 'Follow-up genérico',
    preview: 'Oi {nome}! Passando para saber se ainda tem interesse em começar o treino por aqui. 😊 Qualquer dúvida, pode perguntar!',
  },
  {
    key: 'reativacao',
    nome: 'Reativação de inativo',
    preview: 'Oi {nome}! Faz um tempinho que não te vemos por aqui. 🥺 Que tal voltar? Estamos com novidades que você vai adorar!',
  },
]

const TEMPLATES_EMAIL = [
  {
    key: 'newsletter',
    nome: 'Newsletter mensal',
    preview: 'Olá {nome},\n\nConfira as novidades do BraveFit este mês: novos WODs, resultados dos nossos alunos e uma promoção especial para indicações!',
  },
]

function CampanhaCard({ campanha }) {
  const st = STATUS_CAMP[campanha.status] || STATUS_CAMP.rascunho
  const taxa = campanha.enviados > 0 ? Math.round((campanha.respostas / campanha.enviados) * 100) : 0

  return (
    <div className="glass" style={{
      borderRadius: 12, padding: 18,
      borderColor: `${st.cor}20`,
      display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, flexShrink: 0,
        background: campanha.canal === 'whatsapp' ? 'rgba(37,211,102,0.1)' : 'rgba(0,112,243,0.1)',
        border: `1px solid ${campanha.canal === 'whatsapp' ? 'rgba(37,211,102,0.2)' : 'rgba(0,112,243,0.2)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: campanha.canal === 'whatsapp' ? '#25D366' : '#0070F3',
      }}>
        {campanha.canal === 'whatsapp' ? <MessageCircle size={20} /> : <Mail size={20} />}
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>{campanha.nome}</h3>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 600,
            color: st.cor, background: st.bg,
            borderRadius: 20, padding: '2px 8px',
          }}>
            {st.icon} {st.label}
          </span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
          {campanha.canal === 'whatsapp' ? '📱 WhatsApp' : '📧 E-mail'} ·{' '}
          {SEGMENTOS.find((s) => s.key === campanha.segmento)?.label || campanha.segmento} ·{' '}
          {campanha.status === 'enviada' ? `Enviada ${timeAgo(campanha.agendado_para)}` : `Agendada ${formatDate(campanha.agendado_para)}`}
        </p>
        {campanha.status === 'enviada' && (
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#00E5FF' }}>{campanha.enviados}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>enviados</p>
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#22C55E' }}>{campanha.respostas}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>respostas</p>
            </div>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#A78BFA' }}>{taxa}%</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>taxa resposta</p>
            </div>
          </div>
        )}
      </div>

      {campanha.status === 'rascunho' && (
        <button id={`btn-enviar-campanha-${campanha.id}`} className="btn-primary" style={{ padding: '8px 14px', fontSize: 12, flexShrink: 0 }}>
          <Send size={13} /> Enviar agora
        </button>
      )}
    </div>
  )
}

function NovaCampanhaForm({ onClose }) {
  const [form, setForm] = useState({
    canal: 'whatsapp',
    segmento: '',
    template: '',
    agendamento: 'agora',
  })
  const [passo, setPasso] = useState(1)

  const templates = form.canal === 'whatsapp' ? TEMPLATES_WHATSAPP : TEMPLATES_EMAIL
  const templateSel = templates.find((t) => t.key === form.template)

  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }))

  return (
    <div>
      {/* Steps */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24 }}>
        {['Canal', 'Segmento', 'Mensagem', 'Revisar'].map((step, i) => {
          const n = i + 1
          const isAtual = passo === n
          const isConcluido = passo > n
          return (
            <div key={step} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: isAtual ? '#00E5FF' : isConcluido ? '#22C55E' : 'rgba(255,255,255,0.08)',
                  border: `2px solid ${isAtual ? '#00E5FF' : isConcluido ? '#22C55E' : 'rgba(255,255,255,0.15)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  color: isAtual ? '#000' : isConcluido ? '#000' : 'var(--text-muted)',
                  margin: '0 auto 4px',
                }}>
                  {isConcluido ? '✓' : n}
                </div>
                <p style={{ fontSize: 10, color: isAtual ? '#00E5FF' : 'var(--text-muted)' }}>{step}</p>
              </div>
              {i < 3 && <div style={{ height: 2, flex: 1, background: isConcluido ? '#22C55E' : 'rgba(255,255,255,0.08)', margin: '0 4px', marginBottom: 16 }} />}
            </div>
          )
        })}
      </div>

      {/* Passo 1: Canal */}
      {passo === 1 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Escolha o canal</h3>
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { key: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={24} />, cor: '#25D366', descricao: 'Via BotConversa · Alta abertura' },
              { key: 'email', label: 'E-mail', icon: <Mail size={24} />, cor: '#0070F3', descricao: 'Via Resend · Conteúdo rico' },
            ].map((c) => (
              <button key={c.key} id={`nova-camp-canal-${c.key}`} onClick={() => set('canal', c.key)}
                style={{
                  flex: 1, padding: '20px 16px', borderRadius: 12, cursor: 'pointer',
                  background: form.canal === c.key ? `${c.cor}12` : 'transparent',
                  border: `2px solid ${form.canal === c.key ? c.cor : 'var(--border-subtle)'}`,
                  textAlign: 'center', transition: 'all 0.15s',
                }}>
                <div style={{ color: c.cor, display: 'flex', justifyContent: 'center', marginBottom: 8 }}>{c.icon}</div>
                <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{c.label}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.descricao}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Passo 2: Segmento */}
      {passo === 2 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Quem vai receber?</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SEGMENTOS.map((seg) => (
              <button key={seg.key} id={`nova-camp-seg-${seg.key}`} onClick={() => set('segmento', seg.key)}
                style={{
                  padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                  background: form.segmento === seg.key ? 'rgba(0,229,255,0.08)' : 'transparent',
                  border: `1px solid ${form.segmento === seg.key ? 'rgba(0,229,255,0.3)' : 'var(--border-subtle)'}`,
                  textAlign: 'left', transition: 'all 0.15s',
                }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: form.segmento === seg.key ? '#00E5FF' : 'var(--text-primary)', marginBottom: 2 }}>
                  {form.segmento === seg.key ? '✓ ' : ''}{seg.label}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{seg.descricao}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Passo 3: Mensagem */}
      {passo === 3 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Escolha a mensagem</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {templates.map((t) => (
              <button key={t.key} id={`nova-camp-tmpl-${t.key}`} onClick={() => set('template', t.key)}
                style={{
                  padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                  background: form.template === t.key ? 'rgba(0,229,255,0.06)' : 'transparent',
                  border: `1px solid ${form.template === t.key ? 'rgba(0,229,255,0.25)' : 'var(--border-subtle)'}`,
                  textAlign: 'left', transition: 'all 0.15s',
                }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: form.template === t.key ? '#00E5FF' : 'var(--text-primary)' }}>
                  {form.template === t.key ? '✓ ' : ''}{t.nome}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.preview}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Passo 4: Revisar */}
      {passo === 4 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Revisar e confirmar</h3>

          {/* Alerta LGPD */}
          <div style={{
            background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.2)',
            borderRadius: 10, padding: '12px 14px', marginBottom: 16,
            display: 'flex', gap: 8, alignItems: 'flex-start',
          }}>
            <AlertTriangle size={14} color="#FFB800" style={{ marginTop: 1 }} />
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong style={{ color: '#FFB800' }}>Conformidade LGPD:</strong> Apenas contatos com{' '}
              <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>lgpd_consent = true</code> e{' '}
              <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4 }}>opt_out = false</code> receberão.
              Disparos fora do horário comercial (09h–20h) são bloqueados automaticamente.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Canal', value: form.canal === 'whatsapp' ? '📱 WhatsApp (BotConversa)' : '📧 E-mail (Resend)' },
              { label: 'Segmento', value: SEGMENTOS.find((s) => s.key === form.segmento)?.label || '—' },
              { label: 'Template', value: templateSel?.nome || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 14px', background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-subtle)', borderRadius: 8,
              }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{value}</span>
              </div>
            ))}

            {templateSel && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Preview da mensagem:</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {templateSel.preview.replace('{nome}', 'João')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Botões de navegação */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        {passo > 1 && (
          <button onClick={() => setPasso((p) => p - 1)} className="btn-ghost" style={{ padding: '9px 20px' }}>
            Voltar
          </button>
        )}
        <button onClick={onClose} className="btn-ghost" style={{ padding: '9px 20px' }}>
          Cancelar
        </button>
        {passo < 4 ? (
          <button
            id={`nova-camp-avancar-${passo}`}
            onClick={() => setPasso((p) => p + 1)}
            disabled={(passo === 2 && !form.segmento) || (passo === 3 && !form.template)}
            className="btn-primary"
            style={{ padding: '9px 20px', opacity: ((passo === 2 && !form.segmento) || (passo === 3 && !form.template)) ? 0.5 : 1 }}
          >
            Avançar →
          </button>
        ) : (
          <button
            id="btn-disparar-campanha"
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '9px 20px', background: 'linear-gradient(135deg, #22C55E, #16a34a)' }}
          >
            <Send size={14} /> Disparar campanha
          </button>
        )}
      </div>
    </div>
  )
}

export default function Disparos() {
  const { campanhas } = useApp()
  const [showNova, setShowNova] = useState(false)

  const total = campanhas.length
  const enviadas = campanhas.filter((c) => c.status === 'enviada').length
  const agendadas = campanhas.filter((c) => c.status === 'agendada').length
  const respostasTotal = campanhas.reduce((s, c) => s + (c.respostas || 0), 0)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }} className="fade-in">
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Send size={22} color="#00E5FF" /> Disparos e Campanhas
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {total} campanhas · {enviadas} enviadas · {agendadas} agendadas · {respostasTotal} respostas
          </p>
        </div>
        <button
          id="btn-nova-campanha"
          onClick={() => setShowNova(!showNova)}
          className="btn-primary"
          style={{ padding: '10px 18px' }}
        >
          <Plus size={15} />
          Nova campanha
        </button>
      </div>

      {/* Info */}
      <div style={{
        background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <Zap size={14} color="#00E5FF" style={{ marginTop: 1, flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#00E5FF' }}>Como testar:</strong> Clique em <strong>Nova campanha</strong> para simular o fluxo de 4 passos
          (canal → segmento → mensagem → revisar). Disparos respeitam LGPD e só saem no horário comercial (09h–20h).
        </span>
      </div>

      {/* Formulário de nova campanha */}
      {showNova && (
        <div className="glass" style={{ borderRadius: 14, padding: 24, marginBottom: 24, border: '1px solid rgba(0,229,255,0.15)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} color="#00E5FF" /> Nova campanha
          </h2>
          <NovaCampanhaForm onClose={() => setShowNova(false)} />
        </div>
      )}

      {/* KPIs das campanhas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Campanhas enviadas', value: enviadas, cor: '#22C55E', emoji: '✅' },
          { label: 'Agendadas', value: agendadas, cor: '#00E5FF', emoji: '📅' },
          { label: 'Rascunhos', value: campanhas.filter((c) => c.status === 'rascunho').length, cor: '#6B7280', emoji: '📝' },
          { label: 'Respostas totais', value: respostasTotal, cor: '#A78BFA', emoji: '💬' },
        ].map(({ label, value, cor, emoji }) => (
          <div key={label} className="stat-card" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 24, marginBottom: 4 }}>{emoji}</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: cor }}>{value}</p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Lista de campanhas */}
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--text-secondary)' }}>Histórico de campanhas</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {campanhas.map((c) => (
          <CampanhaCard key={c.id} campanha={c} />
        ))}
      </div>
    </div>
  )
}
