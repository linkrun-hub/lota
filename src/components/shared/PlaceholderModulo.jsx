import { Lock, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

/**
 * Componente reutilizável para módulos premium ou em construção
 */
export default function PlaceholderModulo({
  titulo,
  descricao,
  icone,
  isPremium = false,
  features = [],
}) {
  const navigate = useNavigate()

  return (
    <div style={{
      maxWidth: 600,
      margin: '60px auto',
      textAlign: 'center',
      padding: 32,
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: isPremium ? 'rgba(255,184,0,0.12)' : 'rgba(0,229,255,0.1)',
        border: isPremium ? '1px solid rgba(255,184,0,0.2)' : '1px solid rgba(0,229,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 24px',
        fontSize: 32,
      }}>
        {icone}
      </div>

      {isPremium && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(255,184,0,0.12)',
          border: '1px solid rgba(255,184,0,0.2)',
          borderRadius: 20, padding: '4px 14px',
          fontSize: 12, fontWeight: 700, color: '#FFB800',
          marginBottom: 16,
        }}>
          <Lock size={12} />
          Módulo Premium
        </div>
      )}

      <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 12 }}>{titulo}</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
        {descricao}
      </p>

      {features.length > 0 && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: 20,
          textAlign: 'left',
          marginBottom: 28,
        }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
            O que você vai ter acesso:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {features.map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                <Zap size={12} color="#00E5FF" />
                {f}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        {isPremium && (
          <button
            className="btn-primary"
            onClick={() => navigate('/configuracoes')}
            style={{ padding: '10px 24px', fontSize: 14 }}
          >
            <Zap size={14} />
            Ativar módulo
          </button>
        )}
        <button
          className="btn-ghost"
          onClick={() => navigate('/')}
          style={{ padding: '10px 24px', fontSize: 14 }}
        >
          Voltar ao início
        </button>
      </div>
    </div>
  )
}
