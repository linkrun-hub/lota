import { describe, it, expect } from 'vitest'
import { montarPedido, resumoPedidoWhatsApp } from './loja'

const catalogo = [
  { id: 'p1', nome: 'Top Fitness', preco: 89.9, estoque: 5, ativo: true },
  { id: 'p2', nome: 'Legging Pro', preco: 149.5, estoque: null, ativo: true }, // ilimitado
  { id: 'p3', nome: 'Antigo', preco: 50, estoque: 10, ativo: false },
]

describe('montarPedido', () => {
  it('calcula total com preço do CATÁLOGO (nunca do cliente)', () => {
    const r = montarPedido([{ product_id: 'p1', qtd: 2 }, { product_id: 'p2', qtd: 1 }], catalogo)
    expect(r.ok).toBe(true)
    expect(r.total).toBe(89.9 * 2 + 149.5)
    expect(r.itens).toHaveLength(2)
  })
  it('recusa carrinho vazio', () => {
    expect(montarPedido([], catalogo).erro).toBe('Carrinho vazio')
  })
  it('recusa produto inativo', () => {
    expect(montarPedido([{ product_id: 'p3', qtd: 1 }], catalogo).erro).toBe('Produto indisponível')
  })
  it('recusa produto inexistente', () => {
    expect(montarPedido([{ product_id: 'x', qtd: 1 }], catalogo).erro).toBe('Produto indisponível')
  })
  it('recusa estoque insuficiente', () => {
    expect(montarPedido([{ product_id: 'p1', qtd: 6 }], catalogo).erro).toContain('Estoque insuficiente')
  })
  it('estoque null = ilimitado (sob encomenda)', () => {
    expect(montarPedido([{ product_id: 'p2', qtd: 100 }], catalogo).ok).toBe(true)
  })
  it('recusa quantidade zero, negativa ou não numérica', () => {
    expect(montarPedido([{ product_id: 'p1', qtd: 0 }], catalogo).ok).toBe(false)
    expect(montarPedido([{ product_id: 'p1', qtd: -2 }], catalogo).ok).toBe(false)
    expect(montarPedido([{ product_id: 'p1', qtd: NaN }], catalogo).ok).toBe(false)
  })
  it('arredonda total a 2 casas', () => {
    const r = montarPedido([{ product_id: 'p1', qtd: 3 }], catalogo)
    expect(r.total).toBe(269.7)
  })
})

describe('resumoPedidoWhatsApp', () => {
  it('monta resumo com itens, total e data de entrega', () => {
    const txt = resumoPedidoWhatsApp('Doce Mel', 'Ana', [
      { product_id: 'p1', nome: 'Bolo de pote', qtd: 10, preco: 12 },
    ], 120, '2026-06-20')
    expect(txt).toContain('10x Bolo de pote')
    expect(txt).toContain('Total: R$ 120.00')
    expect(txt).toContain('20/06/2026')
  })
})
