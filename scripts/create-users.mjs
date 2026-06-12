/**
 * scripts/create-users.mjs
 * Cria os usuários reais do Supabase Auth + profiles (Fase 1).
 * RODAR SOMENTE APÓS a migration 010 (precisa da tabela profiles).
 * Idempotente: usuários/profiles existentes não são duplicados.
 *
 * Uso (PowerShell):
 *   $env:SUPABASE_SERVICE_KEY = "<service role key>"
 *   node scripts/create-users.mjs
 */
import { randomBytes } from 'node:crypto'

const URL = 'https://favryvjzvfdqlftkyhpi.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_KEY
if (!KEY) {
  console.error('ERRO: defina $env:SUPABASE_SERVICE_KEY antes de rodar.')
  process.exit(1)
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
}

async function adminApi(method, path, body) {
  const res = await fetch(`${URL}/auth/v1/admin/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`)
  return data
}

async function rest(method, path, body) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method,
    headers: { ...headers, Prefer: 'return=representation' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

const senhaForte = () => randomBytes(9).toString('base64url') + '!2'

async function buscarUsuario(email) {
  const data = await adminApi('GET', `users?page=1&per_page=100`)
  const users = data.users ?? data
  return users.find((u) => u.email === email) ?? null
}

async function criarUsuario({ email, nome, papel, boxSlug }) {
  let user = await buscarUsuario(email)
  let senha = null

  if (user) {
    console.log(`Usuário já existe: ${email} (${user.id})`)
  } else {
    senha = senhaForte()
    user = await adminApi('POST', 'users', {
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { nome },
    })
    console.log(`Usuário criado: ${email} (${user.id})`)
  }

  // Box do profile (null para super_admin sem box — aqui sempre tem box)
  let boxId = null
  if (boxSlug) {
    const [box] = await rest('GET', `boxes?slug=eq.${boxSlug}&select=id`)
    if (!box) throw new Error(`Box "${boxSlug}" não encontrado`)
    boxId = box.id
  }

  // Profile (idempotente)
  const existente = await rest('GET', `profiles?id=eq.${user.id}&select=id`)
  if (existente.length) {
    console.log(`  Profile já existe (papel mantido)`)
  } else {
    await rest('POST', 'profiles', { id: user.id, box_id: boxId, nome, papel, ativo: true })
    console.log(`  Profile criado: papel=${papel} box=${boxSlug ?? '—'}`)
  }

  return { email, senha }
}

console.log('── Criando usuários LOTA ──\n')

const resultados = []
resultados.push(await criarUsuario({
  email: 'leobergconsultoria@gmail.com',
  nome: 'Léo Berg',
  papel: 'super_admin',
  boxSlug: 'bravefit',
}))
resultados.push(await criarUsuario({
  email: 'demo@lota.app.br',
  nome: 'Tester LOTA',
  papel: 'dono',
  boxSlug: 'demo',
}))

console.log('\n── SENHAS TEMPORÁRIAS (anote e troque no primeiro acesso) ──')
for (const r of resultados) {
  console.log(r.senha ? `  ${r.email} → ${r.senha}` : `  ${r.email} → (senha existente mantida)`)
}
