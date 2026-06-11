import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import LotaLogo from '../components/shared/LotaLogo'

export default function Login() {
  const { login } = useApp()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErro('')

    if (!email || !senha) {
      setErro('Preencha e-mail e senha para continuar.')
      return
    }

    setLoading(true)
    // Simula pequena latência
    await new Promise((r) => setTimeout(r, 600))

    const ok = login(email, senha)
    if (ok) {
      navigate('/')
    } else {
      setErro('Credenciais inválidas.')
      setLoading(false)
    }
  }

  const preencherDemo = () => {
    setEmail('ricardo@bravefit.com.br')
    setSenha('lota2026')
    setErro('')
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--bg-primary)',
      overflow: 'hidden',
    }}>
      {/* Lado esquerdo — Decorativo */}
      <div style={{
        flex: 1,
        display: 'none',
        background: 'linear-gradient(135deg, #0A0A1A 0%, #0D1830 50%, #0A0A1A 100%)',
        position: 'relative',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        padding: 60,
      }}
      className="login-left"
      >
        {/* Glow effects */}
        <div style={{
          position: 'absolute', top: '20%', left: '30%',
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(0,229,255,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '25%', right: '20%',
          width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(0,112,243,0.1) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />

        {/* Stats decorativos */}
        <div style={{
          position: 'absolute',
          top: '15%', right: '10%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: '12px 20px',
          backdropFilter: 'blur(10px)',
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Leads convertidos hoje</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: '#22C55E' }}>+3</p>
        </div>

        <div style={{
          position: 'absolute',
          bottom: '20%', left: '8%',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: '12px 20px',
          backdropFilter: 'blur(10px)',
        }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Taxa de conversão</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>34%</p>
        </div>

        {/* Hero text */}
        <div style={{ textAlign: 'center', maxWidth: 480, position: 'relative', zIndex: 1 }}>
          <div style={{ margin: '0 auto 24px', display: 'flex', justifyContent: 'center' }}>
            <LotaLogo variant="icon" color="dark" width={80} />
          </div>
          <h1 style={{
            fontSize: 38, fontWeight: 800, lineHeight: 1.2,
            marginBottom: 8,
            background: 'var(--accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            LOTA
          </h1>
          <p style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>
            o sistema que lota seu negócio
          </p>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>
            Capture, qualifique e converta leads em alunos matriculados
            sem sair da quadra. O sistema trabalha enquanto você treina.
          </p>

          {/* Features */}
          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              '🎯 Funil de leads automático via WhatsApp',
              '🔄 Follow-up inteligente por momento de compra',
              '🏋 Retenção com alertas de faltas e renovações',
              '🎁 Programa de indicação com ranking',
            ].map((f) => (
              <div key={f} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 8, padding: '10px 14px',
                border: '1px solid var(--border-subtle)',
                textAlign: 'left',
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{f}</span>
              </div>
            ))}
          </div>

          {/* Link para landing */}
          <button
            onClick={() => navigate('/como-funciona')}
            style={{
              marginTop: 24, background: 'none',
              border: '1px solid rgba(0,229,255,0.2)',
              borderRadius: 10, padding: '10px 20px',
              color: '#00E5FF', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,229,255,0.06)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
          >
            📖 Ver como o LOTA funciona →
          </button>
        </div>
      </div>

      {/* Lado direito — Formulário */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        background: '#0A0A0F',
      }}
      className="login-right"
      >
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Logo mobile */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            marginBottom: 40,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <LotaLogo variant="icon" color="dark" width={40} />
              <LotaLogo variant="wordmark" color="dark" width={96} />
            </div>
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            Bem-vindo de volta 👋
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>
            Entre para acessar o painel do seu box
          </p>

          {/* Info de demo */}
          <div style={{
            background: 'rgba(0,229,255,0.06)',
            border: '1px solid rgba(0,229,255,0.15)',
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}>
            <div>
              <p style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>🚀 Demo</p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Qualquer e-mail e senha funcionam
              </p>
            </div>
            <button
              onClick={preencherDemo}
              style={{
                background: 'rgba(0,229,255,0.12)',
                border: '1px solid rgba(0,229,255,0.2)',
                borderRadius: 6,
                color: 'var(--accent)',
                fontSize: 12,
                fontWeight: 600,
                padding: '6px 12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
              id="btn-preencher-demo"
            >
              Preencher
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* E-mail */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com.br"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: 14,
                }}
              />
            </div>

            {/* Senha */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="login-senha"
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 14px',
                    fontSize: 14,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  style={{
                    position: 'absolute', right: 12, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: 'var(--text-muted)', cursor: 'pointer',
                  }}
                  id="btn-toggle-senha"
                >
                  {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {erro && (
              <div style={{
                background: 'rgba(255,68,68,0.08)',
                border: '1px solid rgba(255,68,68,0.2)',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 13,
                color: '#FF4444',
              }}>
                {erro}
              </div>
            )}

            {/* Submit */}
            <button
              id="btn-entrar"
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px',
                background: loading ? 'rgba(0,229,255,0.3)' : 'var(--accent-gradient)',
                border: 'none',
                borderRadius: 10,
                color: loading ? 'rgba(0,0,0,0.5)' : '#000',
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s',
                marginTop: 4,
                boxShadow: loading ? 'none' : '0 4px 24px rgba(0,229,255,0.25)',
              }}
            >
              {loading ? (
                <>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚡</span>
                  Entrando...
                </>
              ) : (
                <>
                  Entrar no painel
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 24 }}>
            Versão demo — dados em memória, sem persistência
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (min-width: 900px) {
          .login-left { display: flex !important; }
          .login-right { max-width: 480px !important; }
        }
      `}</style>
    </div>
  )
}
