/**
 * scripts/backup-dados.mjs
 * Backup lógico de TODOS os dados do Supabase via REST API (PostgREST).
 *
 * Uso (PowerShell):
 *   $env:SUPABASE_SERVICE_KEY = "<service role key do painel Supabase>"
 *   node scripts/backup-dados.mjs
 *
 * Saída: ../backups/backup-AAAA-MM-DD-HHmm/<tabela>.json  (fora do repositório git)
 * O schema (DDL) já está versionado em supabase/migrations/ — aqui salvamos os DADOS.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const URL = 'https://favryvjzvfdqlftkyhpi.supabase.co'
const KEY = process.env.SUPABASE_SERVICE_KEY

if (!KEY) {
  console.error('ERRO: defina $env:SUPABASE_SERVICE_KEY antes de rodar.')
  process.exit(1)
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` }

// Lista de tabelas via OpenAPI spec do PostgREST
const spec = await (await fetch(`${URL}/rest/v1/`, { headers })).json()
const tabelas = Object.keys(spec.definitions ?? {})
if (!tabelas.length) {
  console.error('ERRO: nenhuma tabela encontrada — chave inválida?')
  process.exit(1)
}

const stamp = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '')
const dir = join(import.meta.dirname, '..', '..', 'backups', `backup-${stamp}`)
mkdirSync(dir, { recursive: true })

let totalLinhas = 0
for (const tabela of tabelas) {
  // Pagina de 1000 em 1000 até esgotar
  const linhas = []
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(
      `${URL}/rest/v1/${tabela}?select=*&limit=1000&offset=${offset}`,
      { headers }
    )
    if (!res.ok) {
      console.warn(`  AVISO: ${tabela} → HTTP ${res.status} (pulada)`)
      break
    }
    const page = await res.json()
    linhas.push(...page)
    if (page.length < 1000) break
  }
  writeFileSync(join(dir, `${tabela}.json`), JSON.stringify(linhas, null, 1))
  console.log(`  ${tabela}: ${linhas.length} linhas`)
  totalLinhas += linhas.length
}

console.log(`\nBackup completo: ${tabelas.length} tabelas, ${totalLinhas} linhas`)
console.log(`Pasta: ${dir}`)
