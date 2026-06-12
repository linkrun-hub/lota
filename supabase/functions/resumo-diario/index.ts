/**
 * supabase/functions/resumo-diario/index.ts
 * VERSÃO STANDALONE — sem imports de _shared (compatível com Supabase Dashboard)
 *
 * Envia resumo do dia para o dono de cada box às 21h BRT.
 * Cron (cron-job.org): 0 0 * * * (meia-noite UTC = 21h BRT)
 * URL: https://favryvjzvfdqlftkyhpi.supabase.co/functions/v1/resumo-diario
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ────────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Template do resumo ───────────────────────────────────────────────────────
function resumoTemplate(vars: Record<string, unknown>): string {
  return `📊 *Resumo do dia — ${vars.box_nome}*
*${vars.data}*

🔥 Novos leads: *${vars.novos_leads}*
✅ Conversões: *${vars.conversoes}*
⚠️ Alunos em risco: *${vars.alunos_risco}*
💰 Inadimplentes: *${vars.inadimplentes}*
📅 Renovações nos próx. 7 dias: *${vars.renovacoes}*

Bom trabalho hoje! 💪
_LOTA — Do WhatsApp à matrícula_`
}

// ─── Env vars ─────────────────────────────────────────────────────────────────
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EVOLUTION_API_URL    = Deno.env.get('EVOLUTION_API_URL')!
const EVOLUTION_API_KEY    = Deno.env.get('EVOLUTION_API_KEY')!

// ─── Servidor ─────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const resultados: Record<string, unknown>[] = []

  try {
    const { data: boxes, error } = await supabase
      .from('boxes')
      .select('*')
      .eq('ativo', true)

    if (error) throw error
    if (!boxes?.length) {
      return new Response(JSON.stringify({ ok: true, msg: 'Nenhum box ativo' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const hoje = new Date()
    // BRT = UTC-3
    const brtOffset = 3 * 60 * 60 * 1000
    const inicioDiaUtc = new Date(hoje)
    inicioDiaUtc.setUTCHours(3, 0, 0, 0) // 03:00 UTC = 00:00 BRT

    const dataFormatada = hoje.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
    const em7Dias = new Date(hoje.getTime() + 7 * 86400000).toISOString().split('T')[0]
    const hojeStr = hoje.toISOString().split('T')[0]

    for (const box of boxes) {
      try {
        const [
          { count: novosLeads },
          { count: conversoes },
          { count: alunosRisco },
          { count: inadimplentes },
          { count: renovacoes },
        ] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true })
            .eq('box_id', box.id).gte('created_at', inicioDiaUtc.toISOString()),
          supabase.from('leads').select('id', { count: 'exact', head: true })
            .eq('box_id', box.id).eq('status', 'convertido').gte('updated_at', inicioDiaUtc.toISOString()),
          supabase.from('alunos').select('id', { count: 'exact', head: true })
            .eq('box_id', box.id).eq('status', 'ativo').gte('faltas_consecutivas', 3),
          supabase.from('alunos').select('id', { count: 'exact', head: true })
            .eq('box_id', box.id).eq('status', 'inadimplente'),
          supabase.from('alunos').select('id', { count: 'exact', head: true })
            .eq('box_id', box.id).eq('status', 'ativo')
            .gte('data_vencimento', hojeStr).lte('data_vencimento', em7Dias),
        ])

        const texto = resumoTemplate({
          box_nome:     box.nome,
          data:         dataFormatada,
          novos_leads:  novosLeads ?? 0,
          conversoes:   conversoes ?? 0,
          alunos_risco: alunosRisco ?? 0,
          inadimplentes: inadimplentes ?? 0,
          renovacoes:   renovacoes ?? 0,
        })

        // Envia WhatsApp para o dono
        if (box.dono_whatsapp) {
          await enviarWhatsApp(box.slug, box.dono_whatsapp, texto)
        }

        // Registra notificação no painel
        await supabase.from('notificacoes').insert({
          box_id:  box.id,
          tipo:    'resumo_diario',
          titulo:  `📊 Resumo do dia — ${dataFormatada}`,
          corpo:   texto,
          payload: { novosLeads, conversoes, alunosRisco, inadimplentes, renovacoes },
          lida:    false,
        })

        resultados.push({ box: box.slug, ok: true, novosLeads, conversoes, alunosRisco, inadimplentes, renovacoes })
        console.log(`[resumo-diario] ✅ ${box.slug}`)

        await new Promise((r) => setTimeout(r, 2000))

      } catch (err) {
        console.error(`[resumo-diario] ❌ ${box.slug}:`, err)
        resultados.push({ box: box.slug, ok: false, error: String(err) })
      }
    }

    return new Response(JSON.stringify({ ok: true, resultados }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ─── Envia via Evolution API ──────────────────────────────────────────────────
async function enviarWhatsApp(slug: string, numero: string, texto: string) {
  const to = numero.replace(/\D/g, '')
  const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
    body: JSON.stringify({ number: to, text: texto }),
  })
  if (!res.ok) throw new Error(`Evolution API ${res.status}: ${await res.text()}`)
}
