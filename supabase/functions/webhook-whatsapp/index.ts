/**
 * supabase/functions/webhook-whatsapp/index.ts
 * VERSÃO STANDALONE — sem imports de _shared (compatível com Supabase Dashboard)
 *
 * Recebe webhooks da Evolution API e identifica o tipo de contato em cascata:
 * contatos_especiais → alunos → leads → novo lead
 *
 * URL: https://favryvjzvfdqlftkyhpi.supabase.co/functions/v1/webhook-whatsapp
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ────────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Templates hardcoded (fallback) ──────────────────────────────────────────
function fill(tmpl: string, v: Record<string, unknown>): string {
  return tmpl.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? `{${k}}`))
}

const TEMPLATES_FALLBACK: Record<string, (v: Record<string, unknown>) => string> = {
  lead_boas_vindas: (v) => fill(
    `Oi {nome}! 😊\n\nQue bom que entrou em contato com o *{box_nome}*! 💪\n\nMe conta: você está buscando começar do zero ou tem algum objetivo específico?\n\nAssim consigo te indicar o melhor plano! 🏋️`, v
  ),
  aluno_ativo_resposta: (v) => fill(
    `Oi {nome}! 😊\n\nQue bom te ver por aqui! 💪\n\nNosso time vai te atender em breve. Se precisar de algo urgente, pode responder aqui mesmo!\n\nUm abraço, equipe *{box_nome}* 🏋️`, v
  ),
  aluno_cancelado_resposta: (v) => fill(
    `{nome}! Que surpresa boa! 😄\n\nSentimos muito a sua falta no *{box_nome}*! 💪\n\nTemos novidades e condições especiais para alunos que querem retornar.\n\nQuer saber mais? É só me falar! 🏋️`, v
  ),
  aluno_inadimplente_resposta: (v) => fill(
    `Oi {nome}! 😊\n\nTudo bem? Passando pra lembrar que seu plano no *{box_nome}* está com pagamento em aberto.\n\nPode contar com a gente pra encontrar uma solução! Me fala como posso te ajudar. 🙏`, v
  ),
  contato_vip_resposta: (v) => fill(
    `Oi {nome}! ⭐\n\nQue prazer receber sua mensagem! Nossa equipe do *{box_nome}* vai te atender com prioridade.\n\nJá estamos vendo sua mensagem! 💪`, v
  ),
  contato_externo_resposta: (v) => fill(
    `Olá! 👋\n\nObrigado pela mensagem! Redirecionei seu contato ao responsável do *{box_nome}*.\n\nVocê será atendido em breve! 😊`, v
  ),
  alerta_lead_novo: (v) => fill(
    `🔥 *Novo lead no {box_nome}!*\n\n👤 *{nome}*\n💬 "{mensagem_original}"\n\nAcesse o painel LOTA!\n_www.lota.app.br_`, v
  ),
  alerta_aluno_mensagem: (v) => fill(
    `💬 *{nome} enviou mensagem no {box_nome}!*\n\n📱 {whatsapp}\n🏷️ Status: {status_aluno}\n💬 "{mensagem_original}"\n\nAcesse o painel LOTA para ver mais detalhes.`, v
  ),
  alerta_contato_externo: (v) => fill(
    `📩 *Nova mensagem externa no {box_nome}!*\n\n👤 *{nome}* ({tipo})\n📱 {whatsapp}\n💬 "{mensagem_original}"\n\nVerifique seu WhatsApp!`, v
  ),
}

// ─── Busca template do banco (com fallback) ───────────────────────────────────
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

    if (data?.ativo && data?.texto) {
      return data.texto.replace(/\{(\w+)\}/g, (_: string, k: string) => String(vars[k] ?? `{${k}}`))
    }
  } catch { /* fallback */ }
  return TEMPLATES_FALLBACK[key]?.(vars) ?? `[Template "${key}" não encontrado]`
}

// ─── Enfileira uma mensagem ───────────────────────────────────────────────────
async function enfileirar(
  supabase: ReturnType<typeof createClient>,
  boxId: string,
  tipo: string,
  destId: string,
  templateKey: string,
  payload: Record<string, unknown>,
  agendarMin = 0
) {
  const agendadoPara = new Date(Date.now() + agendarMin * 60 * 1000)
  await supabase.from('disparo_fila').insert({
    box_id: boxId,
    destinatario_tipo: tipo,
    destinatario_id: destId,
    canal: 'whatsapp',
    template_key: templateKey,
    payload,
    agendado_para: agendadoPara.toISOString(),
    status: 'pendente',
  })
}

