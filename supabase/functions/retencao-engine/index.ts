/**
 * supabase/functions/retencao-engine/index.ts
 * Motor de Retenção Genérico (Fase 6): "X dias sem evento Y → mensagem Z".
 *
 * MODO DRY-RUN POR PADRÃO: lista o que FARIA sem enviar nada.
 * Só envia de verdade com POST {"dry_run": false}.
 * O cron antigo (retencao-alunos) continua ativo até a paridade ser
 * comprovada — aí este assume o horário das 10h BRT (regra do plano).
 *
 * Tipos de regra:
 *  - faltas:     alunos ativos com faltas_consecutivas >= parametro
 *  - vencimento: alunos ativos com data_vencimento em exatamente N dias
 *  - recompra:   clientes (orders) sem comprar há >= N dias
 *  - retorno:    clientes (appointments compareceu) sem voltar há >= N dias
 *
 * Anti-spam: não repete a mesma regra pro mesmo destinatário em 7 dias.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

interface Acao {
  regra: string
  template_key: string
  destinatario_tipo: 'lead' | 'aluno'
  destinatario_id: string
  nome: string
  payload: Record<string, unknown>
  notifica_dono: boolean
}

const DIAS_ANTI_SPAM = 7

async function jaEnviado(boxId: string, templateKey: string, destinatarioId: string): Promise<boolean> {
  const desde = new Date(Date.now() - DIAS_ANTI_SPAM * 86400000).toISOString()
  const { count } = await supabase
    .from('disparo_fila')
    .select('id', { count: 'exact', head: true })
    .eq('box_id', boxId)
    .eq('template_key', templateKey)
    .eq('destinatario_id', destinatarioId)
    .gte('created_at', desde)
  return (count ?? 0) > 0
}

// ─── faltas: alunos com N+ faltas consecutivas ────────────────────────────────
async function regraFaltas(boxId: string, boxNome: string, regra: Record<string, unknown>): Promise<Acao[]> {
  const { data: alunos } = await supabase
    .from('alunos')
    .select('id, nome, faltas_consecutivas, opt_out')
    .eq('box_id', boxId).eq('status', 'ativo')
    .gte('faltas_consecutivas', regra.parametro as number)
  return (alunos ?? [])
    .filter((a) => !a.opt_out)
    .map((a) => ({
      regra: regra.nome as string,
      template_key: regra.template_key as string,
      destinatario_tipo: 'aluno',
      destinatario_id: a.id,
      nome: a.nome,
      payload: { nome: a.nome, box_nome: boxNome, faltas: a.faltas_consecutivas },
      notifica_dono: !!regra.notifica_dono,
    }))
}

// ─── vencimento: plano vence em exatamente N dias ─────────────────────────────
async function regraVencimento(boxId: string, boxNome: string, regra: Record<string, unknown>): Promise<Acao[]> {
  const alvo = new Date(Date.now() + (regra.parametro as number) * 86400000)
  const alvoISO = alvo.toISOString().slice(0, 10)
  const { data: alunos } = await supabase
    .from('alunos')
    .select('id, nome, data_vencimento, opt_out')
    .eq('box_id', boxId).eq('status', 'ativo')
    .eq('data_vencimento', alvoISO)
  return (alunos ?? [])
    .filter((a) => !a.opt_out)
    .map((a) => ({
      regra: regra.nome as string,
      template_key: regra.template_key as string,
      destinatario_tipo: 'aluno',
      destinatario_id: a.id,
      nome: a.nome,
      payload: {
        nome: a.nome, box_nome: boxNome,
        dias_vencimento: regra.parametro,
        data_vencimento: alvoISO.split('-').reverse().slice(0, 2).join('/'),
      },
      notifica_dono: !!regra.notifica_dono,
    }))
}

// ─── recompra: último pedido há N+ dias (varejo) ──────────────────────────────
async function regraRecompra(boxId: string, boxNome: string, regra: Record<string, unknown>): Promise<Acao[]> {
  const { data: pedidos } = await supabase
    .from('orders')
    .select('cliente_nome, cliente_whatsapp, created_at')
    .eq('box_id', boxId)
    .neq('status', 'cancelado')
    .order('created_at', { ascending: false })
  if (!pedidos?.length) return []

  // último pedido por cliente (whatsapp)
  const ultimo = new Map<string, { nome: string; quando: Date }>()
  for (const p of pedidos) {
    if (!ultimo.has(p.cliente_whatsapp)) {
      ultimo.set(p.cliente_whatsapp, { nome: p.cliente_nome, quando: new Date(p.created_at) })
    }
  }

  const corte = Date.now() - (regra.parametro as number) * 86400000
  const acoes: Acao[] = []
  for (const [whatsapp, info] of ultimo) {
    if (info.quando.getTime() > corte) continue
    // precisa de um lead correspondente pra entrar na fila (LGPD)
    const { data: lead } = await supabase
      .from('leads')
      .select('id, opt_out, lgpd_consent')
      .eq('box_id', boxId).eq('whatsapp', whatsapp)
      .limit(1).maybeSingle()
    if (!lead || lead.opt_out || !lead.lgpd_consent) continue
    acoes.push({
      regra: regra.nome as string,
      template_key: regra.template_key as string,
      destinatario_tipo: 'lead',
      destinatario_id: lead.id,
      nome: info.nome,
      payload: { nome: info.nome, box_nome: boxNome },
      notifica_dono: !!regra.notifica_dono,
    })
  }
  return acoes
}

// ─── retorno: último atendimento (compareceu) há N+ dias (serviços) ───────────
async function regraRetorno(boxId: string, boxNome: string, regra: Record<string, unknown>): Promise<Acao[]> {
  const { data: atendimentos } = await supabase
    .from('appointments')
    .select('lead_id, nome, whatsapp, data_hora')
    .eq('box_id', boxId).eq('status', 'compareceu')
    .order('data_hora', { ascending: false })
  if (!atendimentos?.length) return []

  const ultimo = new Map<string, { lead_id: string | null; nome: string; quando: Date }>()
  for (const a of atendimentos) {
    if (!ultimo.has(a.whatsapp)) {
      ultimo.set(a.whatsapp, { lead_id: a.lead_id, nome: a.nome, quando: new Date(a.data_hora) })
    }
  }

  const dias = regra.parametro as number
  const corte = Date.now() - dias * 86400000
  const acoes: Acao[] = []
  for (const info of ultimo.values()) {
    if (info.quando.getTime() > corte || !info.lead_id) continue
    acoes.push({
      regra: regra.nome as string,
      template_key: regra.template_key as string,
      destinatario_tipo: 'lead',
      destinatario_id: info.lead_id,
      nome: info.nome,
      payload: { nome: info.nome, box_nome: boxNome, dias },
      notifica_dono: !!regra.notifica_dono,
    })
  }
  return acoes
}

const EXECUTORES: Record<string, typeof regraFaltas> = {
  faltas: regraFaltas,
  vencimento: regraVencimento,
  recompra: regraRecompra,
  retorno: regraRetorno,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  let dryRun = true
  try {
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      if (body.dry_run === false) dryRun = false
    }

    const { data: boxes } = await supabase
      .from('boxes').select('id, nome, slug').eq('ativo', true)

    const resultado: Record<string, unknown>[] = []
    let enfileiradas = 0

    for (const box of boxes ?? []) {
      const { data: regras } = await supabase
        .from('retention_rules').select('*')
        .eq('box_id', box.id).eq('ativo', true)

      for (const regra of regras ?? []) {
        const executor = EXECUTORES[regra.tipo as string]
        if (!executor) continue
        const acoes = await executor(box.id, box.nome, regra)

        for (const acao of acoes) {
          if (await jaEnviado(box.id, acao.template_key, acao.destinatario_id)) continue

          resultado.push({ box: box.slug, ...acao, payload: undefined })
          if (!dryRun) {
            await supabase.from('disparo_fila').insert({
              box_id: box.id,
              destinatario_tipo: acao.destinatario_tipo,
              destinatario_id: acao.destinatario_id,
              canal: 'whatsapp',
              template_key: acao.template_key,
              payload: acao.payload,
              agendado_para: new Date().toISOString(),
              status: 'pendente',
            })
            if (acao.notifica_dono) {
              await supabase.from('notificacoes').insert({
                box_id: box.id,
                tipo: 'retencao',
                titulo: `⚠️ Retenção: ${acao.regra}`,
                corpo: `${acao.nome} entrou na regra "${acao.regra}". Mensagem automática enviada.`,
                payload: { regra: acao.regra },
                lida: false,
              })
            }
            enfileiradas++
          }
        }
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      dry_run: dryRun,
      total_acoes: resultado.length,
      enfileiradas,
      acoes: resultado,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
