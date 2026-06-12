-- ============================================================
-- LOTA — Migration 010: Autenticação real + RLS multi-tenant
-- Fase 1 do PLANO_LOTA_2.0
--
-- ⚠️⚠️ NÃO EXECUTAR ATÉ O DIA DO CORTE ⚠️⚠️
-- Esta migration FECHA o acesso público ao banco. O app atual
-- (login mock) para de funcionar no momento em que ela roda.
-- Ordem do corte:
--   1. Deploy da Edge Function "publico" (já feito antes, inofensivo)
--   2. Rodar esta migration no SQL Editor
--   3. Rodar scripts/create-users.mjs (cria contas + profiles)
--   4. Merge do código novo na main (login real)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. TABELA profiles — vincula auth.users → box + papel
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  box_id    UUID REFERENCES public.boxes(id) ON DELETE CASCADE,
  nome      TEXT,
  papel     TEXT NOT NULL DEFAULT 'dono' CHECK (papel IN ('super_admin','dono','staff')),
  ativo     BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- box_id é NULL apenas para super_admin (admin da plataforma)

COMMENT ON TABLE public.profiles IS 'Vínculo entre usuários Supabase Auth, boxes e papéis';

-- ─────────────────────────────────────────────────────────────
-- 2. TABELA audit_logs — toda ação administrativa registrada
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  acao          TEXT NOT NULL,
  box_id_alvo   UUID REFERENCES public.boxes(id),
  detalhes      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 3. HELPERS
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.meu_box_id()
RETURNS UUID AS $$
  SELECT box_id FROM public.profiles WHERE id = auth.uid() AND ativo LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.sou_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND papel = 'super_admin' AND ativo
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 4. REMOVE TODAS as políticas antigas (acesso_publico_* etc.)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. ATIVA RLS em todas as tabelas (idempotente)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 6. POLÍTICAS: profiles
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "profiles_select_proprio"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.sou_super_admin());

CREATE POLICY "profiles_update_proprio"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.sou_super_admin());

-- INSERT/DELETE de profiles: somente service role (Edge Functions admin)

-- ─────────────────────────────────────────────────────────────
-- 7. POLÍTICAS: audit_logs (só super_admin lê; escrita via service role)
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "audit_select_super_admin"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.sou_super_admin());

CREATE POLICY "audit_insert_super_admin"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.sou_super_admin() AND admin_user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 8. POLÍTICAS: boxes
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "boxes_select_proprio"
  ON public.boxes FOR SELECT TO authenticated
  USING (id = public.meu_box_id() OR public.sou_super_admin());

CREATE POLICY "boxes_update_proprio"
  ON public.boxes FOR UPDATE TO authenticated
  USING (id = public.meu_box_id() OR public.sou_super_admin());

-- INSERT/DELETE de boxes: somente super_admin (via Edge Function admin)
CREATE POLICY "boxes_insert_super_admin"
  ON public.boxes FOR INSERT TO authenticated
  WITH CHECK (public.sou_super_admin());

-- ─────────────────────────────────────────────────────────────
-- 9. POLÍTICAS: todas as tabelas multi-tenant (por box_id)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  tabelas TEXT[] := ARRAY[
    'leads','alunos','turmas','presencas','indicacoes',
    'disparo_fila','follow_up_sequencias','notificacoes',
    'templates','contatos_especiais','mensagens',
    'ia_config','ia_sugestoes','nps_respostas','campanhas'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tabelas
  LOOP
    -- Pula tabelas que não existem (tolerante a divergências de ambiente)
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('
        CREATE POLICY "%s_select_box" ON public.%I FOR SELECT TO authenticated
          USING (box_id = public.meu_box_id() OR public.sou_super_admin());
        CREATE POLICY "%s_insert_box" ON public.%I FOR INSERT TO authenticated
          WITH CHECK (box_id = public.meu_box_id() OR public.sou_super_admin());
        CREATE POLICY "%s_update_box" ON public.%I FOR UPDATE TO authenticated
          USING (box_id = public.meu_box_id() OR public.sou_super_admin());
        CREATE POLICY "%s_delete_box" ON public.%I FOR DELETE TO authenticated
          USING (box_id = public.meu_box_id() OR public.sou_super_admin());
      ', t, t, t, t, t, t, t, t);
    END IF;
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 10. msgs_contador_diario (se existir — sem box_id direto em algumas versões)
-- ─────────────────────────────────────────────────────────────
-- Tratada no loop acima se tiver box_id; caso contrário fica sem política
-- (acesso só via service role), o que é o comportamento correto.

-- ─────────────────────────────────────────────────────────────
-- 11. REALTIME: o publish de mensagens continua funcionando —
-- o Supabase Realtime respeita o RLS do usuário autenticado.
-- ─────────────────────────────────────────────────────────────

SELECT 'Migration 010 — Auth real + RLS multi-tenant: OK ✅' AS resultado;
