/**
 * src/pages/LojaPublica.jsx
 * Loja pública do Bloco LOJA (Fase 5) — catálogo + carrinho + checkout WhatsApp.
 * Rota: /loja/:slug
 */
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ShoppingBag, Plus, Minus, X } from 'lucide-react'
import LotaLogo from '../components/shared/LotaLogo'

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publico`
const HEADERS = {
  'Content-Type': 'application/json',
  apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
}

const input = {
  width: '100%', padding: '12px 14px', fontSize: 14,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10, color: '#fff', outline: 'none',
}

// Wrapper visual FORA do componente — evita remontar os inputs a cada render
// (era a causa do campo perder o foco a cada tecla digitada).
function Tela({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0A0A1A 0%, #0D1830 60%, #0A0A1A 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px 100px', color: '#fff',
    }}>
      <div style={{ marginBottom: 20 }}><LotaLogo variant="icon" color="dark" width={44} /></div>
      <div style={{ width: '100%', maxWidth: 640 }}>{children}</div>
    </div>
  )
}

export default function LojaPublica() {
  const { slug } = useParams()
  const [box, setBox] = useState(null)
  const [produtos, setProdutos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [naoEncontrada, setNaoEncontrada] = useState(false)

  const [carrinho, setCarrinho] = useState({}) // product_id → qtd
  const [checkout, setCheckout] = useState(false)
  const [form, setForm] = useState({ nome: '', whatsapp: '', entrega_data: '', notas: '' })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(null)

  useEffect(() => {
    async function carregar() {
      try {
        const res = await fetch(`${FUNC_URL}?action=loja&slug=${slug}`, { headers: HEADERS })
        if (!res.ok) throw new Error()
        const data = await res.json()
        setBox(data.box)
        setProdutos(data.produtos)
      } catch {
        setNaoEncontrada(true)
      } finally {
        setCarregando(false)
      }
    }
    if (slug) carregar()
  }, [slug])

  const qtdTotal = Object.values(carrinho).reduce((s, q) => s + q, 0)
  const total = produtos.reduce((s, p) => s + (carrinho[p.id] || 0) * Number(p.preco), 0)

  const ajustar = (id, delta) => {
    setCarrinho((c) => {
      const q = Math.max(0, (c[id] || 0) + delta)
      const novo = { ...c }
      if (q === 0) delete novo[id]
      else novo[id] = q
      return novo
    })
  }

  const formatWhatsapp = (val) => {
    const num = val.replace(/\D/g, '').slice(0, 11)
    if (num.length <= 2) return `(${num}`
    if (num.length <= 7) return `(${num.slice(0, 2)}) ${num.slice(2)}`
    return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7)}`
  }

  const finalizar = async (e) => {
    e.preventDefault()
    setErro('')
    if (form.nome.trim().length < 2) { setErro('Digite seu nome'); return }
    if (form.whatsapp.replace(/\D/g, '').length < 10) { setErro('WhatsApp inválido'); return }

    setEnviando(true)
    try {
      const res = await fetch(FUNC_URL, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({
          action: 'pedido', slug,
          carrinho: Object.entries(carrinho).map(([product_id, qtd]) => ({ product_id, qtd })),
          nome: form.nome.trim(), whatsapp: form.whatsapp,
          entrega_data: form.entrega_data || null, notas: form.notas,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro')
      setSucesso(data)
    } catch (err) {
      setErro(err.message || 'Erro ao enviar pedido')
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) return <Tela><p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Carregando…</p></Tela>
  if (naoEncontrada) return <Tela><p style={{ textAlign: 'center' }}>😕 Loja não encontrada.</p></Tela>

  if (sucesso) {
    return (
      <Tela>
        <div style={{
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 16, padding: 32, textAlign: 'center',
        }}>
          <p style={{ fontSize: 44, marginBottom: 12 }}>🛍</p>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Pedido registrado!</h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>
            Total: <strong>R$ {Number(sucesso.total).toFixed(2)}</strong>. Agora é só confirmar
            o pagamento e a entrega direto com o {box?.nome} no WhatsApp:
          </p>
          <a href={sucesso.link_whatsapp} target="_blank" rel="noreferrer" style={{
            display: 'inline-block', padding: '14px 28px', borderRadius: 12,
            background: '#25D366', color: '#000', fontWeight: 800, fontSize: 15, textDecoration: 'none',
          }}>
            💬 Finalizar no WhatsApp
          </a>
        </div>
      </Tela>
    )
  }

  return (
    <Tela>
      <h1 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center' }}>{box?.nome}</h1>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 24 }}>
        Escolha seus produtos e finalize pelo WhatsApp
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {produtos.map((p) => {
          const foto = Array.isArray(p.fotos) && p.fotos[0]
          return (
            <div key={p.id} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14, overflow: 'hidden', opacity: p.esgotado ? 0.45 : 1,
            }}>
              {foto && <img src={foto} alt={p.nome} style={{ width: '100%', height: 150, objectFit: 'cover' }} />}
              <div style={{ padding: 14 }}>
                <p style={{ fontWeight: 700, fontSize: 14.5 }}>{p.nome}</p>
                {p.descricao && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{p.descricao}</p>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#00E5FF' }}>
                    R$ {Number(p.preco).toFixed(2)}
                  </span>
                  {p.esgotado ? (
                    <span style={{ fontSize: 11, color: '#FF4444', fontWeight: 700 }}>ESGOTADO</span>
                  ) : carrinho[p.id] ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                      <button onClick={() => ajustar(p.id, -1)} style={{ ...botaoQtd }}><Minus size={13} /></button>
                      <strong>{carrinho[p.id]}</strong>
                      <button onClick={() => ajustar(p.id, 1)} style={{ ...botaoQtd }}><Plus size={13} /></button>
                    </span>
                  ) : (
                    <button onClick={() => ajustar(p.id, 1)} style={{
                      padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                      background: 'rgba(0,229,255,0.15)', color: '#00E5FF', fontWeight: 700, fontSize: 12.5,
                    }}>
                      + Adicionar
                    </button>
                  )}
                </div>
                {p.ultimas_unidades && !p.esgotado && (
                  <p style={{ fontSize: 10.5, color: '#FFB800', marginTop: 6 }}>⚡ Últimas unidades!</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Barra do carrinho */}
      {qtdTotal > 0 && !checkout && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, padding: 16,
          background: 'rgba(10,10,20,0.95)', borderTop: '1px solid rgba(0,229,255,0.3)',
          display: 'flex', justifyContent: 'center',
        }}>
          <button onClick={() => setCheckout(true)} style={{
            width: '100%', maxWidth: 640, padding: 15, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #00E5FF, #0070F3)', color: '#000',
            fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <ShoppingBag size={18} /> Fechar pedido ({qtdTotal}) — R$ {total.toFixed(2)}
          </button>
        </div>
      )}

      {/* Checkout */}
      {checkout && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <form onSubmit={finalizar} style={{
            width: '100%', maxWidth: 440, background: '#0D1224', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.12)', padding: 24,
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 17, fontWeight: 800 }}>Seu pedido — R$ {total.toFixed(2)}</h3>
              <button type="button" onClick={() => setCheckout(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>
            <input style={input} placeholder="Seu nome" value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
            <input style={input} placeholder="(00) 00000-0000" value={form.whatsapp}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp: formatWhatsapp(e.target.value) }))} />
            <div>
              <label style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)' }}>Data de entrega desejada (opcional)</label>
              <input style={input} type="date" value={form.entrega_data}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm((f) => ({ ...f, entrega_data: e.target.value }))} />
            </div>
            <input style={input} placeholder="Observações (opcional)" value={form.notas}
              onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} />
            {erro && <p style={{ fontSize: 13, color: '#FF4444' }}>{erro}</p>}
            <button type="submit" disabled={enviando} style={{
              padding: 14, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#25D366', color: '#000', fontWeight: 800, fontSize: 15,
            }}>
              {enviando ? 'Enviando…' : '💬 Enviar pedido e chamar no WhatsApp'}
            </button>
          </form>
        </div>
      )}
    </Tela>
  )
}

const botaoQtd = {
  width: 26, height: 26, borderRadius: 7, border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.06)', color: '#fff', cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
}
