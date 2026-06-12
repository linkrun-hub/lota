/**
 * src/pages/FormularioPublico.jsx
 * Canal de entrada de leads: Formulário público do box
 * Rota pública: /f/:slug
 *
 * Como funciona:
 * 1. Dono compartilha o link /f/bravefit no Instagram, Stories, Bio, WhatsApp, cartão
 * 2. Interessado acessa, preenche nome + WhatsApp + interesse + consente com LGPD
 * 3. Lead é criado no Supabase com origem = 'landing_page'
 * 4. Dono recebe notificação no painel em tempo real
 */
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getBoxPublico, criarLeadPublico } from '../lib/publicoApi'
import LotaLogo from '../components/shared/LotaLogo'

const INTERESSES = [
  'CrossFit', 'Musculação', 'Funcional', 'Emagrecimento',
  'Hipertrofia', 'Condicionamento', 'Yoga / Mobilidade', 'Outro',
]

const MOMENTOS = [
  { val: 'agora', label: '🔥 Quero começar agora!', desc: 'Estou decidido(a)' },
  { val: 'em_breve', label: '📅 Em breve', desc: 'Nos próximos 1–2 meses' },
  { val: 'comparando', label: '🔍 Ainda pesquisando', desc: 'Quero conhecer primeiro' },
]

