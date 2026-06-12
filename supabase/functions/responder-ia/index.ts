/**
 * supabase/functions/responder-ia/index.ts
 * Assistente IA com Gemini 1.5 Flash
 *
 * Recebe uma mensagem recebida no WhatsApp, verifica a config da IA,
 * chama o Gemini e age conforme o nível configurado:
 *   sugestao   → salva em ia_sugestoes (atendente aprova)
 *   semi_auto  → agenda na disparo_fila com janela de cancelamento
 *   autonomo   → envia imediatamente via Evolution API
 *
 * URL: https://favryvjzvfdqlftkyhpi.supabase.co/functions/v1/responder-ia
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const EVOLUTION_URL        = Deno.env.get('EVOLUTION_API_URL')!
const EVOLUTION_KEY        = Deno.env.get('EVOLUTION_API_KEY')!
const GEMINI_API_KEY_ENV   = Deno.env.get('GEMINI_API_KEY') || ''

// ─── Servidor ─────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json()
    const { box_id, mensagem_id, whatsapp, texto, lead_id, aluno_id } = body
    const modoTeste: boolean = body.modo_teste === true

    // Modo teste: só precisa de box_id e texto
    if (modoTeste && (!box_id || !texto)) {
      return new Response(JSON.stringify({ ok: false, reason: 'dados_incompletos' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!modoTeste && (!box_id || !whatsapp || !texto)) {
      return new Response(JSON.stringify({ ok: false, reason: 'dados_incompletos' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // ── 1. Busca configuração da IA ──────────────────────────────────────────
    const { data: config } = await supabase
      .from('ia_config')
      .select('*')
      .eq('box_id', box_id)
      // Em modo teste, não filtra por ativo=true
      .maybeSingle()

    if (!config) {
      return new Response(JSON.stringify({ ok: false, reason: 'ia_nao_configurada', msg: 'Salve as configurações da IA primeiro antes de testar.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Verifica horário e dia (apenas em modo real) ───────────────────────
    if (!modoTeste) {
      const agora = new Date()
      const horaAtual = agora.toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
      })
      const diaAtual = agora.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Sao_Paulo' })
      const diaNum = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(diaAtual)

      const diasAtivos: number[] = config.dias_semana || [1, 2, 3, 4, 5]
      if (!diasAtivos.includes(diaNum)) {
        return new Response(JSON.stringify({ ok: false, reason: 'fora_do_dia' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const horaInicio = config.horario_inicio || '09:00'
      const horaFim    = config.horario_fim    || '20:00'
      if (horaAtual < horaInicio || horaAtual > horaFim) {
        return new Response(JSON.stringify({ ok: false, reason: 'fora_do_horario' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Só verifica se está ativo em modo real
      if (!config.ativo) {
        return new Response(JSON.stringify({ ok: false, reason: 'ia_inativa' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // ── 3. Busca contexto (lead ou aluno) ────────────────────────────────────
    let contextoContato = ''
    if (aluno_id) {
      const { data: aluno } = await supabase.from('alunos').select('nome, plano, status, valor_mensalidade, faltas_consecutivas').eq('id', aluno_id).single()
      if (aluno) {
        contextoContato = `É um ALUNO do box. Nome: ${aluno.nome}. Plano: ${aluno.plano} (R$${aluno.valor_mensalidade}/mês). Status: ${aluno.status}. Faltas consecutivas: ${aluno.faltas_consecutivas || 0}.`
      }
    } else if (lead_id) {
      const { data: lead } = await supabase.from('leads').select('nome, status, momento_compra, interesse').eq('id', lead_id).single()
      if (lead) {
        contextoContato = `É um LEAD. Nome: ${lead.nome}. Status no funil: ${lead.status}. Momento de compra: ${lead.momento_compra || 'desconhecido'}. Interesses: ${(lead.interesse || []).join(', ') || 'não especificado'}.`
      }
    } else {
      contextoContato = 'É um contato externo (não é lead nem aluno cadastrado ainda).'
    }

    // ── 4. Busca histórico das últimas 8 mensagens ───────────────────────────
    const { data: historico } = await supabase
      .from('mensagens')
      .select('direcao, texto, created_at')
      .eq('box_id', box_id)
      .eq('contato_whatsapp', whatsapp)
      .order('created_at', { ascending: false })
      .limit(8)

    const historicoStr = (historico || [])
      .reverse()
      .map(m => `${m.direcao === 'saida' ? '[BOX]' : '[CLIENTE]'}: ${m.texto}`)
      .join('\n')

    // ── 5. Busca dados do box ────────────────────────────────────────────────
    const { data: box } = await supabase.from('boxes').select('nome, slug').eq('id', box_id).single()

    // ── 6. Monta prompt do Gemini ────────────────────────────────────────────
    const systemPrompt = `Você é um assistente de vendas e atendimento do box de CrossFit/academia "${box?.nome || 'nosso box'}".

CONTEXTO DO BOX:
${config.contexto_box || 'Box de CrossFit com modalidades variadas.'}

REGRAS DE COMPORTAMENTO:
- Seja caloroso, próximo e use linguagem brasileira natural (não formal demais)
- Use emojis com moderação (1-2 por mensagem, não exagere)
- Seja conciso: máximo 3-4 parágrafos curtos
- NUNCA invente preços ou informações que não estão no contexto
- Se não souber algo, diga "deixa eu verificar e te respondo em breve"
- Não mencione que é uma IA

INFORMAÇÕES DO CONTATO:
${contextoContato}

HISTÓRICO DA CONVERSA:
${historicoStr || '(sem histórico anterior)'}

NOVA MENSAGEM DO CLIENTE: "${texto}"

Responda de forma natural e personalizada:`

    // ── 7. Chama Gemini API ──────────────────────────────────────────────────
    const apiKey = (config.gemini_api_key || GEMINI_API_KEY_ENV || '').trim()
    if (!apiKey) {
      console.warn('[responder-ia] Nenhuma API key do Gemini configurada')
      return new Response(JSON.stringify({ ok: false, reason: 'sem_api_key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
            topP: 0.8,
          },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('[responder-ia] Gemini error:', errText)
      
      // Tenta listar os modelos disponíveis para ajudar o usuário no diagnóstico
      let modelsList = ''
      try {
        const listRes = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`)
        if (listRes.ok) {
          const listData = await listRes.json()
          const names = (listData.models || []).map((m: any) => m.name.replace('models/', ''))
          modelsList = `\n\nModelos disponíveis na sua chave:\n- ${names.slice(0, 15).join('\n- ')}`
        } else {
          modelsList = `\n\n(Não foi possível listar os modelos. Status: ${listRes.status})`
        }
      } catch (listErr) {
        modelsList = `\n\n(Erro ao tentar listar os modelos: ${String(listErr)})`
      }

      return new Response(JSON.stringify({ ok: false, reason: 'gemini_error', details: errText + modelsList }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const geminiData = await geminiRes.json()
    const respostaIA = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!respostaIA) {
      return new Response(JSON.stringify({ ok: false, reason: 'resposta_vazia' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`[responder-ia] IA gerou resposta (${modoTeste ? 'TESTE' : config.nivel}): ${respostaIA.substring(0, 80)}...`)

    // ── 8. Modo teste: retorna a resposta sem salvar nada ────────────────────
    if (modoTeste) {
      return new Response(JSON.stringify({ ok: true, modo_teste: true, resposta: respostaIA }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 9. Age conforme o nível ──────────────────────────────────────────────
    if (config.nivel === 'sugestao') {
      // Salva sugestão — atendente aprova/edita/descarta no chat
      await supabase.from('ia_sugestoes').insert({
        box_id,
        mensagem_id: mensagem_id || null,
        whatsapp,
        lead_id:        lead_id  || null,
        aluno_id:       aluno_id || null,
        texto_sugerido: respostaIA,
        status:         'pendente',
      })

    } else if (config.nivel === 'semi_auto') {
      // Agenda com janela de cancelamento
      const janela = config.janela_cancelamento_seg || 30
      const cancelavelAte = new Date(Date.now() + janela * 1000).toISOString()
      const agendadoPara  = new Date(Date.now() + (janela + 2) * 1000).toISOString()

      await supabase.from('disparo_fila').insert({
        box_id,
        destinatario_tipo: lead_id ? 'lead' : aluno_id ? 'aluno' : 'dono',
        destinatario_id:   lead_id || aluno_id || box_id,
        canal:             'whatsapp',
        template_key:      'ia_resposta_auto',
        payload:           { whatsapp, texto: respostaIA, contato_whatsapp: whatsapp },
        agendado_para:     agendadoPara,
        cancelavel_ate:    cancelavelAte,
        ia_gerada:         true,
        status:            'pendente',
      })

      // Notifica dono sobre resposta automática pendente
      const { data: boxData } = await supabase.from('boxes').select('dono_whatsapp').eq('id', box_id).single()
      if (boxData?.dono_whatsapp) {
        const to = boxData.dono_whatsapp.replace(/\D/g, '')
        await fetch(`${EVOLUTION_URL}/message/sendText/${box?.slug}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_KEY },
          body: JSON.stringify({
            number: to,
            text: `🤖 *IA vai responder em ${janela}s:*\n\n"${respostaIA.substring(0, 100)}..."\n\n_Acesse o LOTA para cancelar se quiser._`,
          }),
        }).catch(() => {})
      }

    } else if (config.nivel === 'autonomo') {
      // Envia imediatamente
      const to = whatsapp.replace(/\D/g, '')
      await fetch(`${EVOLUTION_URL}/message/sendText/${box?.slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_KEY },
        body: JSON.stringify({ number: to, text: respostaIA }),
      })

      // Salva a mensagem enviada no banco
      await supabase.from('mensagens').insert({
        box_id,
        contato_whatsapp: whatsapp,
        contato_nome:     null,
        direcao:          'saida',
        texto:            respostaIA,
        tipo:             'texto',
        lead_id:          lead_id  || null,
        aluno_id:         aluno_id || null,
        lida:             true,
      })
    }

    // Incrementa contador
    await supabase.from('ia_config')
      .update({ total_msgs_respondidas: (config.total_msgs_respondidas || 0) + 1 })
      .eq('box_id', box_id)

    return new Response(JSON.stringify({ ok: true, nivel: config.nivel, preview: respostaIA.substring(0, 80) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[responder-ia] Erro:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
