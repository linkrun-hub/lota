/**
 * supabase/functions/_shared/templates.ts
 * Templates de mensagens WhatsApp do LOTA
 * Tom: caloroso, próximo, brasileiro — como o dono do box falaria
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface TemplateVars {
  nome?: string
  box_nome?: string
  faltas?: number
  data_vencimento?: string
  dias_vencimento?: number
  novos_leads?: number
  conversoes?: number
  alunos_risco?: number
  inadimplentes?: number
  renovacoes?: number
  data?: string
  mensagem_original?: string
  token?: string
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function t(template: string, vars: TemplateVars): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    String((vars as Record<string, unknown>)[key] ?? `{${key}}`)
  )
}

// ─── Templates ────────────────────────────────────────────────────────────────
export const TEMPLATES: Record<string, (vars: TemplateVars) => string> = {

  // ── Boas-vindas — lead que entrou via WhatsApp ─────────────────────────────
  lead_boas_vindas: (v) => t(
    `Oi {nome}! 😊\n\nQue bom que entrou em contato com o *{box_nome}*! 💪\n\nMe conta: você está buscando começar do zero, melhorar um treino que já faz ou tem algum objetivo específico em mente?\n\nAssim consigo te indicar o melhor plano pra você! 🏋️`,
    v
  ),

  // ── Follow-up momento "agora" ──────────────────────────────────────────────
  followup_agora_1: (v) => t(
    `{nome}, oi! 👋\n\nAinda temos horários disponíveis essa semana aqui no *{box_nome}*!\n\nQual seria o melhor horário pra você vir conhecer a estrutura? Sem compromisso! 😊`,
    v
  ),

  followup_agora_2: (v) => t(
    `{nome}! 🔥\n\nVocê sabia que quem começa esse mês no *{box_nome}* garante condições especiais?\n\nManda uma mensagem que te conto os detalhes! 😉`,
    v
  ),

  followup_agora_3: (v) => t(
    `{nome}, última chamada! ⏰\n\nTemos apenas algumas vagas disponíveis essa semana no *{box_nome}*.\n\nPosso reservar uma pra você? É só confirmar aqui! 💪`,
    v
  ),

  // ── Follow-up momento "em breve" ──────────────────────────────────────────
  followup_em_breve_1: (v) => t(
    `Oi {nome}! 😊\n\nEntendo que você quer se planejar. Aqui no *{box_nome}* temos opções pra todo tipo de agenda e orçamento.\n\nPosto te mandar mais informações sobre os planos?`,
    v
  ),

  followup_em_breve_2: (v) => t(
    `{nome}, tudo bem? 👋\n\nSó passando pra lembrar que no *{box_nome}* temos aulas em vários horários.\n\nQuando você se sentir pronto(a), estamos aqui! 💪`,
    v
  ),

  followup_em_breve_3: (v) => t(
    `{nome}! 🏋️\n\nPassei pra ver se consigo te ajudar com alguma dúvida sobre o *{box_nome}*.\n\nQualquer coisa é só chamar aqui! 😊`,
    v
  ),

  // ── Follow-up momento "comparando" ────────────────────────────────────────
  followup_comparando_1: (v) => t(
    `{nome}, boa tarde! ☀️\n\nAinda avaliando opções de treino?\n\nO *{box_nome}* tem uma estrutura completa e equipe dedicada. Que tal vir fazer uma aula experimental sem compromisso? 💪`,
    v
  ),

  followup_comparando_2: (v) => t(
    `Oi {nome}! 😊\n\nSempre que precisar tirar dúvidas sobre o *{box_nome}*, estou aqui!\n\nTemos planos flexíveis e você pode começar a qualquer momento. 🏋️`,
    v
  ),

  followup_comparando_3: (v) => t(
    `{nome}! 👋\n\nÚltima mensagem, prometo! 😄\n\nSe um dia decidir começar a treinar, o *{box_nome}* estará sempre de portas abertas pra você! 💪\n\nBoa semana!`,
    v
  ),

  // ── Retenção — alunos ──────────────────────────────────────────────────────
  retencao_3_faltas: (v) => t(
    `{nome}, sumiu! 😮\n\nFaz {faltas} dias que você não aparece aqui no *{box_nome}*...\n\nEstá tudo bem? Nossa equipe está sentindo sua falta!\n\nQualquer coisa pode contar com a gente! 💪`,
    v
  ),

  retencao_5_faltas: (v) => t(
    `{nome}! ⚠️\n\nEstamos preocupados com você! Faz {faltas} dias sem aparecer no *{box_nome}*.\n\nSe estiver passando por alguma dificuldade — financeira, de horário, qualquer coisa — vamos encontrar uma solução juntos.\n\nNão some não! 🙏`,
    v
  ),

  // ── Renovação ─────────────────────────────────────────────────────────────
  renovacao_7_dias: (v) => t(
    `Oi {nome}! 📅\n\nSeu plano no *{box_nome}* vence em *{dias_vencimento} dias* (dia {data_vencimento}).\n\nPara renovar é super simples — me chama aqui que resolvo em 2 minutinhos! 😊`,
    v
  ),

  renovacao_1_dia: (v) => t(
    `{nome}! ⏰\n\nSeu plano vence *amanhã* ({data_vencimento}) no *{box_nome}*.\n\nRenova agora pra não perder o ritmo! Me chama aqui! 💪`,
    v
  ),

  renovacao_inadimplente: (v) => t(
    `Oi {nome}! 😊\n\nPassando pra lembrar que seu plano no *{box_nome}* está em aberto.\n\nSabemos que às vezes aperta — pode contar com a gente pra encontrar uma solução! Me chama aqui. 🙏`,
    v
  ),

  // ── Indicação ─────────────────────────────────────────────────────────────
  indicacao_convertida: (v) => t(
    `{nome}! 🎉\n\nSua indicação funcionou! A pessoa que você indicou para o *{box_nome}* acabou de se matricular!\n\nMuito obrigado por confiar em nós e indicar um amigo. Você é incrível! 💪\n\nSeu benefício de indicação será aplicado na próxima renovação! 🎁`,
    v
  ),

  // ── Resumo diário (para o dono) ───────────────────────────────────────────
  resumo_diario_dono: (v) => t(
    `📊 *Resumo do dia — {box_nome}*\n*{data}*\n\n🔥 Novos leads: *{novos_leads}*\n✅ Conversões: *{conversoes}*\n⚠️ Alunos em risco: *{alunos_risco}*\n💰 Inadimplentes: *{inadimplentes}*\n📅 Renovações nos próx. 7 dias: *{renovacoes}*\n\nBom trabalho hoje! 💪\n_LOTA — Do WhatsApp à matrícula_`,
    v
  ),

  // ── Notificação de novo lead (para o dono) ────────────────────────────────
  alerta_lead_novo: (v) => t(
    `🔥 *Novo lead no {box_nome}!*\n\n👤 Nome: {nome}\n📱 WhatsApp: {mensagem_original}\n\nEntre no painel LOTA para ver os detalhes e qualificar este lead!\n_www.lota.app.br_`,
    v
  ),
}

/**
 * Retorna o texto de um template preenchido com as variáveis.
 */
export function getTemplate(key: string, vars: TemplateVars): string {
  const fn = TEMPLATES[key]
  if (!fn) return `[Template "${key}" não encontrado]`
  return fn(vars)
}

/**
 * Retorna a chave de follow-up com base no momento de compra e step.
 */
export function getFollowupKey(momento: string, step: number): string {
  const map: Record<string, string[]> = {
    agora:      ['followup_agora_1',      'followup_agora_2',      'followup_agora_3'],
    em_breve:   ['followup_em_breve_1',   'followup_em_breve_2',   'followup_em_breve_3'],
    comparando: ['followup_comparando_1', 'followup_comparando_2', 'followup_comparando_3'],
  }
  return map[momento]?.[step - 1] ?? 'followup_agora_1'
}

/**
 * Retorna quantas horas até o próximo step, baseado no momento de compra.
 */
export function getProximoDisparoHoras(momento: string, step: number): number {
  const map: Record<string, number[]> = {
    agora:      [1,   3,   24],
    em_breve:   [3,   24,  72],
    comparando: [24,  168, 336],
  }
  return map[momento]?.[step - 1] ?? 24
}
