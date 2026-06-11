/**
 * src/lib/supabase.js
 * Cliente Supabase — instância única compartilhada em toda a aplicação
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '❌ Variáveis de ambiente Supabase não encontradas.\n' +
    'Crie o arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

/**
 * Helper — lança erro com mensagem clara em caso de falha do Supabase
 */
export function assertOk({ data, error }, msg = 'Erro na operação') {
  if (error) {
    console.error(`[Supabase] ${msg}:`, error)
    throw new Error(error.message || msg)
  }
  return data
}
