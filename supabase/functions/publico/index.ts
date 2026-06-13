/**
 * supabase/functions/publico/index.ts
 *
 * Operações PÚBLICAS (sem login) usadas pelas páginas:
 *  - /form/:slug          → GET  ?action=box&slug=...      | POST {action:'lead-publico', ...}
 *  - /indicacao/:token    → GET  ?action=indicacao&token=  | POST {action:'lead-indicacao', ...}
 *
 * Existe porque o RLS real (migration 010) fecha o acesso anon ao banco.
 * Roda com service role e faz as validações que o RLS não pode fazer.
 *
 * Deploy: npx supabase functions deploy publico --project-ref favryvjzvfdqlftkyhpi --no-verify-jwt
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { gerarSlots, slotDisponivel } from '../_shared/agenda.ts'
import { montarPedido, resumoPedidoWhatsApp } from '../_shared/loja.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// ─── Validações ───────────────────────────────────────────────────────────────
function validarLead(p: Record<string, unknown>): string | null {
  const nome = String(p.nome ?? '').trim()
  const wa = String(p.whatsapp ?? '').replace(/\D/g, '')
  if (nome.length < 2) return 'Nome inválido'
  if (wa.length < 10 || wa.length > 13) return 'WhatsApp inválido'
  if (!['agora', 'em_breve', 'comparando'].includes(String(p.momento_compra))) return 'Momento de compra inválido'
  if (p.lgpd_consent !== true) return 'Consentimento LGPD é obrigatório'
  return null
}

function toE164(whatsapp: string): string {
  const nums = whatsapp.replace(/\D/g, '')
  return `+55${nums.slice(nums.startsWith('55') ? 2 : 0)}`
}

const sanitizeInteresse = (v: unknown): string[] =>
  Array.isArray(v) ? v.slice(0, 10).map((i) => String(i).toLowerCase().slice(0, 40)) : []

// ─── GET box público por slug ─────────────────────────────────────────────────
async function getBoxPublico(slug: string) {
  const { data } = await supabase
    .from('boxes')
    .select('id, nome, slug, dono_nome, ativo')
    .eq('slug', slug)
    .single()
  if (!data || !data.ativo) return json({ error: 'Box não encontrado' }, 404)
  // id NÃO é exposto — só o necessário pra exibição
  return json({ nome: data.nome, slug: data.slug, dono_nome: data.dono_nome })
}

// ─── POST lead do formulário público ──────────────────────────────────────────
async function criarLeadPublico(p: Record<string, unknown>) {
  const erro = validarLead(p)
  if (erro) return json({ error: erro }, 400)

  const { data: box } = await supabase
    .from('boxes')
    .select('id, nome, ativo')
    .eq('slug', String(p.slug))
    .single()
  if (!box || !box.ativo) return json({ error: 'Box não encontrado' }, 404)

  const nome = String(p.nome).trim()
  const waE164 = toE164(String(p.whatsapp))

  const { error: errLead } = await supabase.from('leads').insert({
    box_id: box.id,
    nome,
    whatsapp: waE164,
    email: String(p.email ?? '').trim() || null,
    origem: 'landing_page',
    status: 'novo',
    momento_compra: String(p.momento_compra),
    interesse: sanitizeInteresse(p.interesse),
    score: 60,
    lgpd_consent: true,
    lgpd_consent_at: new Date().toISOString(),
    opt_out: false,
    utm_source: String(p.utm_source ?? '').slice(0, 80) || null,
    utm_campaign: String(p.utm_campaign ?? '').slice(0, 80) || null,
    notas: '',
    proximo_followup_at: new Date(Date.now() + 3600000).toISOString(),
  })
  if (errLead) return json({ error: 'Erro ao cadastrar' }, 500)

  await supabase.from('notificacoes').insert({
    box_id: box.id,
    tipo: 'lead_novo',
    titulo: 'Novo lead pelo formulário',
    corpo: `${nome} se cadastrou pelo link público do seu box!`,
    payload: { canal: 'landing_page', nome, whatsapp: waE164 },
    lida: false,
  })

  return json({ ok: true })
}

// ─── GET indicação por token ──────────────────────────────────────────────────
async function getIndicacao(token: string) {
  const { data: ind } = await supabase
    .from('indicacoes')
    .select('id, status, expira_em, boxes:box_id (nome, slug, ativo), aluno_indicador:aluno_indicador_id (nome)')
    .eq('token', token.toUpperCase())
    .single()

  if (!ind) return json({ error: 'Indicação não encontrada' }, 404)
  const boxes = ind.boxes as Record<string, unknown> | null
  if (
    ind.status === 'expirado' ||
    new Date(ind.expira_em as string) < new Date() ||
    !boxes?.ativo
  ) {
    return json({ error: 'Indicação expirada' }, 410)
  }

  return json({
    box: { nome: boxes.nome, slug: boxes.slug },
    indicador_nome: (ind.aluno_indicador as Record<string, unknown>)?.nome ?? 'um aluno',
    status: ind.status,
  })
}

// ─── POST lead vindo de indicação ─────────────────────────────────────────────
async function criarLeadIndicacao(p: Record<string, unknown>) {
  const erro = validarLead(p)
  if (erro) return json({ error: erro }, 400)

  const { data: ind } = await supabase
    .from('indicacoes')
    .select('id, status, expira_em, box_id, boxes:box_id (id, nome, ativo), aluno_indicador:aluno_indicador_id (nome)')
    .eq('token', String(p.token ?? '').toUpperCase())
    .single()

  const boxes = ind?.boxes as Record<string, unknown> | null
  if (!ind || ind.status === 'expirado' || new Date(ind.expira_em as string) < new Date() || !boxes?.ativo) {
    return json({ error: 'Indicação inválida ou expirada' }, 410)
  }

  const nome = String(p.nome).trim()
  const waE164 = toE164(String(p.whatsapp))
  const momento = String(p.momento_compra)

  // 1. Lead
  const { data: novoLead, error: errLead } = await supabase
    .from('leads')
    .insert({
      box_id: ind.box_id,
      nome,
      whatsapp: waE164,
      email: String(p.email ?? '').trim() || null,
      origem: 'indicacao',
      status: 'novo',
      momento_compra: momento,
      interesse: sanitizeInteresse(p.interesse),
      score: 75,
      lgpd_consent: true,
      lgpd_consent_at: new Date().toISOString(),
      opt_out: false,
      utm_source: 'indicacao',
    })
    .select()
    .single()
  if (errLead || !novoLead) return json({ error: 'Erro ao cadastrar' }, 500)

  // 2. Sequência de follow-up
  const horasStep: Record<string, number> = { agora: 1, em_breve: 3, comparando: 24 }
  await supabase.from('follow_up_sequencias').insert({
    box_id: ind.box_id,
    lead_id: novoLead.id,
    momento_compra: momento || 'agora',
    step_atual: 1,
    proximo_disparo_at: new Date(Date.now() + (horasStep[momento] ?? 1) * 3600000).toISOString(),
    status: 'ativo',
  })

  // 3. Boas-vindas na fila
  await supabase.from('disparo_fila').insert({
    box_id: ind.box_id,
    destinatario_tipo: 'lead',
    destinatario_id: novoLead.id,
    canal: 'whatsapp',
    template_key: 'lead_boas_vindas',
    payload: { nome, box_nome: boxes.nome },
    agendado_para: new Date().toISOString(),
    status: 'pendente',
  })

  // 4. Vincula lead à indicação
  await supabase.from('indicacoes').update({ lead_indicado_id: novoLead.id }).eq('id', ind.id)

  // 5. Notificação pro dono
  const nomeIndicador = (ind.aluno_indicador as Record<string, unknown>)?.nome ?? 'um aluno'
  await supabase.from('notificacoes').insert({
    box_id: ind.box_id,
    tipo: 'lead_novo',
    titulo: '🎁 Novo lead por indicação!',
    corpo: `${nome} foi indicado por ${nomeIndicador} e se cadastrou!`,
    payload: { canal: 'indicacao', indicador: nomeIndicador, lead_nome: nome, token: p.token },
    lida: false,
  })

  return json({ ok: true })
}

// ═══ BLOCO AGENDA (Fase 2) ═══════════════════════════════════════════════════

async function boxPorSlug(slug: string) {
  const { data } = await supabase
    .from('boxes')
    .select('id, nome, slug, ativo')
    .eq('slug', slug)
    .single()
  return data && data.ativo ? data : null
}

// GET ?action=agenda&slug= → serviços ativos do box
async function getAgendaServicos(slug: string) {
  const box = await boxPorSlug(slug)
  if (!box) return json({ error: 'Box não encontrado' }, 404)

  const { data: servicos } = await supabase
    .from('services')
    .select('id, nome, descricao, duracao_min, preco, capacidade')
    .eq('box_id', box.id)
    .eq('ativo', true)
    .order('nome')

  return json({ box: { nome: box.nome, slug: box.slug }, servicos: servicos ?? [] })
}

// GET ?action=slots&slug=&service_id=&data=YYYY-MM-DD
async function getSlots(slug: string, serviceId: string, dataISO: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataISO)) return json({ error: 'Data inválida' }, 400)
  const box = await boxPorSlug(slug)
  if (!box) return json({ error: 'Box não encontrado' }, 404)

  const { data: servico } = await supabase
    .from('services')
    .select('id, duracao_min, capacidade, ativo')
    .eq('id', serviceId)
    .eq('box_id', box.id)
    .single()
  if (!servico || !servico.ativo) return json({ error: 'Serviço não encontrado' }, 404)

  const [{ data: disp }, { data: ags }] = await Promise.all([
    supabase.from('availability').select('service_id, dia_semana, hora_inicio, hora_fim, vagas')
      .eq('service_id', serviceId),
    supabase.from('appointments').select('service_id, data_hora, status')
      .eq('service_id', serviceId)
      .gte('data_hora', `${dataISO}T00:00:00Z`)
      .lte('data_hora', `${dataISO}T23:59:59Z`),
  ])

  return json({ slots: gerarSlots(servico, disp ?? [], ags ?? [], dataISO) })
}

// POST {action:'agendar', slug, service_id, data_hora, nome, whatsapp, email, lgpd_consent}
async function agendar(p: Record<string, unknown>) {
  const nome = String(p.nome ?? '').trim()
  const wa = String(p.whatsapp ?? '').replace(/\D/g, '')
  if (nome.length < 2) return json({ error: 'Nome inválido' }, 400)
  if (wa.length < 10 || wa.length > 13) return json({ error: 'WhatsApp inválido' }, 400)
  if (p.lgpd_consent !== true) return json({ error: 'Consentimento LGPD é obrigatório' }, 400)

  const box = await boxPorSlug(String(p.slug))
  if (!box) return json({ error: 'Box não encontrado' }, 404)

  const { data: servico } = await supabase
    .from('services')
    .select('id, nome, duracao_min, capacidade, ativo')
    .eq('id', String(p.service_id))
    .eq('box_id', box.id)
    .single()
  if (!servico || !servico.ativo) return json({ error: 'Serviço não encontrado' }, 404)

  const dataHora = String(p.data_hora)
  const dia = dataHora.slice(0, 10)
  const [{ data: disp }, { data: ags }] = await Promise.all([
    supabase.from('availability').select('service_id, dia_semana, hora_inicio, hora_fim, vagas')
      .eq('service_id', servico.id),
    supabase.from('appointments').select('service_id, data_hora, status')
      .eq('service_id', servico.id)
      .gte('data_hora', `${dia}T00:00:00Z`).lte('data_hora', `${dia}T23:59:59Z`),
  ])

  if (!slotDisponivel(servico, disp ?? [], ags ?? [], dataHora)) {
    return json({ error: 'Horário indisponível — escolha outro', lotado: true }, 409)
  }

  const waE164 = toE164(String(p.whatsapp))

  // Lead: reutiliza pelo WhatsApp ou cria novo já como "agendado"
  let leadId: string | null = null
  const { data: leadExistente } = await supabase
    .from('leads')
    .select('id, status')
    .eq('box_id', box.id)
    .eq('whatsapp', waE164)
    .limit(1)
    .maybeSingle()

  if (leadExistente) {
    leadId = leadExistente.id
    if (!['convertido', 'opt_out'].includes(leadExistente.status)) {
      await supabase.from('leads').update({ status: 'agendado' }).eq('id', leadId)
    }
  } else {
    const { data: novo } = await supabase
      .from('leads')
      .insert({
        box_id: box.id,
        nome,
        whatsapp: waE164,
        email: String(p.email ?? '').trim() || null,
        origem: 'landing_page',
        status: 'agendado',
        momento_compra: 'agora',
        score: 80,
        lgpd_consent: true,
        lgpd_consent_at: new Date().toISOString(),
        opt_out: false,
        utm_source: 'agendamento',
      })
      .select('id')
      .single()
    leadId = novo?.id ?? null
  }

  const { data: appointment, error: errApt } = await supabase
    .from('appointments')
    .insert({
      box_id: box.id,
      service_id: servico.id,
      lead_id: leadId,
      nome,
      whatsapp: waE164,
      email: String(p.email ?? '').trim() || null,
      data_hora: new Date(dataHora).toISOString(),
      status: 'agendado',
      origem: 'publico',
    })
    .select('id, data_hora')
    .single()
  if (errApt || !appointment) return json({ error: 'Erro ao agendar' }, 500)

  // Confirmação + lembretes na fila (processar-fila usa template do banco)
  const dt = new Date(appointment.data_hora)
  const brt = new Date(dt.getTime() - 3 * 3600000)
  const payload = {
    nome,
    box_nome: box.nome,
    servico: servico.nome,
    data: `${String(brt.getUTCDate()).padStart(2, '0')}/${String(brt.getUTCMonth() + 1).padStart(2, '0')}`,
    hora: `${String(brt.getUTCHours()).padStart(2, '0')}:${String(brt.getUTCMinutes()).padStart(2, '0')}`,
  }
  const fila = [
    { key: 'agendamento_confirmacao', quando: new Date() },
    { key: 'agendamento_lembrete_24h', quando: new Date(dt.getTime() - 24 * 3600000) },
    { key: 'agendamento_lembrete_2h', quando: new Date(dt.getTime() - 2 * 3600000) },
  ].filter((f) => f.quando <= dt) // nunca depois do horário

  if (leadId) {
    await supabase.from('disparo_fila').insert(
      fila.filter((f) => f.quando >= new Date(Date.now() - 60000)).map((f) => ({
        box_id: box.id,
        destinatario_tipo: 'lead',
        destinatario_id: leadId,
        canal: 'whatsapp',
        template_key: f.key,
        payload,
        agendado_para: f.quando.toISOString(),
        status: 'pendente',
      }))
    )
  }

  await supabase.from('notificacoes').insert({
    box_id: box.id,
    tipo: 'lead_novo',
    titulo: '📅 Novo agendamento!',
    corpo: `${nome} agendou ${servico.nome} para ${payload.data} às ${payload.hora}.`,
    payload: { canal: 'agendamento', appointment_id: appointment.id },
    lida: false,
  })

  return json({ ok: true, data: payload.data, hora: payload.hora, servico: servico.nome })
}

// POST {action:'espera', slug, service_id, nome, whatsapp, data_desejada}
async function entrarEspera(p: Record<string, unknown>) {
  const nome = String(p.nome ?? '').trim()
  const wa = String(p.whatsapp ?? '').replace(/\D/g, '')
  if (nome.length < 2 || wa.length < 10) return json({ error: 'Dados inválidos' }, 400)

  const box = await boxPorSlug(String(p.slug))
  if (!box) return json({ error: 'Box não encontrado' }, 404)

  await supabase.from('waitlist').insert({
    box_id: box.id,
    service_id: String(p.service_id),
    nome,
    whatsapp: toE164(String(p.whatsapp)),
    data_desejada: String(p.data_desejada ?? '').slice(0, 10) || null,
  })
  return json({ ok: true })
}

// ═══ BLOCO LOJA (Fase 5) ═══════════════════════════════════════════════════════

// GET ?action=loja&slug= → catálogo público
async function getLoja(slug: string) {
  const { data: box } = await supabase
    .from('boxes')
    .select('id, nome, slug, dono_whatsapp, ativo')
    .eq('slug', slug)
    .single()
  if (!box || !box.ativo) return json({ error: 'Loja não encontrada' }, 404)

  const { data: produtos } = await supabase
    .from('products')
    .select('id, nome, descricao, fotos, preco, estoque, categoria')
    .eq('box_id', box.id)
    .eq('ativo', true)
    .order('categoria')
    .order('nome')

  // Esconde estoque exato; só sinaliza "últimas unidades"
  const catalogo = (produtos ?? []).map((p) => ({
    ...p,
    estoque: undefined,
    ultimas_unidades: p.estoque !== null && p.estoque <= 3 && p.estoque > 0,
    esgotado: p.estoque !== null && p.estoque <= 0,
  }))

  return json({ box: { nome: box.nome, slug: box.slug }, produtos: catalogo })
}

// POST {action:'pedido', slug, carrinho:[{product_id,qtd}], nome, whatsapp, entrega_data?, notas?}
async function criarPedido(p: Record<string, unknown>) {
  const nome = String(p.nome ?? '').trim()
  const wa = String(p.whatsapp ?? '').replace(/\D/g, '')
  if (nome.length < 2) return json({ error: 'Nome inválido' }, 400)
  if (wa.length < 10 || wa.length > 13) return json({ error: 'WhatsApp inválido' }, 400)

  const { data: box } = await supabase
    .from('boxes')
    .select('id, nome, slug, dono_whatsapp, ativo')
    .eq('slug', String(p.slug))
    .single()
  if (!box || !box.ativo) return json({ error: 'Loja não encontrada' }, 404)

  const carrinho = (Array.isArray(p.carrinho) ? p.carrinho : []) as { product_id: string; qtd: number }[]
  const ids = carrinho.map((c) => String(c.product_id))
  const { data: catalogo } = await supabase
    .from('products')
    .select('id, nome, preco, estoque, ativo')
    .eq('box_id', box.id)
    .in('id', ids)

  const pedido = montarPedido(carrinho, catalogo ?? [])
  if (!pedido.ok) return json({ error: pedido.erro }, 400)

  const entregaData = /^\d{4}-\d{2}-\d{2}$/.test(String(p.entrega_data)) ? String(p.entrega_data) : null

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      box_id: box.id,
      cliente_nome: nome,
      cliente_whatsapp: toE164(String(p.whatsapp)),
      itens: pedido.itens,
      total: pedido.total,
      status: 'novo',
      entrega_data: entregaData,
      notas: String(p.notas ?? '').slice(0, 500) || null,
    })
    .select('id')
    .single()
  if (error || !order) return json({ error: 'Erro ao registrar pedido' }, 500)

  // Baixa de estoque (apenas produtos com estoque controlado)
  for (const item of pedido.itens!) {
    const prod = (catalogo ?? []).find((c) => c.id === item.product_id)
    if (prod && prod.estoque !== null) {
      await supabase.from('products')
        .update({ estoque: prod.estoque - item.qtd })
        .eq('id', item.product_id)
    }
  }

  await supabase.from('notificacoes').insert({
    box_id: box.id,
    tipo: 'lead_novo',
    titulo: '🛍 Novo pedido na loja!',
    corpo: `${nome} fez um pedido de R$ ${pedido.total!.toFixed(2)} (${pedido.itens!.length} item(ns)).`,
    payload: { canal: 'loja', order_id: order.id, total: pedido.total },
    lida: false,
  })

  // Checkout via WhatsApp: o cliente é levado pra conversa com o número do box
  const texto = resumoPedidoWhatsApp(box.nome, nome, pedido.itens!, pedido.total!, entregaData)
  const numeroDono = String(box.dono_whatsapp ?? '').replace(/\D/g, '')
  const linkWhatsApp = `https://wa.me/${numeroDono}?text=${encodeURIComponent(texto)}`

  return json({ ok: true, order_id: order.id, total: pedido.total, link_whatsapp: linkWhatsApp })
}

// ─── Router ───────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const action = url.searchParams.get('action')
      if (action === 'box') return await getBoxPublico(url.searchParams.get('slug') ?? '')
      if (action === 'indicacao') return await getIndicacao(url.searchParams.get('token') ?? '')
      if (action === 'agenda') return await getAgendaServicos(url.searchParams.get('slug') ?? '')
      if (action === 'loja') return await getLoja(url.searchParams.get('slug') ?? '')
      if (action === 'slots') {
        return await getSlots(
          url.searchParams.get('slug') ?? '',
          url.searchParams.get('service_id') ?? '',
          url.searchParams.get('data') ?? ''
        )
      }
      return json({ error: 'Ação desconhecida' }, 400)
    }

    if (req.method === 'POST') {
      const body = await req.json()
      if (body.action === 'lead-publico') return await criarLeadPublico(body)
      if (body.action === 'lead-indicacao') return await criarLeadIndicacao(body)
      if (body.action === 'agendar') return await agendar(body)
      if (body.action === 'espera') return await entrarEspera(body)
      if (body.action === 'pedido') return await criarPedido(body)
      return json({ error: 'Ação desconhecida' }, 400)
    }

    return json({ error: 'Método não suportado' }, 405)
  } catch (err) {
    console.error(err)
    return json({ error: 'Erro interno' }, 500)
  }
})