// ─── Qualificação automática por palavras-chave ───────────────────────────────
function normalizarTexto(txt: string): string {
  return txt.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
}

function detectarMomentoCompra(texto: string): string | null {
  const t = normalizarTexto(texto)

  const palavrasAgora = [
    'quero agora', 'quanto custa', 'qual o valor', 'qual o preco',
    'quero me matricular', 'fazer matricula', 'quero comecar hoje',
    'vou comecar', 'ja quero', 'urgente', 'essa semana', 'esta semana',
    'nos proximos dias', 'me passa o valor', 'me manda os planos',
    'quero saber os planos', 'tem vaga', 'tem horario', 'posso comecar',
    'quero comecar', 'pode me mandar', 'me fala os valores',
  ]

  const palavrasEmBreve = [
    'semana que vem', 'proximo mes', 'mes que vem', 'em breve',
    'pensando', 'planejando', 'daqui a pouco', 'em alguns dias',
    'mais pra frente', 'mais para frente', 'depois do carnaval',
    'ano que vem', 'daqui uns dias', 'mais tarde', 'futuramente',
  ]

  const palavrasComparando = [
    'pesquisando', 'comparando', 'outras opcoes', 'outros lugares',
    'outras academias', 'outros boxes', 'ainda avaliando',
    'ainda nao decidi', 'ver mais opcoes', 'preciso pensar',
    'vou pensar', 'nao sei ainda', 'talvez', 'pode ser',
    'to vendo', 'estou vendo', 'to pesquisando',
  ]

  const pontos = { agora: 0, em_breve: 0, comparando: 0 }
  for (const kw of palavrasAgora)      if (t.includes(kw)) pontos.agora++
  for (const kw of palavrasEmBreve)    if (t.includes(kw)) pontos.em_breve++
  for (const kw of palavrasComparando) if (t.includes(kw)) pontos.comparando++

  const max = Math.max(pontos.agora, pontos.em_breve, pontos.comparando)
  if (max === 0) return null
  if (pontos.agora === max)     return 'agora'
  if (pontos.em_breve === max)  return 'em_breve'
  return 'comparando'
}

function detectarInteresse(texto: string): string[] {
  const t = normalizarTexto(texto)
  const interesses: string[] = []
  const mapa: Record<string, string[]> = {
    'musculacao': ['musculacao', 'musculo', 'hipertrofia', 'ganhar massa', 'fortalecer'],
    'crossfit':   ['crossfit', 'cross', 'wod', 'funcional intenso'],
    'funcional':  ['funcional', 'treino funcional', 'circuito'],
    'emagrecimento': ['emagrecer', 'perder peso', 'gordura', 'secar', 'perder barriga'],
    'condicionamento': ['condicionamento', 'cardio', 'resistencia', 'aerobico', 'preparacao fisica'],
    'mobilidade': ['flexibilidade', 'mobilidade', 'alongamento', 'postura'],
  }
  for (const [interesse, keywords] of Object.entries(mapa)) {
    if (keywords.some(kw => t.includes(kw))) interesses.push(interesse)
  }
  return interesses
}

