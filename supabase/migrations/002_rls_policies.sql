-- ============================================================
-- FitLead — Migration 002: Row Level Security (RLS)
-- ⚠️ Execute no SQL Editor do Supabase Dashboard APÓS 001
-- ============================================================
-- IMPORTANTE: Este arquivo garante isolamento multi-tenant.
-- Cada usuário autenticado só vê dados do seu próprio box.

-- ─────────────────────────────────────────────────────────────
-- TABELA: profiles (vincula auth.users → boxes)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  box_id    UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  nome      TEXT,
  papel     TEXT NOT NULL DEFAULT 'dono' CHECK (papel IN ('dono','atendente','admin')),
  ativo     BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Vínculo entre usuários Supabase Auth e seus boxes';

-- Auto-criar profile ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Profile será criado manualmente no onboarding
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- HELPER: obter box_id do usuário autenticado
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.meu_box_id()
RETURNS UUID AS $$
  SELECT box_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- HABILITAR RLS EM TODAS AS TABELAS
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.boxes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alunos                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presencas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicacoes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disparo_fila           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_sequencias   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.msgs_contador_diario   ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- POLÍTICAS: boxes
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "boxes: dono vê o próprio box"
  ON public.boxes FOR SELECT
  USING (id = public.meu_box_id());

CREATE POLICY "boxes: dono atualiza o próprio box"
  ON public.boxes FOR UPDATE
  USING (id = public.meu_box_id());

-- ─────────────────────────────────────────────────────────────
-- POLÍTICAS: profiles
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "profiles: vê o próprio perfil"
  ON public.profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "profiles: atualiza o próprio perfil"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "profiles: insere o próprio perfil"
  ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- MACRO: políticas padrão para tabelas multi-tenant
-- Aplica SELECT / INSERT / UPDATE / DELETE por box_id
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  tabelas TEXT[] := ARRAY[
    'leads','alunos','presencas','indicacoes',
    'disparo_fila','follow_up_sequencias','notificacoes','msgs_contador_diario'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tabelas
  LOOP
    EXECUTE format('
      CREATE POLICY "%s: select por box"
        ON public.%s FOR SELECT
        USING (box_id = public.meu_box_id());

      CREATE POLICY "%s: insert por box"
        ON public.%s FOR INSERT
        WITH CHECK (box_id = public.meu_box_id());

      CREATE POLICY "%s: update por box"
        ON public.%s FOR UPDATE
        USING (box_id = public.meu_box_id());

      CREATE POLICY "%s: delete por box"
        ON public.%s FOR DELETE
        USING (box_id = public.meu_box_id());
    ', t, t, t, t, t, t, t, t);
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- SERVICE ROLE bypassa RLS automaticamente no Supabase.
-- O backend (Next.js API routes) usa SUPABASE_SERVICE_ROLE_KEY
-- e é responsável por filtrar box_id em TODAS as queries.
-- ─────────────────────────────────────────────────────────────

SELECT 'Migration 002 — RLS Policies: OK ✅' AS resultado;