export default function FormularioPublico() {
  const { slug } = useParams()
  const [box, setBox] = useState(null)
  const [loadingBox, setLoadingBox] = useState(true)
  const [boxNaoEncontrado, setBoxNaoEncontrado] = useState(false)

  const [form, setForm] = useState({
    nome: '',
    whatsapp: '',
    email: '',
    interesse: [],
    momento_compra: '',
    lgpd_consent: false,
  })
  const [erros, setErros] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  // Busca dados do box pelo slug (via Edge Function publico)
  useEffect(() => {
    async function carregarBox() {
      try {
        const data = await getBoxPublico(slug)
        setBox(data)
      } catch {
        setBoxNaoEncontrado(true)
      } finally {
        setLoadingBox(false)
      }
    }
    if (slug) carregarBox()
  }, [slug])

  const toggleInteresse = (item) => {
    setForm((f) => ({
      ...f,
      interesse: f.interesse.includes(item)
        ? f.interesse.filter((i) => i !== item)
        : [...f.interesse, item],
    }))
  }

  const validar = () => {
    const e = {}
    if (!form.nome.trim() || form.nome.trim().length < 2) e.nome = 'Digite seu nome completo'
    if (!form.whatsapp.trim() || form.whatsapp.replace(/\D/g, '').length < 10) e.whatsapp = 'Digite um WhatsApp válido'
    if (!form.momento_compra) e.momento_compra = 'Selecione uma opção'
    if (!form.lgpd_consent) e.lgpd = 'Você precisa aceitar para continuar'
    return e
  }

  const formatWhatsapp = (val) => {
    const num = val.replace(/\D/g, '').slice(0, 11)
    if (num.length <= 2) return `(${num}`
    if (num.length <= 7) return `(${num.slice(0, 2)}) ${num.slice(2)}`
    if (num.length <= 11) return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7)}`
    return val
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const e2 = validar()
    if (Object.keys(e2).length > 0) { setErros(e2); return }
    setErros({})
    setEnviando(true)
    setErro('')

    try {
      // Validação, formatação E.164, criação do lead e notificação
      // acontecem na Edge Function (banco fechado por RLS)
      await criarLeadPublico({
        slug,
        nome: form.nome.trim(),
        whatsapp: form.whatsapp,
        email: form.email.trim(),
        interesse: form.interesse,
        momento_compra: form.momento_compra,
        lgpd_consent: form.lgpd_consent,
        utm_source: new URLSearchParams(window.location.search).get('utm_source') || null,
        utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') || null,
      })

      setSucesso(true)
    } catch (err) {
      setErro('Erro ao enviar. Tente novamente em instantes.')
      console.error(err)
    } finally {
      setEnviando(false)
    }
  }

  // ─── Estados de carregamento / erro ──────────────────────────────────────────
  if (loadingBox) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0F' }}>
        <div style={{ textAlign: 'center' }}>
          <LotaLogo variant="icon" color="dark" width={56} />
          <p style={{ color: '#6B7280', marginTop: 16, fontSize: 14 }}>Carregando...</p>
        </div>
      </div>
    )
  }

  if (boxNaoEncontrado) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0F', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
          <h1 style={{ color: '#E8E8F0', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Box não encontrado</h1>
          <p style={{ color: '#6B7280', fontSize: 14 }}>O link que você acessou não corresponde a nenhum box cadastrado. Verifique com quem te enviou.</p>
        </div>
      </div>
    )
  }

  // ─── Tela de sucesso ─────────────────────────────────────────────────────────
  if (sucesso) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{
          background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(0,229,255,0.2)',
          borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 440, width: '100%',
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h2 style={{ color: '#E8E8F0', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
            Recebemos seu contato!
          </h2>
          <p style={{ color: '#9CA3AF', fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
            <strong style={{ color: '#00E5FF' }}>{box.nome}</strong> vai entrar em contato com você em breve pelo WhatsApp.<br />
            Fique de olho nas mensagens! 📱
          </p>
          <div style={{
            background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)',
            borderRadius: 12, padding: '14px 20px', fontSize: 13, color: '#9CA3AF',
          }}>
            ✅ Seus dados foram registrados com segurança.<br />
            Você pode solicitar exclusão a qualquer momento.
          </div>
          <div style={{ marginTop: 24 }}>
            <LotaLogo variant="wordmark" color="dark" width={80} />
          </div>
        </div>
      </div>
    )
  }

  // ─── Formulário principal ─────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', padding: '40px 16px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Glow de fundo */}
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(0,112,243,0.06) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ maxWidth: 500, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Header do box */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <LotaLogo variant="icon" color="dark" width={52} />
          <h1 style={{ color: '#E8E8F0', fontSize: 26, fontWeight: 800, marginTop: 16, marginBottom: 4 }}>
            {box.nome}
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14 }}>
            Preencha o formulário e entraremos em contato pelo WhatsApp!
          </p>
        </div>

        {/* Card do formulário */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 20, padding: '32px 28px',
        }}>
          <form onSubmit={handleSubmit}>

            {/* Nome */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#9CA3AF', marginBottom: 6 }}>
                Nome completo *
              </label>
              <input
                id="input-nome"
                type="text"
                placeholder="Seu nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${erros.nome ? '#FF4444' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 10, padding: '12px 14px', color: '#E8E8F0',
                  fontSize: 15, outline: 'none', boxSizing: 'border-box',
                }}
              />
              {erros.nome && <p style={{ color: '#FF4444', fontSize: 12, marginTop: 4 }}>{erros.nome}</p>}
            </div>

            {/* WhatsApp */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#9CA3AF', marginBottom: 6 }}>
                WhatsApp *
              </label>
              <input
                id="input-whatsapp"
                type="tel"
                placeholder="(31) 99999-9999"
                value={form.whatsapp}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp: formatWhatsapp(e.target.value) }))}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${erros.whatsapp ? '#FF4444' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 10, padding: '12px 14px', color: '#E8E8F0',
                  fontSize: 15, outline: 'none', boxSizing: 'border-box',
                }}
              />
              {erros.whatsapp && <p style={{ color: '#FF4444', fontSize: 12, marginTop: 4 }}>{erros.whatsapp}</p>}
            </div>

            {/* Email (opcional) */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#9CA3AF', marginBottom: 6 }}>
                E-mail <span style={{ color: '#4B5563', fontWeight: 400 }}>(opcional)</span>
              </label>
              <input
                id="input-email"
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 10, padding: '12px 14px', color: '#E8E8F0',
                  fontSize: 15, outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Interesse */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#9CA3AF', marginBottom: 10 }}>
                O que te interessa? <span style={{ color: '#4B5563', fontWeight: 400 }}>(opcional)</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {INTERESSES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleInteresse(item)}
                    style={{
                      background: form.interesse.includes(item) ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${form.interesse.includes(item) ? '#00E5FF' : 'rgba(255,255,255,0.08)'}`,
                      color: form.interesse.includes(item) ? '#00E5FF' : '#9CA3AF',
                      borderRadius: 8, padding: '7px 14px', fontSize: 13,
                      cursor: 'pointer', fontWeight: form.interesse.includes(item) ? 600 : 400,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Momento de compra */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#9CA3AF', marginBottom: 10 }}>
                Quando você quer começar? *
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {MOMENTOS.map((m) => (
                  <button
                    key={m.val}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, momento_compra: m.val }))}
                    style={{
                      background: form.momento_compra === m.val ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.02)',
                      border: `1px solid ${form.momento_compra === m.val ? '#00E5FF' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      transition: 'all 0.2s ease', textAlign: 'left',
                    }}
                  >
                    <span style={{ color: form.momento_compra === m.val ? '#00E5FF' : '#E8E8F0', fontWeight: 600, fontSize: 14 }}>{m.label}</span>
                    <span style={{ color: '#4B5563', fontSize: 12 }}>{m.desc}</span>
                  </button>
                ))}
              </div>
              {erros.momento_compra && <p style={{ color: '#FF4444', fontSize: 12, marginTop: 6 }}>{erros.momento_compra}</p>}
            </div>

            {/* LGPD */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'flex', gap: 12, cursor: 'pointer',
                background: 'rgba(255,255,255,0.02)', border: `1px solid ${erros.lgpd ? '#FF4444' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 10, padding: '12px 14px',
              }}>
                <input
                  id="check-lgpd"
                  type="checkbox"
                  checked={form.lgpd_consent}
                  onChange={(e) => setForm((f) => ({ ...f, lgpd_consent: e.target.checked }))}
                  style={{ width: 16, height: 16, flexShrink: 0, accentColor: '#00E5FF', marginTop: 2 }}
                />
                <span style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
                  Concordo em receber contato por WhatsApp e email de <strong style={{ color: '#9CA3AF' }}>{box.nome}</strong>. Posso cancelar a qualquer momento. <span style={{ color: '#4B5563' }}>(LGPD — Lei 13.709/18)</span>
                </span>
              </label>
              {erros.lgpd && <p style={{ color: '#FF4444', fontSize: 12, marginTop: 4 }}>{erros.lgpd}</p>}
            </div>

            {/* Erro geral */}
            {erro && (
              <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 10, padding: '12px 14px', color: '#FF4444', fontSize: 13, marginBottom: 16 }}>
                ⚠️ {erro}
              </div>
            )}

            {/* Botão */}
            <button
              id="btn-enviar-formulario"
              type="submit"
              disabled={enviando}
              style={{
                width: '100%', background: enviando ? 'rgba(0,229,255,0.3)' : 'linear-gradient(135deg, #0070F3, #00E5FF)',
                color: '#000', fontWeight: 800, fontSize: 16,
                borderRadius: 12, padding: '14px 0', border: 'none',
                cursor: enviando ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: '0 8px 24px rgba(0,229,255,0.2)',
              }}
            >
              {enviando ? '⏳ Enviando...' : '📲 Quero ser contactado!'}
            </button>
          </form>
        </div>

        {/* Rodapé LGPD */}
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <LotaLogo variant="wordmark" color="dark" width={64} />
          <p style={{ fontSize: 11, color: '#374151', marginTop: 8 }}>
            Powered by LOTA · Seus dados são protegidos pela LGPD
          </p>
        </div>
      </div>

      <style>{`
        input::placeholder { color: #4B5563; }
        input:focus { border-color: rgba(0,229,255,0.3) !important; box-shadow: 0 0 0 3px rgba(0,229,255,0.06); }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
