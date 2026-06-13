/**
 * supabase/functions/admin/index.ts
 *
 * Operações administrativas da plataforma — APENAS super_admin.
 * O frontend /admin é só uma casca: toda a lógica vive aqui (Regra 9).
 * Toda ação é registrada em audit_logs (Regra 10).
 *
 * Deploy: npx supabase functions deploy admin --project-ref favryvjzvfdqlftkyhpi --no-verify-jwt
 * (a verificação de papel é feita aqui dentro, via JWT do chamador)
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

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const EVOLUTION_URL = Deno.env.get('EVOLUTION_API_URL') ?? ''
const EVOLUTION_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? ''

// ─── Autorização: só super_admin passa ────────────────────────────────────────
async function autorizar(req: Request): Promise<{ userId: string } | Response> {
  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  if (!jwt) return json({ error: 'Não autenticado' }, 401)

  const { data: { user }, error } = await admin.auth.getUser(jwt)
  if (error || !user) return json({ error: 'Sessão inválida' }, 401)

  const { data: profile } = await admin
    .from('profiles')
    .select('papel, ativo')
    .eq('id', user.id)
    .single()

  if (!profile || profile.papel !== 'super_admin' || !profile.ativo) {
    return json({ error: 'Acesso negado' }, 403)
  }
  return { userId: user.id }
}

async function auditar(adminUserId: string, acao: string, boxIdAlvo: string | null, detalhes: Record<string, unknown> = {}) {
  await admin.from('audit_logs').insert({
    admin_user_id: adminUserId,
    acao,
    box_id_alvo: boxIdAlvo,
    detalhes,
  })
}

// ─── Saúde do WhatsApp por instância ──────────────────────────────────────────
async function statusWhatsApp(slug: string): Promise<string> {
  if (!EVOLUTION_URL) return 'desconhecido'
  try {
    const res = await fetch(`${EVOLUTION_URL}/instance/connectionState/${slug}`, {
      headers: { apikey: EVOLUTION_KEY },
    })
    if (!res.ok) return 'sem_instancia'
    const data = await res.json()
    return data?.instance?.state ?? 'desconhecido'
  } catch {
    return 'erro'
  }
}

// ─── Ação: lista de tenants com saúde ─────────────────────────────────────────
async function listarTenants() {
  const { data: boxes } = await admin
    .from('boxes')
    .select('id, nome, slug, plano, ativo, dono_nome, dono_email, created_at')
    .order('created_at', { ascending: true })
  if (!boxes) return json({ tenants: [] })

  const desde24h = new Date(Date.now() - 86400000).toISOString()

  const tenants = await Promise.all(boxes.map(async (box) => {
    const [leads, alunos, falhas, whatsapp, profiles] = await Promise.all([
      admin.from('leads').select('id', { count: 'exact', head: true }).eq('box_id', box.id),
      admin.from('alunos').select('id', { count: 'exact', head: true }).eq('box_id', box.id),
      admin.from('disparo_fila').select('id', { count: 'exact', head: true })
        .eq('box_id', box.id).eq('status', 'falhou').gte('created_at', desde24h),
      statusWhatsApp(box.slug),
      admin.from('profiles').select('id, nome, papel, ativo').eq('box_id', box.id),
    ])
    return {
      ...box,
      leads_total: leads.count ?? 0,
      alunos_total: alunos.count ?? 0,
      falhas_fila_24h: falhas.count ?? 0,
      whatsapp_status: whatsapp,
      usuarios: profiles.data ?? [],
    }
  }))

  return json({ tenants })
}

// ─── Ação: suspender/reativar tenant ──────────────────────────────────────────
async function toggleAtivo(userId: string, boxId: string, ativo: boolean) {
  const { error } = await admin.from('boxes').update({ ativo }).eq('id', boxId)
  if (error) return json({ error: error.message }, 500)
  await auditar(userId, ativo ? 'tenant_reativado' : 'tenant_suspenso', boxId)
  return json({ ok: true })
}

// ─── Ação: impersonation ("entrar como") ──────────────────────────────────────
async function impersonate(userId: string, boxId: string, redirectOrigin: string) {
  // Acha o dono do box
  const { data: profile } = await admin
    .from('profiles')
    .select('id, nome')
    .eq('box_id', boxId)
    .eq('papel', 'dono')
    .eq('ativo', true)
    .limit(1)
    .single()
  if (!profile) return json({ error: 'Box não tem usuário dono ativo' }, 404)

  const { data: userData } = await admin.auth.admin.getUserById(profile.id)
  const email = userData?.user?.email
  if (!email) return json({ error: 'Usuário sem e-mail' }, 404)

  const { data: link, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo: `${redirectOrigin}/?impersonado=1` },
  })
  if (error || !link) return json({ error: error?.message ?? 'Erro ao gerar link' }, 500)

  await auditar(userId, 'impersonation', boxId, { alvo_email: email })
  return json({ link: link.properties.action_link })
}

// ─── Ação: criar tenant (onboarding — Fase 7) ─────────────────────────────────
async function criarTenant(userId: string, p: Record<string, unknown>) {
  const email = String(p.dono_email ?? '').trim().toLowerCase()
  if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'E-mail do dono inválido' }, 400)

  // 1. Box completo via função SQL atômica (módulos + templates + retenção)
  const { data: boxId, error: errBox } = await admin.rpc('criar_tenant', {
    p_nome: String(p.nome ?? '').trim(),
    p_slug: String(p.slug ?? '').trim().toLowerCase(),
    p_vertical: String(p.vertical ?? 'crossfit'),
    p_dono_nome: String(p.dono_nome ?? '').trim(),
    p_dono_whatsapp: String(p.dono_whatsapp ?? '').trim(),
    p_dono_email: email,
  })
  if (errBox) return json({ error: errBox.message }, 400)

  // 2. Usuário dono + profile
  const senha = crypto.randomUUID().slice(0, 10) + '!Aa1'
  const { data: novoUser, error: errUser } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: String(p.dono_nome ?? '') },
  })
  if (errUser || !novoUser?.user) {
    return json({ error: `Box criado, mas falhou criar usuário: ${errUser?.message}`, box_id: boxId }, 500)
  }
  await admin.from('profiles').insert({
    id: novoUser.user.id,
    box_id: boxId,
    nome: String(p.dono_nome ?? ''),
    papel: 'dono',
    ativo: true,
  })

  await auditar(userId, 'tenant_criado', boxId as string, { slug: p.slug, vertical: p.vertical, dono_email: email })
  return json({ ok: true, box_id: boxId, email, senha_temporaria: senha })
}

// ─── Ação: reset de senha de usuário ──────────────────────────────────────────
async function resetSenha(userId: string, alvoUserId: string) {
  const temp = crypto.randomUUID().slice(0, 8) + '!Aa1'
  const { error } = await admin.auth.admin.updateUserById(alvoUserId, { password: temp })
  if (error) return json({ error: error.message }, 500)
  await auditar(userId, 'reset_senha', null, { alvo_user_id: alvoUserId })
  return json({ ok: true, senha_temporaria: temp })
}

// ═══ ESTÚDIO DE VERTICAIS (Fase config) ═══════════════════════════════════════

// Salva as dimensões editáveis de um vertical
async function salvarVertical(userId: string, p: Record<string, unknown>) {
  const slug = String(p.slug ?? '')
  if (!slug) return json({ error: 'Vertical não informado' }, 400)

  const patch: Record<string, unknown> = {}
  if (p.terminologia !== undefined) patch.terminologia = p.terminologia
  if (p.modulos_default !== undefined) patch.modulos_default = p.modulos_default
  if (p.ia_persona_default !== undefined) patch.ia_persona_default = p.ia_persona_default
  if (p.retencao_config !== undefined) patch.retencao_config = p.retencao_config
  if (p.financeiro_config !== undefined) patch.financeiro_config = p.financeiro_config
  if (p.funil_config !== undefined) patch.funil_config = p.funil_config
  if (p.momento_config !== undefined) patch.momento_config = p.momento_config
  if (Object.keys(patch).length === 0) return json({ error: 'Nada para salvar' }, 400)

  const { error } = await admin.from('verticals').update(patch).eq('slug', slug)
  if (error) return json({ error: error.message }, 500)
  await auditar(userId, 'vertical_editado', null, { slug, campos: Object.keys(patch) })
  return json({ ok: true })
}

// Upsert de um template do vertical
async function salvarVTemplate(userId: string, p: Record<string, unknown>) {
  const slug = String(p.vertical_slug ?? '')
  const key = String(p.key ?? '')
  if (!slug || !key) return json({ error: 'Dados incompletos' }, 400)
  const { error } = await admin.from('vertical_templates').upsert({
    vertical_slug: slug,
    key,
    nome: String(p.nome ?? key),
    texto: String(p.texto ?? ''),
    categoria: String(p.categoria ?? 'geral'),
    ativo: p.ativo !== false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'vertical_slug,key' })
  if (error) return json({ error: error.message }, 500)
  await auditar(userId, 'vtemplate_editado', null, { slug, key })
  return json({ ok: true })
}

async function excluirVTemplate(userId: string, p: Record<string, unknown>) {
  const { error } = await admin.from('vertical_templates')
    .delete().eq('vertical_slug', String(p.vertical_slug)).eq('key', String(p.key))
  if (error) return json({ error: error.message }, 500)
  await auditar(userId, 'vtemplate_excluido', null, { slug: p.vertical_slug, key: p.key })
  return json({ ok: true })
}

// Flag global (ex.: modo_configuracao)
async function setConfig(userId: string, chave: string, valor: unknown) {
  const { error } = await admin.from('app_config')
    .upsert({ chave, valor, updated_at: new Date().toISOString() }, { onConflict: 'chave' })
  if (error) return json({ error: error.message }, 500)
  await auditar(userId, 'config_alterada', null, { chave, valor })
  return json({ ok: true })
}

// ─── Router ───────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Método não suportado' }, 405)

  const auth = await autorizar(req)
  if (auth instanceof Response) return auth
  const { userId } = auth

  try {
    const body = await req.json()
    switch (body.action) {
      case 'tenants':      return await listarTenants()
      case 'criar-tenant': return await criarTenant(userId, body)
      case 'toggle-ativo': return await toggleAtivo(userId, body.box_id, !!body.ativo)
      case 'impersonate':  return await impersonate(userId, body.box_id, String(body.origin ?? ''))
      case 'reset-senha':  return await resetSenha(userId, body.user_id)
      case 'vertical-salvar':   return await salvarVertical(userId, body)
      case 'vtemplate-salvar':  return await salvarVTemplate(userId, body)
      case 'vtemplate-excluir': return await excluirVTemplate(userId, body)
      case 'config-set':        return await setConfig(userId, String(body.chave), body.valor)
      default:             return json({ error: 'Ação desconhecida' }, 400)
    }
  } catch (err) {
    console.error(err)
    return json({ error: 'Erro interno' }, 500)
  }
})
