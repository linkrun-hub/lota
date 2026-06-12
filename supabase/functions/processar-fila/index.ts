/**
 * supabase/functions/processar-fila/index.ts
 * VERSÃO STANDALONE — sem imports de _shared (compatível com Supabase Dashboard)
 *
 * Processa a fila de disparos e envia mensagens via Evolution API.
 * Cron: a cada 5 minutos → POST https://favryvjzvfdqlftkyhpi.supabase.co/functions/v1/processar-fila
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ────────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Templates ───────────────────────────────────────────────────────────────
function fill(tmpl: string, v: Record<string, unknown>): string {
  return tmpl.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? `{${k}}`))
}

const TEMPLATES: Record<string, (v: Record<string, unknown>) => string> = {
  lead_boas_vindas:     (v) => fill(`Oi {nome}! 😊\n\nQue bom que entrou em contato com o *{box_nome}*! 💪\n\nMe conta: você está buscando começar do zero ou tem algum objetivo específico?\n\nAssim consigo te indicar o melhor plano! 🏋️`, v),
  followup_agora_1:     (v) => fill(`{nome}, oi! 👋\n\nAinda temos horários disponíveis essa semana no *{box_nome}*!\n\nQual seria o melhor horário pra você vir conhecer? Sem compromisso! 😊`, v),
  followup_agora_2:     (v) => fill(`{nome}! 🔥\n\nVocê sabia que quem começa esse mês no *{box_nome}* garante condições especiais?\n\nManda uma mensagem que te conto os detalhes! 😉`, v),
  followup_agora_3:     (v) => fill(`{nome}, última chamada! ⏰\n\nTemos apenas algumas vagas essa semana no *{box_nome}*.\n\nPosso reservar uma pra você? É só confirmar! 💪`, v),
  followup_em_breve_1:  (v) => fill(`Oi {nome}! 😊\n\nEntendo que você quer se planejar. No *{box_nome}* temos opções pra todo tipo de agenda e orçamento.\n\nPosso te mandar informações sobre os planos?`, v),
  followup_em_breve_2:  (v) => fill(`{nome}, tudo bem? 👋\n\nSó passando pra lembrar que no *{box_nome}* temos aulas em vários horários.\n\nQuando você se sentir pronto(a), estamos aqui! 💪`, v),
  followup_em_breve_3:  (v) => fill(`{nome}! 🏋️\n\nPassei pra ver se consigo te ajudar com alguma dúvida sobre o *{box_nome}*.\n\nQualquer coisa é só chamar! 😊`, v),
  followup_comparando_1:(v) => fill(`{nome}, boa tarde! ☀️\n\nAinda avaliando opções de treino?\n\nO *{box_nome}* tem estrutura completa. Que tal uma aula experimental sem compromisso? 💪`, v),
  followup_comparando_2:(v) => fill(`Oi {nome}! 😊\n\nSempre que precisar tirar dúvidas sobre o *{box_nome}*, estou aqui!\n\nTemos planos flexíveis e você pode começar a qualquer momento. 🏋️`, v),
  followup_comparando_3:(v) => fill(`{nome}! 👋\n\nÚltima mensagem, prometo! 😄\n\nSe um dia decidir começar, o *{box_nome}* estará sempre de portas abertas! 💪\n\nBoa semana!`, v),
  retencao_3_faltas:    (v) => fill(`{nome}, sumiu! 😮\n\nFaz {faltas} dias que você não aparece no *{box_nome}*...\n\nEstá tudo bem? Nossa equipe está sentindo sua falta! 💪`, v),
  retencao_5_faltas:    (v) => fill(`{nome}! ⚠️\n\nEstamos preocupados! Faz {faltas} dias sem aparecer no *{box_nome}*.\n\nSe estiver passando por alguma dificuldade, vamos encontrar uma solução juntos. Não some! 🙏`, v),
  renovacao_7_dias:     (v) => fill(`Oi {nome}! 📅\n\nSeu plano no *{box_nome}* vence em *{dias_vencimento} dias* (dia {data_vencimento}).\n\nPara renovar é super simples — me chama aqui! 😊`, v),
  renovacao_1_dia:      (v) => fill(`{nome}! ⏰\n\nSeu plano vence *amanhã* ({data_vencimento}) no *{box_nome}*.\n\nRenova agora pra não perder o ritmo! Me chama! 💪`, v),
  renovacao_inadimplente:(v)=> fill(`Oi {nome}! 😊\n\nPassando pra lembrar que seu plano no *{box_nome}* está em aberto.\n\nPode contar com a gente pra encontrar uma solução! Me chama. 🙏`, v),
  alerta_lead_novo:     (v) => fill(`🔥 *Novo lead no {box_nome}!*\n\n👤 *{nome}*\n💬 "{mensagem_original}"\n\nAcesse o painel LOTA!\n_www.lota.app.br_`, v),
}

function getTemplateFallback(key: string, vars: Record<string, unknown>): string {
  return TEMPLATES[key]?.(vars) ?? `[Template "${key}" não encontrado]`
}

// Busca template personalizado do banco, com fallback para hardcoded
async function getTemplate(
  supabase: ReturnType<typeof createClient>,
  boxId: string,
  key: string,
  vars: Record<string, unknown>
): Promise<string> {
  try {
    const { data } = await supabase
      .from('templates')
      .select('texto, ativo')
      .eq('box_id', boxId)
      .eq('key', key)
      .single()

    if (data && data.ativo && data.texto) {
      // Usa template personalizado do banco
      return data.texto.replace(/\{(\w+)\}/g, (_: string, k: string) => String(vars[k] ?? `{${k}}`))
    }
  } catch {
    // Silently fallback
  }
  // Fallback para template hardcoded
  return getTemplateFallback(key, vars)
}

// ─── Monta HTML do e-mail (responsivo, inline CSS) ────────────────────────────
function buildEmailHtml(boxNome: string, conteudo: string, unsubscribeUrl = '#'): string {
  // Converte \n em <br> e negrito *texto* em <strong>
  const html = conteudo
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${boxNome}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5">
    <tr><td align="center" style="padding:40px 16px">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0A0A10 0%,#141428 100%);padding:28px 40px;text-align:center">
            <p style="margin:0;color:#00E5FF;font-size:24px;font-weight:900;letter-spacing:-0.5px">LOTA</p>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px">${boxNome}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px">
            <p style="margin:0;color:#1f2937;font-size:16px;line-height:1.7">${html}</p>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 40px 36px;text-align:center">
            <a href="https://wa.me/" style="display:inline-block;background:linear-gradient(135deg,#00E5FF,#0070F3);color:#000;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px">💬 Responder no WhatsApp</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb">
            <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.6">
              Você recebeu este e-mail por ser cliente do <strong style="color:#6b7280">${boxNome}</strong>.<br>
              Para não receber mais e-mails, <a href="${unsubscribeUrl}" style="color:#9ca3af">clique aqui para descadastrar</a>.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

const FOLLOWUP_KEYS: Record<string, string[]> = {
  agora:      ['followup_agora_1',      'followup_agora_2',      'followup_agora_3'],
  em_breve:   ['followup_em_breve_1',   'followup_em_breve_2',   'followup_em_breve_3'],
  comparando: ['followup_comparando_1', 'followup_comparando_2', 'followup_comparando_3'],
}

const FOLLOWUP_HORAS: Record<string, number[]> = {
  agora:      [1,   3,   24],
  em_breve:   [3,   24,  72],
  comparando: [24,  168, 336],
}

// ─── Assuntos de e-mail por template key ──────────────────────────────────────
const EMAIL_SUBJECTS: Record<string, (v: Record<string, unknown>) => string> = {
  lead_boas_vindas:      (v) => `Oi ${v.nome}! Bem-vindo(a) ao ${v.box_nome} 🎉`,
  followup_agora_1:      (v) => `${v.nome}, temos horários disponíveis! 💪`,
  followup_agora_2:      (v) => `${v.nome} — condição especial te esperando!`,
  followup_agora_3:      (v) => `Últimas vagas esta semana — ${v.box_nome}`,
  followup_em_breve_1:   (v) => `Informações sobre o ${v.box_nome} 🏋️`,
  followup_em_breve_2:   (v) => `${v.nome}, estamos aqui quando precisar!`,
  followup_em_breve_3:   (v) => `Um abraço do ${v.box_nome} 💙`,
  followup_comparando_1: (v) => `Aula experimental grátis — ${v.box_nome}`,
  followup_comparando_2: (v) => `${v.box_nome} — Tire suas dúvidas!`,
  followup_comparando_3: (v) => `${v.box_nome} — de portas abertas pra você! 🏋️`,
  retencao_3_faltas:     (v) => `${v.nome}, sentimos sua falta! 💙`,
  retencao_5_faltas:     (v) => `⚠️ ${v.nome}, estamos preocupados com você`,
  renovacao_7_dias:      (v) => `📅 Seu plano vence em ${v.dias_vencimento} dias — hora de renovar!`,
  renovacao_1_dia:       (v) => `⏰ Atenção: seu plano vence amanhã!`,
  renovacao_inadimplente:(v) => `🙏 Regularize seu plano — ${v.box_nome}`,
  indicacao_convertida:  (v) => `🎁 Seu amigo se matriculou! Você ganhou um benefício!`,
}

// ─── Env vars ─────────────────────────────────────────────────────────────────
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EVOLUTION_API_URL    = Deno.env.get('EVOLUTION_API_URL')!
const EVOLUTION_API_KEY    = Deno.env.get('EVOLUTION_API_KEY')!
const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY') ?? ''

// ─── Horário comercial (BRT = UTC-3) ──────────────────────────────────────────
function isHorarioComercial(): boolean {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const hora = brt.getUTCHours()
  const dia  = brt.getUTCDay()
  return dia >= 1 && dia <= 5 && hora >= 9 && hora < 20
}

// ─── Servidor ─────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (!isHorarioComercial()) {
    return new Response(JSON.stringify({ ok: true, msg: 'Fora do horário comercial (09h-20h BRT em dias úteis)' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const resultado = { enviados: 0, falhos: 0, pulados: 0 }

  try {
    // 1. Avança sequências de follow-up
    await avancarSequencias(supabase)

    // 2. Busca fila pendente
    const { data: fila, error } = await supabase
      .from('disparo_fila')
      .select('*, boxes!inner(id, slug, nome, dono_whatsapp, limite_msgs_dia, ativo)')
      .eq('status', 'pendente')
      .lte('agendado_para', new Date().toISOString())
      .eq('boxes.ativo', true)
      .order('agendado_para', { ascending: true })
      .limit(30)

    if (error) throw error
    if (!fila?.length) {
      return new Response(JSON.stringify({ ok: true, msg: 'Fila vazia', ...resultado }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    for (const disparo of fila) {
      try {
        // Rate limit
        const { count } = await supabase
          .from('disparo_fila')
          .select('id', { count: 'exact', head: true })
          .eq('box_id', disparo.box_id)
          .eq('status', 'enviado')
          .gte('enviado_at', new Date(Date.now() - 86400000).toISOString())

        const limite = (disparo.boxes as Record<string, number>)?.limite_msgs_dia || 30
        if ((count || 0) >= limite) {
          resultado.pulados++
          continue
        }

        // Busca destinatário
        const dest = await getDestinatario(supabase, disparo)
        if (!dest || dest.opt_out) {
          await supabase.from('disparo_fila').update({ status: 'cancelado' }).eq('id', disparo.id)
          resultado.pulados++
          continue
        }

        // Gera texto (busca template personalizado do banco)
        const vars = {
          nome: dest.nome,
          box_nome: (disparo.boxes as Record<string, string>)?.nome || 'seu box',
          ...(disparo.payload || {}),
        }
        const texto = await getTemplate(supabase, disparo.box_id, disparo.template_key, vars)

        // ── Roteamento por canal ────────────────────────────────────────────
        const canal = disparo.canal as string
        const slug  = (disparo.boxes as Record<string, string>)?.slug

        if (canal === 'email') {
          // Envia via Resend
          const email = (dest as Record<string, string>).email
          if (!email) {
            await supabase.from('disparo_fila').update({ status: 'cancelado', erro_detalhes: 'Destinatário sem e-mail' }).eq('id', disparo.id)
            resultado.pulados++
            continue
          }
          const boxNome = (disparo.boxes as Record<string, string>)?.nome || 'Box'
          const fromEmail = (disparo.boxes as Record<string, string>)?.resend_from_email || `noreply@lota.app.br`
          const subject = EMAIL_SUBJECTS[disparo.template_key]?.(vars) || `Mensagem do ${boxNome}`
          const htmlContent = buildEmailHtml(boxNome, texto)
          await enviarEmail(email, fromEmail, subject, htmlContent)
        } else {
          // Envia via Evolution API (WhatsApp)
          await enviarWhatsApp(slug, dest.whatsapp, texto)
        }

        await supabase.from('disparo_fila').update({
          status:     'enviado',
          enviado_at: new Date().toISOString(),
        }).eq('id', disparo.id)

        resultado.enviados++
        await new Promise((r) => setTimeout(r, 2000))

      } catch (err) {
        await supabase.from('disparo_fila').update({
          status:        'falhou',
          tentativas:    (disparo.tentativas || 0) + 1,
          erro_detalhes: String(err),
        }).eq('id', disparo.id)
        resultado.falhos++
      }
    }

    return new Response(JSON.stringify({ ok: true, ...resultado }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ─── Avança sequências ────────────────────────────────────────────────────────
async function avancarSequencias(supabase: ReturnType<typeof createClient>) {
  const { data: seqs } = await supabase
    .from('follow_up_sequencias')
    .select('*, leads!inner(id, nome, whatsapp, opt_out, lgpd_consent, box_id, boxes!inner(slug, nome))')
    .eq('status', 'ativo')
    .lte('proximo_disparo_at', new Date().toISOString())
    .limit(20)

  if (!seqs?.length) return

  for (const seq of seqs) {
    const lead = seq.leads as Record<string, unknown>
    if (lead.opt_out || !lead.lgpd_consent) {
      await supabase.from('follow_up_sequencias').update({ status: 'opt_out' }).eq('id', seq.id)
      continue
    }

    const step = seq.step_atual
    const momento = seq.momento_compra
    const templateKey = FOLLOWUP_KEYS[momento]?.[step - 1] ?? 'followup_em_breve_1'
    const boxes = lead.boxes as Record<string, string>

    await supabase.from('disparo_fila').insert({
      box_id:            lead.box_id,
      destinatario_tipo: 'lead',
      destinatario_id:   seq.lead_id,
      canal:             'whatsapp',
      template_key:      templateKey,
      payload:           { nome: lead.nome, box_nome: boxes?.nome },
      agendado_para:     new Date().toISOString(),
      status:            'pendente',
    })

    const proximoStep = step + 1
    if (proximoStep > 3) {
      await supabase.from('follow_up_sequencias').update({ status: 'concluido' }).eq('id', seq.id)
    } else {
      const horas = FOLLOWUP_HORAS[momento]?.[proximoStep - 1] ?? 24
      const proximoAt = new Date(Date.now() + horas * 60 * 60 * 1000)
      await supabase.from('follow_up_sequencias').update({
        step_atual:         proximoStep,
        proximo_disparo_at: proximoAt.toISOString(),
      }).eq('id', seq.id)
    }
  }
}

// ─── Busca destinatário ───────────────────────────────────────────────────────
async function getDestinatario(supabase: ReturnType<typeof createClient>, disparo: Record<string, unknown>) {
  const tipo = disparo.destinatario_tipo as string
  const id   = disparo.destinatario_id as string

  if (tipo === 'lead') {
    const { data } = await supabase.from('leads').select('nome, whatsapp, email, opt_out, lgpd_consent').eq('id', id).single()
    if (!data || !data.lgpd_consent) return null
    return data
  }
  if (tipo === 'aluno') {
    const { data } = await supabase.from('alunos').select('nome, whatsapp, email, opt_out').eq('id', id).single()
    return data
  }
  if (tipo === 'dono') {
    const { data } = await supabase.from('boxes').select('dono_nome, dono_whatsapp, dono_email').eq('id', id).single()
    if (!data) return null
    return { nome: data.dono_nome, whatsapp: data.dono_whatsapp, email: data.dono_email, opt_out: false }
  }
  return null
}

// ─── Envia via Evolution API (WhatsApp) ──────────────────────────────────────
async function enviarWhatsApp(slug: string, numero: string, texto: string) {
  const to = numero.replace(/\D/g, '')
  const res = await fetch(`${EVOLUTION_API_URL}/message/sendText/${slug}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
    body: JSON.stringify({ number: to, text: texto }),
  })
  if (!res.ok) throw new Error(`Evolution API ${res.status}: ${await res.text()}`)
}

// ─── Envia via Resend (e-mail) ────────────────────────────────────────────────
async function enviarEmail(
  to: string,
  from: string,
  subject: string,
  html: string
) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY não configurado nos secrets do Supabase')
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  })
  if (!res.ok) throw new Error(`Resend API ${res.status}: ${await res.text()}`)
}
