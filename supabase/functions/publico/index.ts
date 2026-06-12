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

// ─── Router ───────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const action = url.searchParams.get('action')
      if (action === 'box') return await getBoxPublico(url.searchParams.get('slug') ?? '')
      if (action === 'indicacao') return await getIndicacao(url.searchParams.get('token') ?? '')
      return json({ error: 'Ação desconhecida' }, 400)
    }

    if (req.method === 'POST') {
      const body = await req.json()
      if (body.action === 'lead-publico') return await criarLeadPublico(body)
      if (body.action === 'lead-indicacao') return await criarLeadIndicacao(body)
      return json({ error: 'Ação desconhecida' }, 400)
    }

    return json({ error: 'Método não suportado' }, 405)
  } catch (err) {
    console.error(err)
    return json({ error: 'Erro interno' }, 500)
  }
})
