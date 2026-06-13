/**
 * src/pages/Loja.jsx
 * Painel do Bloco LOJA (Fase 5): produtos e pedidos.
 * Loja pública correspondente: /loja/:slug
 */
import { useState, useEffect, useCallback } from 'react'
import {
  ShoppingBag, Plus, Trash2, Copy, Check, Loader, Package,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

const STATUS_PEDIDO = {
  novo:       { label: 'Novo',       color: '#00E5FF' },
  confirmado: { label: 'Confirmado', color: '#A78BFA' },
  entregue:   { label: 'Entregue',   color: '#22C55E' },
  cancelado:  { label: 'Cancelado',  color: '#6B7280' },
}

const input = {
  padding: '9px 12px', fontSize: 13, background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border-subtle)', borderRadius: 8, color: 'var(--text-primary)',
}
const btn = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
  borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600,
  color: 'var(--text-secondary)', cursor: 'pointer',
}
const card = {
  background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
  borderRadius: 14, padding: 18,
}

export default function Loja() {
  const { box } = useApp()
  const [aba, setAba] = useState('pedidos')
  const [produtos, setProdutos] = useState([])
  const [pedidos, setPedidos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const [novoProduto, setNovoProduto] = useState(null)

  const carregar = useCallback(async () => {
    if (!box?.id) return
    setCarregando(true)
    const [p, o] = await Promise.all([
      supabase.from('products').select('*').eq('box_id', box.id).order('nome'),
      supabase.from('orders').select('*').eq('box_id', box.id).order('created_at', { ascending: false }).limit(80),
    ])
    setProdutos(p.data || [])
    setPedidos(o.data || [])
    setCarregando(false)
  }, [box?.id])

  useEffect(() => { carregar() }, [carregar])

  const linkLoja = `${window.location.origin}/loja/${box?.slug}`
  const copiarLink = () => {
    navigator.clipboard.writeText(linkLoja)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const salvarProduto = async () => {
    if (!novoProduto?.nome || !novoProduto?.preco) return
    await supabase.from('products').insert({
      box_id: box.id,
      nome: novoProduto.nome,
      descricao: novoProduto.descricao || null,
      preco: Number(novoProduto.preco),
      estoque: novoProduto.estoque === '' || novoProduto.estoque == null ? null : Number(novoProduto.estoque),
      categoria: novoProduto.categoria || null,
      fotos: novoProduto.foto ? [novoProduto.foto] : [],
      ativo: true,
    })
    setNovoProduto(null)
    carregar()
  }

  const toggleProduto = async (p) => {
    await supabase.from('products').update({ ativo: !p.ativo }).eq('id', p.id)
    carregar()
  }
  const excluirProduto = async (p) => {
    if (!window.confirm(`Excluir "${p.nome}"?`)) return
    await supabase.from('products').delete().eq('id', p.id)
    carregar()
  }
  const mudarStatusPedido = async (pedido, status) => {
    await supabase.from('orders').update({ status }).eq('id', pedido.id)
    carregar()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ShoppingBag size={22} color="var(--accent)" />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>Loja</h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Catálogo público com checkout pelo WhatsApp
            </p>
          </div>
        </div>
        <button style={btn} onClick={copiarLink}>
          {copiado ? <Check size={14} color="#22C55E" /> : <Copy size={14} />}
          {copiado ? 'Copiado!' : linkLoja.replace(/^https?:\/\//, '')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {[['pedidos', `Pedidos (${pedidos.filter((p) => p.status === 'novo').length} novos)`], ['produtos', 'Produtos']].map(([k, l]) => (
          <button key={k} onClick={() => setAba(k)} style={{
            ...btn,
            background: aba === k ? 'rgba(0,229,255,0.12)' : btn.background,
            color: aba === k ? 'var(--accent)' : btn.color,
          }}>
            {l}
          </button>
        ))}
      </div>

      {carregando && (
        <div style={{ display: 'flex', gap: 8, color: 'var(--text-muted)', padding: 30, justifyContent: 'center' }}>
          <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Carregando…
        </div>
      )}

      {/* PEDIDOS */}
      {!carregando && aba === 'pedidos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pedidos.length === 0 && (
            <div style={{ ...card, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              Nenhum pedido ainda. Divulgue o link da loja! 🛍
            </div>
          )}
          {pedidos.map((p) => {
            const st = STATUS_PEDIDO[p.status] || STATUS_PEDIDO.novo
            return (
              <div key={p.id} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{p.cliente_nome}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: `${st.color}22`, color: st.color }}>
                        {st.label}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#22C55E' }}>
                        R$ {Number(p.total).toFixed(2)}
                      </span>
                    </div>
                    <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 4 }}>
                      {(p.itens || []).map((i) => `${i.qtd}x ${i.nome}`).join(' · ')}
                      {p.entrega_data && ` · 📅 entrega ${p.entrega_data.split('-').reverse().join('/')}`}
                      {' · '}{p.cliente_whatsapp}
                    </p>
                    {p.notas && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>📝 {p.notas}</p>}
                  </div>
                  {!['entregue', 'cancelado'].includes(p.status) && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {p.status === 'novo' && (
                        <button style={{ ...btn, color: '#A78BFA' }} onClick={() => mudarStatusPedido(p, 'confirmado')}>Confirmar</button>
                      )}
                      <button style={{ ...btn, color: '#22C55E' }} onClick={() => mudarStatusPedido(p, 'entregue')}>Entregue</button>
                      <button style={btn} onClick={() => mudarStatusPedido(p, 'cancelado')}>Cancelar</button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* PRODUTOS */}
      {!carregando && aba === 'produtos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {produtos.map((p) => (
            <div key={p.id} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, opacity: p.ativo ? 1 : 0.55 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Package size={18} color="var(--text-muted)" />
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14.5 }}>{p.nome}</span>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    R$ {Number(p.preco).toFixed(2)}
                    {' · '}{p.estoque === null ? 'sob encomenda' : `${p.estoque} em estoque`}
                    {p.categoria && ` · ${p.categoria}`}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={btn} onClick={() => toggleProduto(p)}>{p.ativo ? 'Desativar' : 'Ativar'}</button>
                <button style={{ ...btn, color: '#FF4444' }} onClick={() => excluirProduto(p)}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}

          {novoProduto ? (
            <div style={card}>
              <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Novo produto</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input style={{ ...input, flex: 2, minWidth: 160 }} placeholder="Nome" value={novoProduto.nome ?? ''}
                  onChange={(e) => setNovoProduto((p) => ({ ...p, nome: e.target.value }))} />
                <input style={{ ...input, width: 100 }} type="number" step="0.01" placeholder="Preço" value={novoProduto.preco ?? ''}
                  onChange={(e) => setNovoProduto((p) => ({ ...p, preco: e.target.value }))} />
                <input style={{ ...input, width: 130 }} type="number" placeholder="Estoque (vazio = ∞)" value={novoProduto.estoque ?? ''}
                  onChange={(e) => setNovoProduto((p) => ({ ...p, estoque: e.target.value }))} />
                <input style={{ ...input, width: 120 }} placeholder="Categoria" value={novoProduto.categoria ?? ''}
                  onChange={(e) => setNovoProduto((p) => ({ ...p, categoria: e.target.value }))} />
              </div>
              <input style={{ ...input, width: '100%', marginTop: 8 }} placeholder="Descrição (opcional)" value={novoProduto.descricao ?? ''}
                onChange={(e) => setNovoProduto((p) => ({ ...p, descricao: e.target.value }))} />
              <input style={{ ...input, width: '100%', marginTop: 8 }} placeholder="URL da foto (opcional)" value={novoProduto.foto ?? ''}
                onChange={(e) => setNovoProduto((p) => ({ ...p, foto: e.target.value }))} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button style={{ ...btn, background: 'rgba(0,229,255,0.12)', color: 'var(--accent)' }} onClick={salvarProduto}>
                  <Check size={14} /> Salvar
                </button>
                <button style={btn} onClick={() => setNovoProduto(null)}>Cancelar</button>
              </div>
            </div>
          ) : (
            <button style={{ ...btn, alignSelf: 'flex-start' }} onClick={() => setNovoProduto({})}>
              <Plus size={14} /> Novo produto
            </button>
          )}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
