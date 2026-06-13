/**
 * supabase/functions/radar-marketing/index.ts
 * Bloco ISCA V1 (Fase 4) — Radar de Oportunidades.
 *
 * Varre os dados de cada box ativo e gera "iscas": sugestões de post
 * (ideia + legenda pronta) baseadas na operação real. Sem IA externa na V1 —
 * templates determinísticos com os dados preenchidos. Dedupe por origem_dado.
 *
 * Cron: diário 8h BRT (11h UTC).
 * Deploy: npx supabase functions deploy radar-marketing --project-ref favryvjzvfdqlftkyhpi --no-verify-jwt
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

interface Isca {
  origem_dado: string
  tipo: string
  ideia: string
  legenda: string
}

const hojeISO = () => new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10) // data BRT

// ─── Regra 1: prova social (conversões nos últimos 30 dias) ───────────────────
async function regraProvaSocial(boxId: string, boxNome: string, cliente: string): Promise<Isca | null> {
  const desde = new Date(Date.now() - 30 * 86400000).toISOString()
  const { count } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .eq('box_id', boxId).eq('status', 'convertido').gte('updated_at', desde)
  if ((count ?? 0) < 3) return null

  const mes = new Date().toLocaleDateString('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' })
  return {
    origem_dado: `prova-social-${hojeISO().slice(0, 7)}`,
    tipo: 'prova_social',
    ideia: `${count} novos ${cliente.toLowerCase()}s nos últimos 30 dias — prova social forte`,
    legenda: `${count} pessoas decidiram mudar de vida com a gente em ${mes}! 🔥\n\nCada matrícula é uma história que começa. A próxima pode ser a sua!\n\n👉 Chama no WhatsApp e vem fazer uma aula experimental.\n\n#${boxNome.replace(/\s/g, '')} #treino #resultado`,
  }
}

// ─── Regra 2: depoimento (NPS 9-10 com comentário, últimos 14 dias) ──────────
async function regraDepoimento(boxId: string, boxNome: string): Promise<Isca | null> {
  const desde = new Date(Date.now() - 14 * 86400000).toISOString()
  const { data } = await supabase
    .from('nps_respostas')
    .select('id, aluno_nome, score, comentario')
    .eq('box_id', boxId).gte('score', 9).gte('created_at', desde)
    .not('comentario', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
  const r = data?.[0]
  if (!r || !r.comentario?.trim()) return null

  const primeiroNome = (r.aluno_nome ?? 'Aluno').split(' ')[0]
  return {
    origem_dado: `depoimento-${r.id}`,
    tipo: 'depoimento',
    ideia: `${primeiroNome} deu nota ${r.score} com comentário — pedir autorização e postar`,
    legenda: `"${r.comentario.trim()}" — ${primeiroNome} ⭐${r.score}/10\n\nÉ pra isso que a gente trabalha todos os dias. Obrigado pela confiança! 🙏\n\n(⚠️ IMPORTANTE: peça autorização do ${primeiroNome} antes de postar!)\n\n#depoimento #${boxNome.replace(/\s/g, '')}`,
  }
}

// ─── Regra 3: vagas de amanhã (slots livres na agenda) ────────────────────────
async function regraVagas(boxId: string, boxNome: string): Promise<Isca | null> {
  const amanha = new Date(Date.now() + 86400000 - 3 * 3600000).toISOString().slice(0, 10)
  const diaSemana = new Date(`${amanha}T12:00:00Z`).getUTCDay()

  const { data: servicos } = await supabase
    .from('services').select('id, nome, capacidade').eq('box_id', boxId).eq('ativo', true)
  if (!servicos?.length) return null

  for (const svc of servicos) {
    const { data: janelas } = await supabase
      .from('availability').select('hora_inicio, vagas')
      .eq('service_id', svc.id).eq('dia_semana', diaSemana).limit(1)
    const j = janelas?.[0]
    if (!j) continue

    const { count: ocupadas } = await supabase
      .from('appointments').select('id', { count: 'exact', head: true })
      .eq('service_id', svc.id)
      .gte('data_hora', `${amanha}T00:00:00Z`).lte('data_hora', `${amanha}T23:59:59Z`)
      .in('status', ['agendado', 'confirmado'])
    const cap = j.vagas ?? svc.capacidade
    const livres = cap - (ocupadas ?? 0)
    if (livres <= 0) continue

    const hora = String(j.hora_inicio).slice(0, 5)
    return {
      origem_dado: `vagas-${amanha}-${svc.id}`,
      tipo: 'vagas',
      ideia: `${livres} vaga(s) amanhã às ${hora} em ${svc.nome} — post de urgência`,
      legenda: `⏰ ÚLTIMAS ${livres} VAGAS pra amanhã!\n\n${svc.nome} às ${hora} no ${boxNome}.\n\nGaranta a sua agora 👉 link na bio ou chama no WhatsApp!\n\n#vagaslimitadas #${boxNome.replace(/\s/g, '')}`,
    }
  }
  return null
}

// ─── Regra 4: aniversário de jornada (cliente completando 1+ ano no mês) ─────
async function regraAniversario(boxId: string, boxNome: string, cliente: string): Promise<Isca | null> {
  const hoje = new Date()
  const mes = hoje.getMonth() + 1
  const { data: alunos } = await supabase
    .from('alunos').select('id, nome, data_inicio')
    .eq('box_id', boxId).eq('status', 'ativo')
  const aniversariante = (alunos ?? []).find((a) => {
    if (!a.data_inicio) return false
    const ini = new Date(a.data_inicio)
    const anos = hoje.getFullYear() - ini.getFullYear()
    return ini.getMonth() + 1 === mes && anos >= 1
  })
  if (!aniversariante) return null

  const ini = new Date(aniversariante.data_inicio)
  const anos = hoje.getFullYear() - ini.getFullYear()
  const primeiroNome = aniversariante.nome.split(' ')[0]
  return {
    origem_dado: `aniversario-${aniversariante.id}-${hoje.getFullYear()}`,
    tipo: 'sazonal',
    ideia: `${primeiroNome} completa ${anos} ano(s) de ${boxNome} esse mês — post de celebração`,
    legenda: `🎉 ${anos} ANO${anos > 1 ? 'S' : ''} DE CASA!\n\nEsse mês o ${primeiroNome} completa ${anos} ano${anos > 1 ? 's' : ''} como ${cliente.toLowerCase()} do ${boxNome}. Constância é tudo! 👏\n\n(marca ele no post e pede autorização antes 😉)\n\n#aniversario #constancia #${boxNome.replace(/\s/g, '')}`,
  }
}

// ─── Regra 5: pauta semanal por dia (sempre tem o que postar) ─────────────────
function regraPautaSemanal(boxNome: string, cliente: string): Isca {
  const dia = new Date(Date.now() - 3 * 3600000).getUTCDay()
  const pautas: Record<number, [string, string, string]> = {
    1: ['segunda-motivacao', 'Segunda: post de motivação pra começar a semana',
        `Segunda-feira é o dia favorito de quem tem objetivo. 💪\n\nComeça hoje. Daqui a 3 meses você vai agradecer.\n\n👉 Aula experimental gratuita — chama no WhatsApp!`],
    2: ['terca-bastidor', 'Terça: bastidores do dia a dia',
        `Bastidores de hoje no ${boxNome} 🎬\n\nMostra um treino, a equipe ou a estrutura — gente compra de gente!`],
    3: ['quarta-dica', 'Quarta: dica técnica rápida',
        `DICA DO DIA 💡\n\nGrave um vídeo de 30s com uma dica prática da sua área. Conteúdo que ensina = autoridade que vende.`],
    4: ['quinta-resultado', 'Quinta: antes/depois ou caso de sucesso',
        `Resultado fala mais que promessa. 📊\n\nPoste um antes/depois ou a evolução de um ${cliente.toLowerCase()} (com autorização!).`],
    5: ['sexta-convite', 'Sexta: convite pro fim de semana',
        `Sextou no ${boxNome}! 🎉\n\nBora fechar a semana com chave de ouro? Tem horário livre amanhã — chama no WhatsApp!`],
  }
  const p = pautas[dia] ?? pautas[1]
  return {
    origem_dado: `pauta-${hojeISO()}`,
    tipo: 'sazonal',
    ideia: p[1],
    legenda: p[2],
  }
}

// ─── Processa um box ──────────────────────────────────────────────────────────
async function processarBox(box: Record<string, unknown>): Promise<number> {
  const boxId = box.id as string
  const boxNome = box.nome as string

  // terminologia do vertical (Cliente vs Aluno)
  const { data: vert } = await supabase
    .from('verticals').select('terminologia').eq('slug', (box.vertical as string) ?? 'crossfit').maybeSingle()
  const cliente = (vert?.terminologia as Record<string, string>)?.cliente ?? 'Aluno'

  const candidatas = (await Promise.all([
    regraProvaSocial(boxId, boxNome, cliente),
    regraDepoimento(boxId, boxNome),
    regraVagas(boxId, boxNome),
    regraAniversario(boxId, boxNome, cliente),
  ])).filter(Boolean) as Isca[]
  candidatas.push(regraPautaSemanal(boxNome, cliente))

  let criadas = 0
  for (const isca of candidatas) {
    const { error } = await supabase.from('iscas').insert({ box_id: boxId, ...isca })
    if (!error) criadas++ // conflito de origem_dado = já sugerida antes (dedupe)
  }

  // Aviso no WhatsApp do dono (1x por dia, só se criou isca nova)
  if (criadas > 0) {
    await supabase.from('disparo_fila').insert({
      box_id: boxId,
      destinatario_tipo: 'dono',
      destinatario_id: boxId,
      canal: 'whatsapp',
      template_key: 'isca_pronta',
      payload: { quantidade: criadas, box_nome: boxNome },
      agendado_para: new Date().toISOString(),
      status: 'pendente',
    })
  }
  return criadas
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { data: boxes } = await supabase
      .from('boxes').select('id, nome, vertical, slug').eq('ativo', true)

    const resultado: Record<string, number> = {}
    for (const box of boxes ?? []) {
      resultado[box.slug as string] = await processarBox(box)
    }

    return new Response(JSON.stringify({ ok: true, iscas_criadas: resultado }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
