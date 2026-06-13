-- ============================================================
-- LOTA — Migration 013: Bloco ISCA V1 (Fase 4)
-- Marketing inteligente alimentado pelos dados da operação.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.iscas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id       UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  origem_dado  TEXT NOT NULL,     -- chave de dedupe (ex: 'vagas-2026-06-13-svc1')
  tipo         TEXT NOT NULL,     -- prova_social | depoimento | vagas | indicacao | sazonal
  ideia        TEXT NOT NULL,     -- o insight ("3 conversões essa semana")
  legenda      TEXT NOT NULL,     -- texto pronto pra copiar e postar
  status       TEXT NOT NULL DEFAULT 'sugerida' CHECK (
                 status IN ('sugerida','aprovada','publicada','descartada')
               ),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (box_id, origem_dado)
);

CREATE TABLE IF NOT EXISTS public.brand_kits (
  box_id     UUID PRIMARY KEY REFERENCES public.boxes(id) ON DELETE CASCADE,
  logo_url   TEXT,
  cores      JSONB NOT NULL DEFAULT '{}',
  fontes     JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['iscas','brand_kits']
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
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
  END LOOP;
END;
$$;

-- Template do aviso diário pro dono
INSERT INTO public.templates (box_id, key, nome, texto, categoria, ativo)
SELECT b.id, 'isca_pronta', 'ISCA — Aviso diário',
  E'🎣 *{quantidade} iscas prontas pra hoje!*\n\nO LOTA analisou seus dados e preparou sugestões de posts pro *{box_nome}*.\n\nAcesse o painel → ISCA pra aprovar e postar! 🚀\n_www.lota.app.br_',
  'alertas', true
FROM public.boxes b
WHERE NOT EXISTS (SELECT 1 FROM public.templates x WHERE x.box_id = b.id AND x.key = 'isca_pronta');

-- Ativa o módulo isca nos boxes existentes
UPDATE public.boxes
SET modulos_ativos = array_append(modulos_ativos, 'isca')
WHERE NOT ('isca' = ANY(COALESCE(modulos_ativos, '{}')));

SELECT 'Migration 013 — Bloco ISCA: OK ✅' AS resultado;
