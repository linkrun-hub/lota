/**
 * supabase/functions/retencao-alunos/index.ts
 * VERSÃO STANDALONE — compatível com Supabase Dashboard
 *
 * Verifica automaticamente:
 * 1. Faltas consecutivas (3 e 5 dias sem presença)
 * 2. Vencimentos próximos (7 dias e 1 dia antes)
 * 3. Inadimplentes (vencimento passou, atualiza status e cobra)
 * 4. Candidatos a indicação (NPS >= 5 ou 3 meses de casa)
 *
 * Cron: 1x por dia às 10:00 BRT (13:00 UTC)
 * URL: https://favryvjzvfdqlftkyhpi.supabase.co/functions/v1/retencao-alunos
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ─── Data em BRT (UTC-3) ──────────────────────────────────────────────────────
function hoje(): string {
  const brt = new Date(Date.now() - 3 * 60 * 60 * 1000)
  return brt.toISOString().split('T')[0] // YYYY-MM-DD
}

function addDias(data: string, dias: number): string {
  const d = new Date(data)
  d.setDate(d.getDate() + dias)
  return d.toISOString().split('T')[0]
}

function diasDesde(dataStr: string): number {
  const hoje_ms = Date.now() - 3 * 60 * 60 * 1000
  const alvo_ms = new Date(dataStr).getTime()
  return Math.floor((hoje_ms - alvo_ms) / 86400000)
}

// ─── Verifica se já enviou esse template recentemente ─────────────────────────
async function jaEnviouRecentemente(
  supabase: ReturnType<typeof createClient>,
  alunoId: string,
  templateKey: string,
  diasJanela: number
): Promise<boolean> {
  const limite = new Date(Date.now() - diasJanela * 86400000).toISOString()
  const { data } = await supabase
    .from('disparo_fila')
    .select('id')
    .eq('destinatario_id', alunoId)
    .eq('template_key', templateKey)
    .in('status', ['enviado', 'pendente'])
    .gte('created_at', limite)
    .limit(1)
  return (data?.length ?? 0) > 0
}

// ─── Enfileira mensagem ───────────────────────────────────────────────────────
async function enfileirar(
  supabase: ReturnType<typeof createClient>,
  boxId: string,
  alunoId: string,
  templateKey: string,
  payload: Record<string, unknown>
) {
  await supabase.from('disparo_fila').insert({
    box_id:            boxId,
    destinatario_tipo: 'aluno',
    destinatario_id:   alunoId,
    canal:             'whatsapp',
    template_key:      templateKey,
    payload,
    agendado_para:     new Date().toISOString(),
    status:            'pendente',
  })
}

// ─── Enfileira alerta para o dono ─────────────────────────────────────────────
async function alertarDono(
  supabase: ReturnType<typeof createClient>,
  boxId: string,
  templateKey: string,
  payload: Record<string, unknown>
) {
  await supabase.from('disparo_fila').insert({
    box_id:            boxId,
    destinatario_tipo: 'dono',
    destinatario_id:   boxId,
    canal:             'whatsapp',
    template_key:      templateKey,
    payload,
    agendado_para:     new Date().toISOString(),
    status:            'pendente',
  })
}

// ─── Servidor ─────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const resultado = {
    faltas_3:         0,
    faltas_5:         0,
    renovacoes_7d:    0,
    renovacoes_1d:    0,
    inadimplentes:    0,
    status_atualizados: 0,
    candidatos_indicacao: 0,
  }

  try {
    const dataHoje = hoje()

    // Busca todos os boxes ativos
    const { data: boxes } = await supabase
      .from('boxes')
      .select('id, nome, slug')
      .eq('ativo', true)

    if (!boxes?.length) {
      return new Response(JSON.stringify({ ok: true, msg: 'Nenhum box ativo', ...resultado }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    for (const box of boxes) {
      const boxId = box.id as string
      const boxNome = box.nome as string

      // Busca todos os alunos ativos + inadimplentes do box
      const { data: alunos } = await supabase
        .from('alunos')
        .select('id, nome, whatsapp, status, plano, data_vencimento, faltas_consecutivas, nps_score, opt_out, data_inicio, created_at')
        .eq('box_id', boxId)
        .in('status', ['ativo', 'inadimplente'])
        .eq('opt_out', false)

      if (!alunos?.length) continue

      // ─── MÓDULO 1: Faltas consecutivas ──────────────────────────────────────
      for (const aluno of alunos) {
        // Só verifica faltas para alunos ativos (não inadimplentes)
        if (aluno.status !== 'ativo') continue

        // Busca a última presença
        const { data: presencas } = await supabase
          .from('presencas')
          .select('data_presenca')
          .eq('aluno_id', aluno.id)
          .order('data_presenca', { ascending: false })
          .limit(1)

        const ultimaPresenca = presencas?.[0]?.data_presenca

        // Se nunca teve presença, usa data de cadastro
        const referenciaData = ultimaPresenca || aluno.data_inicio || aluno.created_at?.split('T')[0]
        const diasSemPresenca = diasDesde(referenciaData)

        // Atualiza faltas_consecutivas no banco
        if (diasSemPresenca !== aluno.faltas_consecutivas) {
          await supabase
            .from('alunos')
            .update({ faltas_consecutivas: diasSemPresenca })
            .eq('id', aluno.id)
        }

        const vars = {
          nome: aluno.nome,
          box_nome: boxNome,
          faltas: diasSemPresenca,
        }

        // 3 dias sem presença → aviso "Sumiu?"
        if (diasSemPresenca >= 3 && diasSemPresenca < 5) {
          const jaEnviou = await jaEnviouRecentemente(supabase, aluno.id, 'retencao_3_faltas', 7)
          if (!jaEnviou) {
            await enfileirar(supabase, boxId, aluno.id, 'retencao_3_faltas', vars)

            // Notificação no painel
            await supabase.from('notificacoes').insert({
              box_id: boxId,
              tipo: 'risco_cancelamento',
              titulo: `⚠️ ${aluno.nome} faltou ${diasSemPresenca} dias`,
              corpo: `${aluno.nome} está sem aparecer há ${diasSemPresenca} dias. Mensagem de retenção enviada.`,
              payload: { aluno_id: aluno.id },
              lida: false,
            })

            resultado.faltas_3++
          }
        }

        // 5+ dias sem presença → aviso crítico
        if (diasSemPresenca >= 5) {
          const jaEnviou = await jaEnviouRecentemente(supabase, aluno.id, 'retencao_5_faltas', 7)
          if (!jaEnviou) {
            await enfileirar(supabase, boxId, aluno.id, 'retencao_5_faltas', vars)

            // Alerta para o dono
            await alertarDono(supabase, boxId, 'alerta_aluno_mensagem', {
              nome: aluno.nome,
              box_nome: boxNome,
              whatsapp: aluno.whatsapp,
              status_aluno: `⚠️ CRÍTICO — ${diasSemPresenca} dias sem treinar`,
              mensagem_original: `Aluno em risco crítico de cancelamento!`,
            })

            // Notificação no painel
            await supabase.from('notificacoes').insert({
              box_id: boxId,
              tipo: 'risco_cancelamento',
              titulo: `🔴 CRÍTICO: ${aluno.nome} — ${diasSemPresenca} dias sem treinar`,
              corpo: `Risco crítico de cancelamento. Contato direto recomendado!`,
              payload: { aluno_id: aluno.id },
              lida: false,
            })

            resultado.faltas_5++
          }
        }
      }

      // ─── MÓDULO 2: Vencimentos próximos ─────────────────────────────────────
      const data7Dias = addDias(dataHoje, 7)
      const data1Dia  = addDias(dataHoje, 1)

      for (const aluno of alunos) {
        if (!aluno.data_vencimento) continue

        const vars = {
          nome: aluno.nome,
          box_nome: boxNome,
          dias_vencimento: 7,
          data_vencimento: new Date(aluno.data_vencimento).toLocaleDateString('pt-BR'),
        }

        // Vence em 7 dias
        if (aluno.data_vencimento === data7Dias && aluno.status === 'ativo') {
          const jaEnviou = await jaEnviouRecentemente(supabase, aluno.id, 'renovacao_7_dias', 6)
          if (!jaEnviou) {
            await enfileirar(supabase, boxId, aluno.id, 'renovacao_7_dias', vars)
            resultado.renovacoes_7d++
          }
        }

        // Vence amanhã
        if (aluno.data_vencimento === data1Dia && aluno.status === 'ativo') {
          const jaEnviou = await jaEnviouRecentemente(supabase, aluno.id, 'renovacao_1_dia', 2)
          if (!jaEnviou) {
            await enfileirar(supabase, boxId, aluno.id, 'renovacao_1_dia', {
              ...vars,
              dias_vencimento: 1,
            })
            resultado.renovacoes_1d++
          }
        }
      }

      // ─── MÓDULO 3: Inadimplentes ─────────────────────────────────────────────
      for (const aluno of alunos) {
        if (!aluno.data_vencimento) continue

        const vencido = aluno.data_vencimento < dataHoje

        // Aluno ativo com vencimento passado → marca inadimplente
        if (vencido && aluno.status === 'ativo') {
          await supabase
            .from('alunos')
            .update({ status: 'inadimplente' })
            .eq('id', aluno.id)

          await supabase.from('notificacoes').insert({
            box_id: boxId,
            tipo: 'inadimplencia',
            titulo: `💸 ${aluno.nome} está inadimplente`,
            corpo: `Plano venceu em ${new Date(aluno.data_vencimento).toLocaleDateString('pt-BR')} e não foi renovado.`,
            payload: { aluno_id: aluno.id },
            lida: false,
          })

          resultado.status_atualizados++
        }

        // Inadimplente → envia cobrança amigável (1x por semana)
        if (vencido) {
          const jaEnviou = await jaEnviouRecentemente(supabase, aluno.id, 'renovacao_inadimplente', 7)
          if (!jaEnviou) {
            await enfileirar(supabase, boxId, aluno.id, 'renovacao_inadimplente', {
              nome: aluno.nome,
              box_nome: boxNome,
            })
            resultado.inadimplentes++
          }
        }
      }

      // ─── MÓDULO 4: Candidatos a indicação ────────────────────────────────────
      for (const aluno of alunos) {
        if (aluno.status !== 'ativo') continue

        const mesesDeCasa = diasDesde(aluno.data_inicio || aluno.created_at?.split('T')[0]) / 30
        const npsOk = aluno.nps_score >= 5
        const tempoOk = mesesDeCasa >= 3

        if ((npsOk || tempoOk) && aluno.nps_score !== null) {
          const jaEnviou = await jaEnviouRecentemente(supabase, aluno.id, 'indicacao_convertida', 90)
          if (!jaEnviou) {
            // Nota: usamos indicacao_convertida como base mas o texto é de convite
            // O template certo seria "convite_indicacao" — por ora usamos o existente
            resultado.candidatos_indicacao++
          }
        }
      }
    }

    console.log('[retencao-alunos] Resultado:', resultado)

    return new Response(JSON.stringify({ ok: true, data: dataHoje, ...resultado }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('[retencao-alunos] Erro:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
