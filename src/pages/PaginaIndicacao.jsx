/**
 * src/pages/PaginaIndicacao.jsx
 * Canal de entrada: Link de indicação de aluno
 * Rota pública: /i/:token
 *
 * Como funciona:
 * 1. Aluno recebe um link único com token (ex: lota.app/i/RENA8F2A)
 * 2. Compartilha com amigos no WhatsApp, Instagram, etc.
 * 3. Amigo acessa o link, vê que foi indicado pelo aluno
 * 4. Preenche formulário → lead entra com origem = 'indicacao' + referência ao aluno
 * 5. Aluno indicador é notificado quando o amigo se cadastra
 */
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getIndicacaoPublica, criarLeadIndicacao } from '../lib/publicoApi'
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

export default function PaginaIndicacao() {
  const { token } = useParams()
  const [indicacao, setIndicacao] = useState(null)
  const [box, setBox] = useState(null)
  const [loading, setLoading] = useState(true)
  const [invalido, setInvalido] = useState(false)

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
  const [erroGeral, setErroGeral] = useState('')

  useEffect(() => {
    async function carregarIndicacao() {
      try {
        // Validação de token/expiração acontece na Edge Function publico
        const data = await getIndicacaoPublica(token)
        setIndicacao({
          status: data.status,
          aluno_indicador: { nome: data.indicador_nome },
        })
        setBox(data.box)
      } catch {
        setInvalido(true)
      } finally {
        setLoading(false)
      }
    }
    if (token) carregarIndicacao()
  }, [token])

  const toggleInteresse = (item) => {
    setForm((f) => ({
      ...f,
      interesse: f.interesse.includes(item)
        ? f.interesse.filter((i) => i !== item)
        : [...f.interesse, item],
    }))
  }

  const formatWhatsapp = (val) => {
    const num = val.replace(/\D/g, '').slice(0, 11)
    if (num.length <= 2) return `(${num}`
    if (num.length <= 7) return `(${num.slice(0, 2)}) ${num.slice(2)}`
    if (num.length <= 11) return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7)}`
    return val
  }

  const validar = () => {
    const e = {}
    if (!form.nome.trim() || form.nome.trim().length < 2) e.nome = 'Digite seu nome completo'
    if (!form.whatsapp.trim() || form.whatsapp.replace(/\D/g, '').length < 10) e.whatsapp = 'Digite um WhatsApp válido'
    if (!form.momento_compra) e.momento_compra = 'Selecione uma opção'
    if (!form.lgpd_consent) e.lgpd = 'Você precisa aceitar para continuar'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const e2 = validar()
    if (Object.keys(e2).length > 0) { setErros(e2); return }
    setErros({})
    setEnviando(true)
    setErroGeral('')

    try {
      // Lead + follow-up + boas-vindas + vínculo da indicação + notificação:
      // tudo na Edge Function publico (banco fechado por RLS)
      await criarLeadIndicacao({
        token,
        nome: form.nome.trim(),
        whatsapp: form.whatsapp,
        email: form.email.trim(),
        interesse: form.interesse,
        momento_compra: form.momento_compra,
        lgpd_consent: form.lgpd_consent,
      })

      setSucesso(true)
    } catch (err) {
      setErroGeral('Erro ao enviar. Tente novamente em instantes.')
      console.error(err)
    } finally {
      setEnviando(false)
    }
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0F' }}>
        <LotaLogo variant="icon" color="dark" width={56} />
      </div>
    )
  }

  // ─── Token inválido / expirado ────────────────────────────────────────────────
  if (invalido) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0F', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
          <h1 style={{ color: '#E8E8F0', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Link inválido ou expirado</h1>
          <p style={{ color: '#6B7280', fontSize: 14, lineHeight: 1.6 }}>
            Este link de indicação não está mais ativo. Peça um novo link ao aluno que te indicou!
          </p>
        </div>
      </div>
    )
  }

  // ─── Sucesso ─────────────────────────────────────────────────────────────────
  if (sucesso) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A0F', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{
          background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 20, padding: 40, textAlign: 'center', maxWidth: 440, width: '100%',
        }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h2 style={{ color: '#E8E8F0', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Cadastro feito!</h2>
          <p style={{ color: '#9CA3AF', fontSize: 15, lineHeight: 1.7, marginBottom: 16 }}>
            <strong style={{ color: '#00E5FF' }}>{box.nome}</strong> vai entrar em contato com você em breve.
          </p>
          <div style={{
            background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)',
            borderRadius: 12, padding: '14px 16px', fontSize: 13, color: '#9CA3AF', marginBottom: 20,
          }}>
          🎁 <strong style={{ color: '#22C55E' }}>{indicacao.aluno_indicador?.nome}</strong> também vai ganhar um benefício por te indicar! Que generoso(a)! 😄
          </div>
          <LotaLogo variant="wordmark" color="dark" width={80} />
        </div>
      </div>
    )
  }

  // ─── Formulário ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', padding: '40px 16px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, background: 'radial-gradient(circle, rgba(34,197,94,0.05) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ maxWidth: 500, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Banner de indicação */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(0,112,243,0.1))',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 16, padding: '20px 24px', marginBottom: 24, textAlign: 'center',
        }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>🎁</div>
          <p style={{ color: '#9CA3AF', fontSize: 14, marginBottom: 4 }}>Você foi indicado por</p>
          <p style={{ color: '#22C55E', fontSize: 20, fontWeight: 800 }}>{indicacao.aluno_indicador?.nome}</p>
          <p style={{ color: '#6B7280', fontSize: 13, marginTop: 6 }}>
            para conhecer o <strong style={{ color: '#E8E8F0' }}>{box.nome}</strong>!
          </p>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <LotaLogo variant="icon" color="dark" width={48} />
          <h1 style={{ color: '#E8E8F0', fontSize: 22, fontWeight: 800, marginTop: 14, marginBottom: 4 }}>
            {box.nome}
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14 }}>
            Preencha e entraremos em contato pelo WhatsApp!
          </p>
        </div>

        {/* Formulário */}
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 20, padding: '28px 24px',
        }}>
          <form onSubmit={handleSubmit}>
            {/* Nome */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#9CA3AF', marginBottom: 6 }}>Nome completo *</label>
              <input
                id="ind-input-nome"
                type="text"
                placeholder="Seu nome"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${erros.nome ? '#FF4444' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '12px 14px', color: '#E8E8F0', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
              />
              {erros.nome && <p style={{ color: '#FF4444', fontSize: 12, marginTop: 4 }}>{erros.nome}</p>}
            </div>

            {/* WhatsApp */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#9CA3AF', marginBottom: 6 }}>WhatsApp *</label>
              <input
                id="ind-input-whatsapp"
                type="tel"
                placeholder="(31) 99999-9999"
                value={form.whatsapp}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp: formatWhatsapp(e.target.value) }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: `1px solid ${erros.whatsapp ? '#FF4444' : 'rgba(255,255,255,0.08)'}`, borderRadius: 10, padding: '12px 14px', color: '#E8E8F0', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
              />
              {erros.whatsapp && <p style={{ color: '#FF4444', fontSize: 12, marginTop: 4 }}>{erros.whatsapp}</p>}
            </div>

            {/* Email opcional */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#9CA3AF', marginBottom: 6 }}>E-mail <span style={{ color: '#4B5563', fontWeight: 400 }}>(opcional)</span></label>
              <input
                type="email"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px', color: '#E8E8F0', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {/* Interesse */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#9CA3AF', marginBottom: 8 }}>O que te interessa?</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {INTERESSES.map((item) => (
                  <button key={item} type="button" onClick={() => toggleInteresse(item)}
                    style={{ background: form.interesse.includes(item) ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)', border: `1px solid ${form.interesse.includes(item) ? '#22C55E' : 'rgba(255,255,255,0.08)'}`, color: form.interesse.includes(item) ? '#22C55E' : '#9CA3AF', borderRadius: 8, padding: '7px 14px', fontSize: 13, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Momento */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#9CA3AF', marginBottom: 8 }}>Quando quer começar? *</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {MOMENTOS.map((m) => (
                  <button key={m.val} type="button" onClick={() => setForm((f) => ({ ...f, momento_compra: m.val }))}
                    style={{ background: form.momento_compra === m.val ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${form.momento_compra === m.val ? '#22C55E' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, padding: '11px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease' }}>
                    <span style={{ color: form.momento_compra === m.val ? '#22C55E' : '#E8E8F0', fontWeight: 600, fontSize: 14 }}>{m.label}</span>
                    <span style={{ color: '#4B5563', fontSize: 12 }}>{m.desc}</span>
                  </button>
                ))}
              </div>
              {erros.momento_compra && <p style={{ color: '#FF4444', fontSize: 12, marginTop: 6 }}>{erros.momento_compra}</p>}
            </div>

            {/* LGPD */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'flex', gap: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: `1px solid ${erros.lgpd ? '#FF4444' : 'rgba(255,255,255,0.06)'}`, borderRadius: 10, padding: '12px 14px' }}>
                <input type="checkbox" checked={form.lgpd_consent} onChange={(e) => setForm((f) => ({ ...f, lgpd_consent: e.target.checked }))} style={{ width: 16, height: 16, flexShrink: 0, accentColor: '#22C55E', marginTop: 2 }} />
                <span style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.6 }}>
                  Concordo em receber contato de <strong style={{ color: '#9CA3AF' }}>{box.nome}</strong> via WhatsApp e email. Posso cancelar a qualquer momento. <span style={{ color: '#4B5563' }}>(LGPD)</span>
                </span>
              </label>
              {erros.lgpd && <p style={{ color: '#FF4444', fontSize: 12, marginTop: 4 }}>{erros.lgpd}</p>}
            </div>

            {erroGeral && (
              <div style={{ background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.2)', borderRadius: 10, padding: '12px 14px', color: '#FF4444', fontSize: 13, marginBottom: 16 }}>⚠️ {erroGeral}</div>
            )}

            <button
              id="ind-btn-enviar"
              type="submit"
              disabled={enviando}
              style={{ width: '100%', background: enviando ? 'rgba(34,197,94,0.3)' : 'linear-gradient(135deg, #16A34A, #22C55E)', color: '#000', fontWeight: 800, fontSize: 16, borderRadius: 12, padding: '14px 0', border: 'none', cursor: enviando ? 'wait' : 'pointer', boxShadow: '0 8px 24px rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {enviando ? '⏳ Enviando...' : '🎁 Quero conhecer o box!'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <LotaLogo variant="wordmark" color="dark" width={60} />
          <p style={{ fontSize: 11, color: '#374151', marginTop: 8 }}>Powered by LOTA · LGPD compliant</p>
        </div>
      </div>

      <style>{`
        input::placeholder { color: #4B5563; }
        input:focus { border-color: rgba(34,197,94,0.3) !important; box-shadow: 0 0 0 3px rgba(34,197,94,0.06); }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}
