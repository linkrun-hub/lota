/**
 * GuardPro — preview-gating de módulos Pro.
 * Para quem é Pro: renderiza o módulo normal.
 * Para quem é Básico: mostra a prévia do módulo esmaecida (vitrine) com um
 * card de upsell por cima — ele vê o que está perdendo e é convidado a assinar.
 */
import { useLocation, useNavigate } from 'react-router-dom'
import { Crown, Check, ArrowRight } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { HELP } from '../../lib/helpContent'

export default function GuardPro({ children }) {
  const { isPro } = useApp()
  const location = useLocation()
  const navigate = useNavigate()

  if (isPro) return children

  const help = HELP[location.pathname] || { titulo: 'Recurso', resumo: '', pro: [] }

  return (
    <div style={{ position: 'relative', minHeight: '60vh' }}>
      {/* Prévia do módulo (vitrine) — esmaecida e sem interação */}
      <div style={{
        filter: 'blur(3px)', opacity: 0.4, pointerEvents: 'none', userSelect: 'none',
        maxHeight: '78vh', overflow: 'hidden',
      }} aria-hidden>
        {children}
      </div>

      {/* Card de upsell por cima */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 'min(12vh, 90px)',
        background: 'linear-gradient(180deg, rgba(10,10,18,0.2) 0%, rgba(10,10,18,0.75) 60%)',
      }}>
        <div style={{
          width: 'min(440px, 92vw)',
          background: '#141420', border: '1px solid rgba(255,184,0,0.35)',
          borderRadius: 18, padding: 26, textAlign: 'center',
          boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
        }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #FFB800, #FF8A00)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Crown size={26} color="#1a1500" />
          </div>

          <p style={{ fontSize: 12, fontWeight: 800, color: '#FFB800', letterSpacing: 1, textTransform: 'uppercase' }}>
            Recurso Pro
          </p>
          <h2 style={{ fontSize: 21, fontWeight: 800, margin: '4px 0 8px' }}>{help.titulo}</h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: 16 }}>
            {help.resumo}
          </p>

          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {help.pro.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <Check size={15} color="#FFB800" style={{ flexShrink: 0, marginTop: 1 }} /> {p}
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/planos')}
            style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #FFB800, #FF8A00)', color: '#1a1500',
              fontWeight: 800, fontSize: 14.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            <Crown size={16} /> Assinar o Pro <ArrowRight size={15} />
          </button>
          <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10 }}>
            Continue no Básico o quanto quiser — o Pro libera quando você decidir crescer.
          </p>
        </div>
      </div>
    </div>
  )
}
