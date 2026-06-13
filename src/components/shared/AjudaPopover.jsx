/**
 * AjudaPopover — o "?" comparativo (Básico vs Pro) de cada função.
 * Sempre mostra os dois lados; o CTA de upgrade aparece só para quem é Básico.
 */
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HelpCircle, Check, Crown, X, ArrowRight } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export default function AjudaPopover({ help }) {
  const { isPro } = useApp()
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!aberto) return
    const fechar = (e) => { if (ref.current && !ref.current.contains(e.target)) setAberto(false) }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [aberto])

  if (!help) return null
  const exclusivoPro = help.tipo === 'modulo'

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }} ref={ref}>
      <button
        onClick={() => setAberto((a) => !a)}
        title="Como funciona"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 2,
          color: aberto ? 'var(--accent)' : 'var(--text-muted)', display: 'flex',
        }}
      >
        <HelpCircle size={16} />
      </button>

      {aberto && (
        <div style={{
          position: 'absolute', top: 28, left: 0, zIndex: 200,
          width: 320, maxWidth: '90vw',
          background: '#141420', border: '1px solid var(--border-medium)',
          borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.55)',
          overflow: 'hidden', animation: 'fadeIn 0.15s ease',
        }}>
          {/* Header */}
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{help.titulo}</p>
              <button onClick={() => setAberto(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                <X size={15} />
              </button>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 }}>{help.resumo}</p>
          </div>

          {/* Básico */}
          {!exclusivoPro && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: 11.5, fontWeight: 700, color: '#22C55E', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Check size={13} /> NO BÁSICO {isPro ? '' : '(seu plano)'}
              </p>
              {help.basico.map((b, i) => (
                <p key={i} style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 5, paddingLeft: 4 }}>• {b}</p>
              ))}
            </div>
          )}

          {/* Pro */}
          <div style={{ padding: '12px 16px', background: isPro ? 'transparent' : 'rgba(255,184,0,0.05)' }}>
            <p style={{ fontSize: 11.5, fontWeight: 700, color: '#FFB800', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Crown size={13} /> {exclusivoPro ? 'EXCLUSIVO DO PRO' : 'NO PRO'} {isPro ? '(seu plano)' : ''}
            </p>
            {help.pro.map((p, i) => (
              <p key={i} style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 5, paddingLeft: 4 }}>• {p}</p>
            ))}

            {isPro ? (
              <p style={{ fontSize: 12, color: '#22C55E', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Check size={13} /> Você tem o Pro — tudo liberado!
              </p>
            ) : (
              <button
                onClick={() => { setAberto(false); navigate('/planos') }}
                style={{
                  width: '100%', marginTop: 10, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(135deg, #FFB800, #FF8A00)', color: '#1a1500', fontWeight: 800, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
              >
                <Crown size={14} /> Assinar o Pro <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px) } to { opacity: 1; transform: none } }`}</style>
    </div>
  )
}
