/**
 * supabase/functions/_shared/loja.ts
 * Regras puras do Bloco LOJA — testáveis com Vitest.
 */

export interface ItemCarrinho {
  product_id: string
  qtd: number
}

export interface ProdutoDB {
  id: string
  nome: string
  preco: number
  estoque: number | null // null = ilimitado
  ativo: boolean
}

export interface ItemPedido {
  product_id: string
  nome: string
  qtd: number
  preco: number
}

export interface ResultadoPedido {
  ok: boolean
  erro?: string
  itens?: ItemPedido[]
  total?: number
}

/**
 * Valida o carrinho contra o catálogo real (preço NUNCA vem do cliente)
 * e calcula o total. Recusa produto inativo, qtd inválida ou estoque insuficiente.
 */
export function montarPedido(carrinho: ItemCarrinho[], catalogo: ProdutoDB[]): ResultadoPedido {
  if (!Array.isArray(carrinho) || carrinho.length === 0) {
    return { ok: false, erro: 'Carrinho vazio' }
  }
  if (carrinho.length > 50) return { ok: false, erro: 'Carrinho grande demais' }

  const porId = new Map(catalogo.map((p) => [p.id, p]))
  const itens: ItemPedido[] = []
  let total = 0

  for (const item of carrinho) {
    const qtd = Math.floor(Number(item.qtd))
    if (!Number.isFinite(qtd) || qtd < 1 || qtd > 999) {
      return { ok: false, erro: 'Quantidade inválida' }
    }
    const p = porId.get(item.product_id)
    if (!p || !p.ativo) return { ok: false, erro: 'Produto indisponível' }
    if (p.estoque !== null && qtd > p.estoque) {
      return { ok: false, erro: `Estoque insuficiente de ${p.nome}` }
    }
    itens.push({ product_id: p.id, nome: p.nome, qtd, preco: Number(p.preco) })
    total += Number(p.preco) * qtd
  }

  return { ok: true, itens, total: Math.round(total * 100) / 100 }
}

/** Texto do pedido pro WhatsApp do dono (checkout via conversa) */
export function resumoPedidoWhatsApp(
  boxNome: string,
  clienteNome: string,
  itens: ItemPedido[],
  total: number,
  entregaData?: string | null
): string {
  const linhas = itens.map((i) => `• ${i.qtd}x ${i.nome} — R$ ${(i.preco * i.qtd).toFixed(2)}`)
  return [
    `Olá, ${boxNome}! Acabei de fazer um pedido pelo link da loja 🛍`,
    '',
    `*Pedido de ${clienteNome}:*`,
    ...linhas,
    '',
    `*Total: R$ ${total.toFixed(2)}*`,
    entregaData ? `📅 Entrega desejada: ${entregaData.split('-').reverse().join('/')}` : null,
  ].filter((l) => l !== null).join('\n')
}
