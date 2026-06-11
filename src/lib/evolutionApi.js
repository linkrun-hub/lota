/**
 * src/lib/evolutionApi.js
 * Integração real com a Evolution API (WhatsApp multi-tenant)
 * Docs: https://doc.evolution-api.com
 */

const BASE_URL = import.meta.env.VITE_EVOLUTION_API_URL
const API_KEY  = import.meta.env.VITE_EVOLUTION_API_KEY

const headers = {
  'Content-Type': 'application/json',
  'apikey': API_KEY,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function request(method, path, body = null) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Evolution API [${res.status}]: ${err}`)
  }
  return res.json()
}

// ─── Instâncias ───────────────────────────────────────────────────────────────

/**
 * Cria uma instância para um box (se não existir).
 * @param {string} slug - slug do box (ex: "bravefit")
 */
export async function criarInstancia(slug) {
  return request('POST', '/instance/create', {
    instanceName: slug,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
  })
}

/**
 * Retorna o QR Code (base64) para conexão.
 * @param {string} slug
 * @returns {{ base64: string } | null}
 */
export async function getQrCode(slug) {
  try {
    const data = await request('GET', `/instance/connect/${slug}`)
    return data // { pairingCode, code, base64, count }
  } catch {
    // Instância pode não existir ainda — cria e tenta de novo
    await criarInstancia(slug)
    return request('GET', `/instance/connect/${slug}`)
  }
}

/**
 * Verifica o estado da conexão de uma instância.
 * @param {string} slug
 * @returns {'open' | 'close' | 'connecting'}
 */
export async function getStatusConexao(slug) {
  try {
    const data = await request('GET', `/instance/connectionState/${slug}`)
    return data?.instance?.state || 'close'
  } catch {
    return 'close'
  }
}

/**
 * Desconecta (logout) uma instância.
 * @param {string} slug
 */
export async function desconectarInstancia(slug) {
  return request('DELETE', `/instance/logout/${slug}`)
}

/**
 * Lista todas as instâncias existentes.
 */
export async function listarInstancias() {
  return request('GET', '/instance/fetchInstances')
}

// ─── Mensagens ────────────────────────────────────────────────────────────────

/**
 * Envia mensagem de texto via WhatsApp.
 * @param {string} slug     - instância do box
 * @param {string} numero   - número E.164 (ex: 5531988001122)
 * @param {string} texto    - corpo da mensagem
 */
export async function enviarMensagem(slug, numero, texto) {
  // Remove caracteres não numéricos do número
  const to = numero.replace(/\D/g, '')
  return request('POST', `/message/sendText/${slug}`, {
    number: to,
    text: texto,
  })
}

/**
 * Envia mensagem com botões (template).
 * @param {string} slug
 * @param {string} numero
 * @param {object} template - { title, description, footer, buttons }
 */
export async function enviarMensagemComBotoes(slug, numero, template) {
  const to = numero.replace(/\D/g, '')
  return request('POST', `/message/sendButtons/${slug}`, {
    number: to,
    ...template,
  })
}

// ─── Webhook ──────────────────────────────────────────────────────────────────

/**
 * Configura o webhook de uma instância para receber mensagens.
 * @param {string} slug
 * @param {string} webhookUrl - URL pública do Supabase Edge Function
 */
export async function configurarWebhook(slug, webhookUrl) {
  return request('POST', `/webhook/set/${slug}`, {
    url: webhookUrl,
    webhook_by_events: true,
    webhook_base64: false,
    events: [
      'MESSAGES_UPSERT',
      'CONNECTION_UPDATE',
      'QRCODE_UPDATED',
    ],
  })
}