// ─── Env vars ─────────────────────────────────────────────────────────────────
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ─── Servidor ─────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const { event, instance, data } = payload

    console.log(`[webhook-whatsapp] event=${event} instance=${instance}`)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Encontra o box pelo slug
    const { data: box, error: boxErr } = await supabase
      .from('boxes')
      .select('*')
      .eq('slug', instance)
      .single()

    if (boxErr || !box) {
      console.warn(`Box não encontrado: ${instance}`)
      return new Response(JSON.stringify({ ok: true, warn: 'box_not_found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      await handleNovaMsg(supabase, box, data)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[webhook-whatsapp] Erro:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ─── Handler principal de nova mensagem ───────────────────────────────────────
async function handleNovaMsg(
  supabase: ReturnType<typeof createClient>,
  box: Record<string, unknown>,
  data: Record<string, unknown>
) {
  const key = data.key as Record<string, string>
  const remoteJid = key?.remoteJid || ''
  if (remoteJid.includes('@g.us')) return // ignora grupos

  const numero = remoteJid.replace('@s.whatsapp.net', '')
  const whatsapp = numero.startsWith('+') ? numero : `+${numero}`
  const nome = (data.pushName as string) || 'Contato'

  const msg = data.message as Record<string, unknown>
  const textoOriginal = (msg?.conversation as string)
    || ((msg?.extendedTextMessage as Record<string, string>)?.text)
    || '...'

  const msgId = (data.key as Record<string, string>)?.id || ''
  const tipoMsg = msg?.imageMessage ? 'imagem'
    : msg?.audioMessage ? 'audio'
    : msg?.documentMessage ? 'doc'
    : msg?.stickerMessage ? 'sticker'
    : 'texto'

  // Extrai URL de mídia (imagem, áudio, documento, vídeo)
  const mediaUrl: string | null =
    (msg?.imageMessage    as Record<string, string>)?.url
    || (msg?.audioMessage    as Record<string, string>)?.url
    || (msg?.documentMessage as Record<string, string>)?.url
    || (msg?.videoMessage    as Record<string, string>)?.url
    || null

  const boxId = box.id as string

  // ──────────────────────────────────────────────────────────────────
  // fromMe: mensagem enviada PELO CELULAR — salva como 'saida' e encerra
  // ──────────────────────────────────────────────────────────────────
  if (key?.fromMe) {
    console.log(`[webhook-whatsapp] Msg enviada pelo celular para ${whatsapp} — salvando como saida`)
    const [{ data: lead }, { data: aluno }] = await Promise.all([
      supabase.from('leads').select('id').eq('box_id', boxId).eq('whatsapp', whatsapp).maybeSingle(),
      supabase.from('alunos').select('id').eq('box_id', boxId).eq('whatsapp', whatsapp).maybeSingle(),
    ])
    await salvarMensagem(supabase, boxId, whatsapp, nome, textoOriginal, tipoMsg, msgId, lead?.id || null, aluno?.id || null, 'saida', mediaUrl)
    return
  }
  const textoCorto = textoOriginal.substring(0, 100)
  console.log(`[webhook-whatsapp] Nova msg recebida de ${whatsapp} (${nome})`)


  // ══════════════════════════════════════════════════════════════════
  // PASSO 1 — Verifica contatos especiais (fornecedor, bloqueado, VIP)
  // ══════════════════════════════════════════════════════════════════
  const boxNome = box.nome as string
  const donoWhatsapp = box.dono_whatsapp as string

  const { data: contatoEspecial } = await supabase
    .from('contatos_especiais')
    .select('*')
    .eq('box_id', boxId)
    .eq('whatsapp', whatsapp)
    .eq('ativo', true)
    .maybeSingle()

  if (contatoEspecial) {
    const nomeContato = contatoEspecial.nome || nome
    console.log(`[webhook-whatsapp] Contato especial: ${contatoEspecial.tipo}`)

    if (contatoEspecial.tipo === 'bloqueado') {
      // Ignora silenciosamente — não salva nem responde
      console.log('[webhook-whatsapp] Contato bloqueado — ignorando')
      return
    }

    if (contatoEspecial.tipo === 'fornecedor' || contatoEspecial.tipo === 'parceiro' || contatoEspecial.tipo === 'outro') {
      // Salva mensagem
      await salvarMensagem(supabase, boxId, whatsapp, nome, textoOriginal, tipoMsg, msgId, null, null, 'entrada', mediaUrl)

      // Responde ao contato externo
      const textoResposta = await getTemplate(supabase, boxId, 'contato_externo_resposta', {
        nome: nomeContato, box_nome: boxNome,
      })
      await enviarDireto(whatsapp, textoResposta, box)

      // Notifica o dono
      if (donoWhatsapp) {
        const textoAlerta = await getTemplate(supabase, boxId, 'alerta_contato_externo', {
          nome: nomeContato,
          box_nome: boxNome,
          tipo: contatoEspecial.tipo,
          whatsapp,
          mensagem_original: textoCorto,
        })
        await enviarDireto(donoWhatsapp, textoAlerta, box)
      }
      return
    }

    if (contatoEspecial.tipo === 'vip') {
      // Salva mensagem
      await salvarMensagem(supabase, boxId, whatsapp, nomeContato, textoOriginal, tipoMsg, msgId, null, null, 'entrada', mediaUrl)

      // Resposta VIP
      await enfileirar(supabase, boxId, 'dono', boxId, 'contato_vip_resposta', {
        nome: nomeContato, box_nome: boxNome,
      })
      // Também notifica dono
      if (donoWhatsapp) {
        await enviarDireto(donoWhatsapp,
          `⭐ *VIP enviou mensagem no ${boxNome}!*\n\n👤 *${nomeContato}*\n📱 ${whatsapp}\n💬 "${textoCorto}"`,
          box
        )
      }
      return
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // PASSO 2 — Verifica se é um aluno existente
  // ══════════════════════════════════════════════════════════════════
  const { data: aluno } = await supabase
    .from('alunos')
    .select('id, nome, status, opt_out')
    .eq('box_id', boxId)
    .eq('whatsapp', whatsapp)
    .maybeSingle()

  if (aluno) {
    const nomeAluno = aluno.nome || nome
    console.log(`[webhook-whatsapp] Aluno encontrado: status=${aluno.status}`)

    // Salva mensagem vinculada ao aluno
    const msgIdSalva = await salvarMensagem(supabase, boxId, whatsapp, nomeAluno, textoOriginal, tipoMsg, msgId, null, aluno.id, 'entrada', mediaUrl)

    // Aciona o Assistente IA
    acionarIA(boxId, msgIdSalva, whatsapp, textoOriginal, null, aluno.id)


    // Escolhe template baseado no status
    let templateKey = 'aluno_ativo_resposta'
    let statusLabel = 'Ativo'

    if (aluno.status === 'inadimplente') {
      templateKey = 'aluno_inadimplente_resposta'
      statusLabel = 'Inadimplente'
    } else if (aluno.status === 'cancelado' || aluno.status === 'suspenso') {
      templateKey = 'aluno_cancelado_resposta'
      statusLabel = aluno.status === 'cancelado' ? 'Cancelado' : 'Suspenso'
    }

    // Resposta automática para o aluno (se não tem opt-out)
    if (!aluno.opt_out) {
      const textoResposta = await getTemplate(supabase, boxId, templateKey, {
        nome: nomeAluno, box_nome: boxNome,
      })
      await enviarDireto(whatsapp, textoResposta, box)
    }

    // Notifica o dono sobre a mensagem do aluno
    if (donoWhatsapp) {
      const textoAlerta = await getTemplate(supabase, boxId, 'alerta_aluno_mensagem', {
        nome: nomeAluno,
        box_nome: boxNome,
        whatsapp,
        status_aluno: statusLabel,
        mensagem_original: textoCorto,
      })
      await enviarDireto(donoWhatsapp, textoAlerta, box)
    }

    // Notificação no painel
    await supabase.from('notificacoes').insert({
      box_id: boxId,
      tipo: 'lead_novo',
      titulo: `💬 Mensagem de ${nomeAluno} (${statusLabel})`,
      corpo: `"${textoCorto}"`,
      payload: { aluno_id: aluno.id, whatsapp, status: aluno.status },
      lida: false,
    })

    return
  }

  // ══════════════════════════════════════════════════════════════════
  // PASSO 3 — Verifica se é um lead existente (evita duplicata)
  // ══════════════════════════════════════════════════════════════════
  const { data: leadExistente } = await supabase
    .from('leads')
    .select('id, nome, status, momento_compra')
    .eq('box_id', boxId)
    .eq('whatsapp', whatsapp)
    .maybeSingle()

  if (leadExistente) {
    console.log(`[webhook-whatsapp] Lead existe: ${leadExistente.id} (status=${leadExistente.status})`)

    // Salva mensagem vinculada ao lead
    const msgIdSalva = await salvarMensagem(supabase, boxId, whatsapp, leadExistente.nome || nome, textoOriginal, tipoMsg, msgId, leadExistente.id, null, 'entrada', mediaUrl)

    // Aciona o Assistente IA
    acionarIA(boxId, msgIdSalva, whatsapp, textoOriginal, leadExistente.id, null)


    // ── Qualificação automática por palavras-chave ──────────────────
    const momentoDetectado  = detectarMomentoCompra(textoOriginal)
    const interesseDetectado = detectarInteresse(textoOriginal)

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (leadExistente.status === 'novo' || leadExistente.status === 'perdido') {
      updateData.status = 'em_conversa'
    }

    // Aplica momento apenas se lead ainda não tinha
    if (momentoDetectado && !leadExistente.momento_compra) {
      updateData.momento_compra = momentoDetectado
    }

    if (interesseDetectado.length > 0) {
      updateData.interesse = interesseDetectado
    }

    await supabase.from('leads').update(updateData).eq('id', leadExistente.id)

    // ── Se qualificou: ajusta follow-up e notifica dono ────────────
    if (momentoDetectado && !leadExistente.momento_compra) {
      // Reinicia sequência com o momento correto
      await supabase.from('follow_up_sequencias')
        .update({ momento_compra: momentoDetectado, step_atual: 1 })
        .eq('lead_id', leadExistente.id)
        .eq('status', 'ativo')

      const momentoEmoji: Record<string, string> = { agora: '🔥', em_breve: '⏳', comparando: '🔄' }
      const momentoLabel: Record<string, string> = {
        agora:      'AGORA — quente!',
        em_breve:   'Em breve',
        comparando: 'Comparando opções',
      }

      // Alerta ao dono via WhatsApp
      if (donoWhatsapp) {
        await enviarDireto(
          donoWhatsapp,
          `${momentoEmoji[momentoDetectado] ?? '💡'} *Lead qualificado automaticamente!*\n\n` +
          `👤 ${leadExistente.nome || nome}\n📱 ${whatsapp}\n` +
          `🎯 Momento: *${momentoLabel[momentoDetectado] ?? momentoDetectado}*\n` +
          `💬 "${textoCorto}"\n\nFollow-up ajustado! _www.lota.app.br_`,
          box
        )
      }

      // Notificação no painel
      await supabase.from('notificacoes').insert({
        box_id: boxId,
        tipo: 'lead_novo',
        titulo: `${momentoEmoji[momentoDetectado]} ${leadExistente.nome || nome} se qualificou: ${momentoLabel[momentoDetectado]}`,
        corpo: `"${textoCorto}"`,
        payload: { lead_id: leadExistente.id, momento_compra: momentoDetectado },
        lida: false,
      })
    }

    return
  }

  // ══════════════════════════════════════════════════════════════════
  // PASSO 4 — Desconhecido: cria novo lead
  // ══════════════════════════════════════════════════════════════════
  // Detecta momento de compra na primeira mensagem
  const momentoInicial    = detectarMomentoCompra(textoOriginal) || 'em_breve'
  const interesseInicial  = detectarInteresse(textoOriginal)

  const { data: novoLead, error: leadErr } = await supabase
    .from('leads')
    .insert({
      box_id:          boxId,
      nome,
      whatsapp,
      origem:          'whatsapp',
      status:          'novo',
      momento_compra:  momentoInicial !== 'em_breve' ? momentoInicial : null,
      interesse:       interesseInicial.length > 0 ? interesseInicial : null,
      lgpd_consent:    true,
      lgpd_consent_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (leadErr || !novoLead) {
    console.error('[webhook-whatsapp] Erro ao criar lead:', leadErr)
    return
  }

  console.log(`Lead criado: ${novoLead.id}`)

  // Salva mensagem vinculada ao novo lead
  const msgIdSalva = await salvarMensagem(supabase, boxId, whatsapp, nome, textoOriginal, tipoMsg, msgId, novoLead.id, null, 'entrada', mediaUrl)

  // Aciona o Assistente IA
  acionarIA(boxId, msgIdSalva, whatsapp, textoOriginal, novoLead.id, null)


  // Sequência de follow-up com timing baseado no momento detectado
  const horasStep1: Record<string, number> = { agora: 1, em_breve: 3, comparando: 24 }
  const proximoDisparoAt = new Date(Date.now() + (horasStep1[momentoInicial] ?? 3) * 60 * 60 * 1000)
  await supabase.from('follow_up_sequencias').insert({
    box_id:             boxId,
    lead_id:            novoLead.id,
    momento_compra:     momentoInicial,
    step_atual:         1,
    proximo_disparo_at: proximoDisparoAt.toISOString(),
    status:             'ativo',
  })

  // Boas-vindas imediatas
  await enfileirar(supabase, boxId, 'lead', novoLead.id, 'lead_boas_vindas', {
    nome, box_nome: boxNome,
  })

  // Notificação no painel
  await supabase.from('notificacoes').insert({
    box_id:  boxId,
    tipo:    'lead_novo',
    titulo:  `🔥 Novo lead: ${nome}`,
    corpo:   `${nome} mandou mensagem: "${textoCorto}"`,
    payload: { lead_id: novoLead.id, whatsapp },
    lida:    false,
  })

  // Alerta para o dono via WhatsApp
  if (donoWhatsapp) {
    await enfileirar(supabase, boxId, 'dono', boxId, 'alerta_lead_novo', {
      nome, box_nome: boxNome, mensagem_original: textoCorto,
    })
  }
}

// ─── Envia mensagem direta via Evolution API (sem fila) ─────────────────────
async function enviarDireto(numero: string, texto: string, box: Record<string, unknown>) {
  const evolutionUrl = Deno.env.get('EVOLUTION_API_URL')
  const evolutionKey = Deno.env.get('EVOLUTION_API_KEY')

  if (!evolutionUrl || !evolutionKey) {
    console.warn('[webhook-whatsapp] EVOLUTION_API_URL/KEY não configurado')
    return
  }

  const to = numero.replace(/\D/g, '')
  try {
    const res = await fetch(`${evolutionUrl}/message/sendText/${box.slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': evolutionKey },
      body: JSON.stringify({ number: to, text: texto }),
    })
    if (!res.ok) {
      console.error(`[webhook-whatsapp] Evolution API error ${res.status}: ${await res.text()}`)
    }
  } catch (err) {
    console.error('[webhook-whatsapp] Erro ao enviar direto:', err)
  }
}

// ─── Salva mensagem no banco (entrada ou saída) ───────────────────────────────
async function salvarMensagem(
  supabase: ReturnType<typeof createClient>,
  boxId: string,
  whatsapp: string,
  nome: string,
  texto: string,
  tipo: string,
  msgId: string,
  leadId: string | null,
  alunoId: string | null,
  direcao: 'entrada' | 'saida' = 'entrada',
  mediaUrl: string | null = null
): Promise<string | null> {
  try {
    const { data, error } = await supabase.from('mensagens').insert({
      box_id:           boxId,
      contato_whatsapp: whatsapp,
      contato_nome:     nome,
      direcao,
      texto:            texto.substring(0, 4000),
      tipo,
      lead_id:          leadId,
      aluno_id:         alunoId,
      lida:             direcao === 'saida', // saida já nasce como lida
      whatsapp_msg_id:  msgId,
      media_url:        mediaUrl,
    }).select('id').maybeSingle()

    if (error) {
      console.warn('[webhook-whatsapp] Erro ao salvar mensagem:', error)
      return null
    }
    return data?.id || null
  } catch (err) {
    // Não interrompe o fluxo se falhar
    console.warn('[webhook-whatsapp] Falha ao salvar mensagem:', err)
    return null
  }
}

// ─── Aciona o Assistente IA de forma assíncrona (fire-and-forget) ───────────────
function acionarIA(
  boxId: string,
  mensagemId: string | null,
  whatsapp: string,
  texto: string,
  leadId: string | null,
  alunoId: string | null
) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('[webhook-whatsapp] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausente')
    return
  }

  // Faz a chamada sem usar await para não bloquear o webhook
  fetch(`${SUPABASE_URL}/functions/v1/responder-ia`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY
    },
    body: JSON.stringify({
      box_id: boxId,
      mensagem_id: mensagemId,
      whatsapp,
      texto,
      lead_id: leadId,
      aluno_id: alunoId
    })
  })
  .then(async (res) => {
    if (!res.ok) {
      console.error(`[webhook-whatsapp] responder-ia retornou erro ${res.status}:`, await res.text())
    } else {
      console.log('[webhook-whatsapp] responder-ia acionado com sucesso')
    }
  })
  .catch((err) => {
    console.error('[webhook-whatsapp] Erro ao chamar responder-ia:', err)
  })
}

