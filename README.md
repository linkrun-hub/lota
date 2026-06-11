# LOTA — Gestão comercial para boxes fitness

> Do WhatsApp à matrícula, automaticamente.

## Stack
- **Frontend:** React 19 + Vite + Tailwind CSS
- **Backend/DB:** Supabase (PostgreSQL + Auth + Realtime)
- **WhatsApp:** Evolution API (self-hosted)
- **Deploy:** Vercel

---

## Deploy no Vercel (via GitHub)

### 1. Suba o projeto no GitHub

```bash
cd "c:\Users\Team WOD Brasil\Desktop\FIT LEAD\fitlead-frontend"
git init
git add .
git commit -m "feat: LOTA v1.0 — deploy inicial"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/lota-frontend.git
git push -u origin main
```

### 2. Conecte ao Vercel
1. Acesse [vercel.com](https://vercel.com) → **New Project**
2. Importe o repositório `lota-frontend`
3. Framework: **Vite** (detectado automaticamente)
4. Build command: `npm run build`
5. Output directory: `dist`

### 3. Configure as variáveis de ambiente no Vercel
No painel do Vercel → Settings → Environment Variables, adicione:

| Variável | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://favryvjzvfdqlftkyhpi.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` (sua anon key) |
| `VITE_EVOLUTION_API_URL` | URL da sua Evolution API (após instalar) |
| `VITE_EVOLUTION_API_KEY` | Chave da sua Evolution API |

### 4. Deploy
Clique **Deploy** — o Vercel vai buildear e publicar automaticamente.

A URL pública será algo como: `https://lota-frontend.vercel.app`

---

## Evolution API (WhatsApp Multi-tenant)

A Evolution API permite conectar múltiplos números de WhatsApp em uma única instalação — cada box tem sua própria instância isolada.

### Opção A: Railway.app (mais fácil)

1. Acesse [railway.app](https://railway.app) → New Project
2. Busque por **Evolution API** nos templates
3. Configure as variáveis:
   - `AUTHENTICATION_API_KEY`: crie uma chave segura (ex: `lota-evol-2026-xYz`)
   - `DATABASE_PROVIDER`: `postgresql`
   - `DATABASE_CONNECTION_URI`: use o Supabase (adicione um schema separado)
4. Clique Deploy → anote a URL gerada (ex: `https://evolution-api.railway.app`)
5. Adicione essa URL no Vercel como `VITE_EVOLUTION_API_URL`

### Opção B: VPS próprio (Hetzner/DigitalOcean)

```bash
# 1. Acesse o VPS via SSH
ssh root@SEU_IP

# 2. Instale Docker
curl -fsSL https://get.docker.com | sh

# 3. Clone a Evolution API
git clone https://github.com/EvolutionAPI/evolution-api.git
cd evolution-api

# 4. Configure o .env
cp .env.example .env
nano .env
# Preencha: AUTHENTICATION_API_KEY, DATABASE_URL etc.

# 5. Suba com Docker Compose
docker compose up -d

# 6. Acesse: http://SEU_IP:8080
```

### Como conectar um box (fluxo do dono)

```
1. Dono acessa LOTA → Configurações → WhatsApp
2. Clica "Conectar WhatsApp"
3. LOTA chama: POST /instance/create (Evolution API)
4. Evolution API retorna QR Code
5. Dono escaneia com celular
6. Webhook configurado para receber mensagens entrantes
7. LOTA cria lead automaticamente
```

### Endpoints principais usados pelo LOTA

| Método | Endpoint | Uso |
|---|---|---|
| `POST` | `/instance/create` | Criar instância do box |
| `GET` | `/instance/connect/{slug}` | Gerar QR Code |
| `GET` | `/instance/connectionState/{slug}` | Status da conexão |
| `POST` | `/message/sendText/{slug}` | Enviar mensagem |
| `DELETE` | `/instance/logout/{slug}` | Desconectar número |

---

## Variáveis de Ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```env
VITE_SUPABASE_URL=https://favryvjzvfdqlftkyhpi.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
VITE_EVOLUTION_API_URL=https://sua-evolution-api.com
VITE_EVOLUTION_API_KEY=sua-api-key-aqui
```

---

## Desenvolvimento local

```bash
npm install
npm run dev
# App em http://localhost:5173
```

---

## Links úteis
- [Evolution API Docs](https://doc.evolution-api.com)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Vercel Dashboard](https://vercel.com/dashboard)
