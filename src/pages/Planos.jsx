/**
 * src/pages/Planos.jsx
 * Página de planos — comparativo Básico vs Pro. Destino dos CTAs "Assinar o Pro".
 * Venda consultiva: o CTA abre conversa no WhatsApp do LOTA.
 */
import { Check, Crown, X, MessageCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'

// WhatsApp comercial do LOTA (ajuste para o seu número de vendas)
const WHATSAPP_VENDAS = '5548996459791'

const RECURSOS = [
  ['Visão Geral (dashboard)', true, true],
  ['Leads — funil e kanban', true, true],
  ['Mensagens — chat WhatsApp', true, true],
  ['Atendimento — contatos', true, true],
  ['Captação — formulário público', true, true],
  ['Follow-up — envio manual', true, true],
  ['ISCA — ver sugestões de post', true, true],
  ['Retenção — ver alertas de risco', true, true],
  ['Follow-up AUTOMÁTICO', false, true],
  ['ISCA — artes e publicação automática', false, true],
  ['Retenção — mensagens automáticas', false, true],
  ['Agenda — link de agendamento', false, true],
  ['Gestão — alunos, turmas, financeiro', false, true],
  ['Disparos — campanhas em massa', false, true],
  ['Indicações — programa de referral', false, true],
  ['Loja — catálogo e pedidos', false, true],
  ['Lead Ads (Meta e Google)', false, true],
]

export default function Planos() {
  const { isPro, box } = useApp()
  const msg = encodeURIComponent(`Olá! Quero assinar o Pro do LOTA${box?.nome ? ` (box ${box.nome})` : ''}.`)

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Escolha o plano do seu negócio</h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 6 }}>
          Comece grátis. Quando quiser automatizar e crescer, suba pro Pro.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {/* Básico */}
        <div style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
          borderRadius: 16, padding: 24,
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#22C55E', textTransform: 'uppercase', letterSpacing: 0.5 }}>Básico</p>
          <p style={{ fontSize: 30, fontWeight: 900, margin: '6px 0' }}>Grátis</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Organize o WhatsApp e o funil de leads. Pra sempre.</p>
          {!isPro && (
            <div style={{ marginTop: 16, padding: '8px 12px', borderRadius: 10, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 12.5, fontWeight: 700, color: '#22C55E', textAlign: 'center' }}>
              ✓ Seu plano atual
            </div>
          )}
        </div>

        {/* Pro */}
        <div style={{
          background: 'rgba(255,184,0,0.05)', border: '1px solid rgba(255,184,0,0.35)',
          borderRadius: 16, padding: 24, position: 'relative',
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#FFB800', textTransform: 'uppercase', letterSpacing: 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Crown size={15} /> Pro
          </p>
          <p style={{ fontSize: 30, fontWeight: 900, margin: '6px 0' }}>Tudo automático</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Automação, agenda, gestão e marketing. Pra crescer sem trabalho manual.</p>
          {isPro ? (
            <div style={{ marginTop: 16, padding: '8px 12px', borderRadius: 10, background: 'rgba(255,184,0,0.12)', border: '1px solid rgba(255,184,0,0.3)', fontSize: 12.5, fontWeight: 700, color: '#FFB800', textAlign: 'center' }}>
              ✓ Seu plano atual
            </div>
          ) : (
            <a href={`https://wa.me/${WHATSAPP_VENDAS}?text=${msg}`} target="_blank" rel="noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              marginTop: 16, padding: '12px', borderRadius: 10, textDecoration: 'none',
              background: 'linear-gradient(135deg, #FFB800, #FF8A00)', color: '#1a1500', fontWeight: 800, fontSize: 14,
            }}>
              <MessageCircle size={16} /> Assinar o Pro
            </a>
          )}
        </div>
      </div>

      {/* Comparativo */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', padding: '12px 18px', borderBottom: '1px solid var(--border-subtle)', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
          <span>Recurso</span>
          <span style={{ textAlign: 'center' }}>Básico</span>
          <span style={{ textAlign: 'center', color: '#FFB800' }}>Pro</span>
        </div>
        {RECURSOS.map(([nome, b, p], i) => (
          <div key={i} style={{
            display: 'grid', gridTemplateColumns: '1fr 90px 90px', padding: '11px 18px', alignItems: 'center',
            borderBottom: i < RECURSOS.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            background: !b ? 'rgba(255,184,0,0.03)' : 'transparent',
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{nome}</span>
            <span style={{ textAlign: 'center' }}>{b ? <Check size={16} color="#22C55E" /> : <X size={15} color="var(--text-muted)" />}</span>
            <span style={{ textAlign: 'center' }}><Check size={16} color="#FFB800" /></span>
          </div>
        ))}
      </div>

      {!isPro && (
        <div style={{ textAlign: 'center' }}>
          <a href={`https://wa.me/${WHATSAPP_VENDAS}?text=${msg}`} target="_blank" rel="noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 32px', borderRadius: 12, textDecoration: 'none',
            background: 'linear-gradient(135deg, #FFB800, #FF8A00)', color: '#1a1500', fontWeight: 800, fontSize: 15,
          }}>
            <Crown size={18} /> Quero o Pro — falar com vendas
          </a>
        </div>
      )}
    </div>
  )
}
