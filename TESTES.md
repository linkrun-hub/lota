# TESTES.md — Rede de Segurança do LOTA
> Criado na Fase 0 do [PLANO_LOTA_2.0](../PLANO_LOTA_2.0.md). Toda mudança no sistema passa pelas camadas abaixo, na ordem.

---

## Camada 1 — Build + Lint (todo commit)

```powershell
npm run build
npm run lint
```
Se qualquer um falhar, **não commitar** até corrigir.

## Camada 2 — Testes unitários (todo commit)

```powershell
npm run test          # roda uma vez (usar antes de commit)
npm run test:watch    # modo contínuo durante o desenvolvimento
```

Testes existentes:
- `supabase/functions/_shared/regras.test.ts` — regras da fila de disparos (horário comercial BRT, limite diário anti-bloqueio, LGPD/opt-out, templates, sequências de follow-up)

> ⚠️ `processar-fila/index.ts` ainda contém uma CÓPIA dessas regras (é standalone).
> No próximo deploy dela (Fase 2), passa a importar de `_shared/regras.ts`.
> Até lá: mudou regra → mudar nos dois lugares.

## Camada 3 — Checklist BraveFit (antes de todo push/merge)

Regressão manual de ~5 minutos no ambiente alvo (preview ou produção):

```
□ Login funciona
□ Dashboard carrega métricas
□ /leads lista e abre lead
□ /mensagens: sidebar fixa + enviar mensagem + realtime (ponto verde)
□ /gestao lista alunos
□ /disparos abre histórico
□ /configuracoes abre todas as abas
□ Formulário público /form/bravefit envia
```

Mais o checklist específico da feature da fase (ver PLANO_LOTA_2.0, seção 6).

## Camada 4 — Preview Deployment (antes de merge na main)

```
1. Trabalhar SEMPRE em branch:  git checkout -b fase-N-nome
2. Commits locais à vontade
3. Push da branch (COM AUTORIZAÇÃO) → Vercel gera URL de preview
4. Rodar Camada 3 na URL de preview
5. Aprovado → merge na main (COM AUTORIZAÇÃO) → produção
```

---

## Banco de dados

### Backup (obrigatório antes de toda migration)

```powershell
$env:SUPABASE_SERVICE_KEY = "<service role key — painel Supabase → Settings → API>"
node scripts/backup-dados.mjs
```
Salva todas as tabelas em JSON em `..\backups\backup-<data>\` (fora do git).
O schema (DDL) está versionado em `supabase/migrations/`.

### Regras de migration

1. Backup feito imediatamente antes
2. **Só aditivas** (criar tabela/coluna) — nunca renomear/apagar
3. Arquivo numerado em `supabase/migrations/` commitado junto
4. RLS no mesmo arquivo que cria a tabela

---

## Tenant de teste: LOTA Demo

| Campo | Valor |
|---|---|
| Slug | `demo` |
| box_id | `a2ebded4-5f49-43f3-8132-a44f582810aa` |
| Dados | 6 leads + 3 alunos fictícios (números +5500000000xx — não entregam mensagem real) |
| Regra | Toda feature nova liga AQUI primeiro, 48h antes do BraveFit |

Recriar/completar o demo: `node scripts/seed-demo.mjs` (idempotente).

> O demo não tem instância Evolution — disparos de WhatsApp dele falham por design.
> O seed cancela disparos pendentes e pausa sequências de follow-up do demo.

---

## Segurança — decisões registradas

- **12/06/2026:** `VITE_SUPABASE_SERVICE_KEY` removida do `.env` do frontend (variáveis `VITE_` vazam pro bundle do navegador). Não era usada em nenhum código. A service role vive só nos secrets das Edge Functions; para scripts locais, exportar `$env:SUPABASE_SERVICE_KEY` na sessão.
- `.env` está no `.gitignore` e nunca foi commitado (verificado).
- `supabase/` (functions + migrations) agora é versionada dentro deste repositório (movida da raiz FIT LEAD em 12/06/2026). Deploys de functions rodam a partir de `fitlead-frontend/`.
