/**
 * src/lib/publicoApi.js
 * Cliente da Edge Function "publico" — operações sem login.
 * As páginas públicas NÃO acessam o banco direto (RLS fechado na Fase 1);
 * tudo passa pela function, que valida e usa service role.
 */

const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publico`
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const headers = {
  'Content-Type': 'application/json',
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
}

async function get(params) {
  const res = await fetch(`${FUNC_URL}?${new URLSearchParams(params)}`, { headers })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro na operação')
  return data
}

async function post(body) {
  const res = await fetch(FUNC_URL, { method: 'POST', headers, body: JSON.stringify(body) })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro na operação')
  return data
}

export const getBoxPublico = (slug) => get({ action: 'box', slug })
export const getIndicacaoPublica = (token) => get({ action: 'indicacao', token })
export const criarLeadPublico = (payload) => post({ action: 'lead-publico', ...payload })
export const criarLeadIndicacao = (payload) => post({ action: 'lead-indicacao', ...payload })

// ─── Bloco Agenda (Fase 2) ────────────────────────────────────────────────────
export const getAgendaPublica = (slug) => get({ action: 'agenda', slug })
export const getSlotsPublicos = (slug, serviceId, data) =>
  get({ action: 'slots', slug, service_id: serviceId, data })
export const agendarPublico = (payload) => post({ action: 'agendar', ...payload })
export const entrarListaEspera = (payload) => post({ action: 'espera', ...payload })
