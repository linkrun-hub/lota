/**
 * scripts/seed-demo.mjs
 * Cria o tenant "LOTA Demo" (slug: demo) com dados fictícios para testes.
 * Idempotente: se o box demo já existe, não duplica.
 *
 * Uso (PowerShell):
 *   $env:SUPABASE_SERVICE_KEY = "<service role key>"
 *   node scripts/seed-demo.mjs
 *
 * Segurança: ao final, TODOS os disparos pendentes do demo são cancelados —
 * o demo nunca envia WhatsApp/e-mail real (instância Evolution "demo" não existe).
 */

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
  Prefer: 'return=representation',
}

async function rest(method, path, body) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  return text ? JSON.parse(text) : null
}

// 1. Box demo (idempotente)
const existente = await rest('GET', 'boxes?slug=eq.demo&select=id')
let boxId
if (existente.length) {
  boxId = existente[0].id
  console.log(`Box demo já existe: ${boxId}`)
} else {
  const [box] = await rest('POST', 'boxes', {
    nome: 'LOTA Demo',
    slug: 'demo',
    dono_nome: 'Tester LOTA',
    dono_whatsapp: '+5500999999999',
    dono_email: 'demo@lota.app.br',
    plano: 'pro',
    limite_msgs_dia: 30,
    ativo: true,
  })
  boxId = box.id
  console.log(`Box demo criado: ${boxId}`)
}

// 2. Leads fictícios (números reservados — nunca entregam mensagem real)
const leadsDemo = [
  { nome: 'Ana Teste',    whatsapp: '+5500000000001', origem: 'whatsapp',     status: 'novo',        momento_compra: 'agora',      lgpd_consent: true },
  { nome: 'Bruno Teste',  whatsapp: '+5500000000002', origem: 'landing_page', status: 'em_conversa', momento_compra: 'em_breve',   lgpd_consent: true },
  { nome: 'Carla Teste',  whatsapp: '+5500000000003', origem: 'indicacao',    status: 'qualificado', momento_compra: 'comparando', lgpd_consent: true },
  { nome: 'Diego Teste',  whatsapp: '+5500000000004', origem: 'manual',       status: 'agendado',    momento_compra: 'agora',      lgpd_consent: true },
  { nome: 'Elisa Teste',  whatsapp: '+5500000000005', origem: 'whatsapp',     status: 'convertido',  momento_compra: 'agora',      lgpd_consent: true },
  { nome: 'Fabio Teste',  whatsapp: '+5500000000006', origem: 'whatsapp',     status: 'perdido',     momento_compra: 'comparando', lgpd_consent: false },
]

const jaTemLeads = await rest('GET', `leads?box_id=eq.${boxId}&select=id&limit=1`)
if (jaTemLeads.length) {
  console.log('Leads demo já existem — pulando')
} else {
  const criados = await rest('POST', 'leads', leadsDemo.map((l) => ({ ...l, box_id: boxId })))
  console.log(`${criados.length} leads demo criados`)
}

// 3. Alunos fictícios
const hoje = new Date()
const emDias = (n) => new Date(hoje.getTime() + n * 86400000).toISOString().slice(0, 10)

const alunosDemo = [
  { nome: 'Gui Teste',    whatsapp: '+5500000000007', status: 'ativo',        plano: 'Mensal',     valor_mensalidade: 250, dia_vencimento: 10, data_inicio: emDias(-90),  data_vencimento: emDias(28), faltas_consecutivas: 0 },
  { nome: 'Helena Teste', whatsapp: '+5500000000008', status: 'ativo',        plano: 'Trimestral', valor_mensalidade: 220, dia_vencimento: 5,  data_inicio: emDias(-200), data_vencimento: emDias(5),  faltas_consecutivas: 4 },
  { nome: 'Igor Teste',   whatsapp: '+5500000000009', status: 'inadimplente', plano: 'Mensal',     valor_mensalidade: 250, dia_vencimento: 15, data_inicio: emDias(-60),  data_vencimento: emDias(-10), faltas_consecutivas: 7 },
]

const jaTemAlunos = await rest('GET', `alunos?box_id=eq.${boxId}&select=id&limit=1`)
if (jaTemAlunos.length) {
  console.log('Alunos demo já existem — pulando')
} else {
  try {
    const criados = await rest('POST', 'alunos', alunosDemo.map((a) => ({ ...a, box_id: boxId })))
    console.log(`${criados.length} alunos demo criados`)
  } catch (err) {
    // Colunas podem divergir do schema real — reportar sem abortar (leads são o essencial)
    console.warn(`AVISO alunos: ${err.message}`)
  }
}

// 4. SEGURANÇA: cancela qualquer disparo pendente gerado por triggers do demo
const cancelados = await rest(
  'PATCH',
  `disparo_fila?box_id=eq.${boxId}&status=eq.pendente`,
  { status: 'cancelado', erro_detalhes: 'Tenant demo — envio real desabilitado' }
)
console.log(`${cancelados?.length ?? 0} disparos pendentes do demo cancelados`)

// 5. Pausa sequências de follow-up criadas por trigger
const leadsDoDemo = await rest('GET', `leads?box_id=eq.${boxId}&select=id`)
const ids = leadsDoDemo.map((l) => l.id).join(',')
if (ids) {
  const pausadas = await rest(
    'PATCH',
    `follow_up_sequencias?lead_id=in.(${ids})&status=eq.ativo`,
    { status: 'pausado' }
  )
  console.log(`${pausadas?.length ?? 0} sequências de follow-up do demo pausadas`)
}

console.log('\nTenant LOTA Demo pronto. box_id: ' + boxId)
