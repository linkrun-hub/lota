-- ============================================================
-- LOTA — Migration 019: escrita direta do Estúdio por super_admin
-- Permite ao super_admin editar config de PLATAFORMA (verticais,
-- templates de nicho, flags) direto via RLS, sem depender do deploy
-- da Edge Function. Seguro: sou_super_admin() restringe a escrita.
-- (Operações sobre TENANTS continuam só pela admin-api.)
-- ============================================================

-- verticals: super_admin pode atualizar os presets
DROP POLICY IF EXISTS "verticals_update_super" ON public.verticals;
CREATE POLICY "verticals_update_super"
  ON public.verticals FOR UPDATE TO authenticated
  USING (public.sou_super_admin()) WITH CHECK (public.sou_super_admin());

-- vertical_templates: super_admin gerencia a biblioteca por nicho
DROP POLICY IF EXISTS "vtemplates_insert_super" ON public.vertical_templates;
CREATE POLICY "vtemplates_insert_super"
  ON public.vertical_templates FOR INSERT TO authenticated
  WITH CHECK (public.sou_super_admin());
DROP POLICY IF EXISTS "vtemplates_update_super" ON public.vertical_templates;
CREATE POLICY "vtemplates_update_super"
  ON public.vertical_templates FOR UPDATE TO authenticated
  USING (public.sou_super_admin()) WITH CHECK (public.sou_super_admin());
DROP POLICY IF EXISTS "vtemplates_delete_super" ON public.vertical_templates;
CREATE POLICY "vtemplates_delete_super"
  ON public.vertical_templates FOR DELETE TO authenticated
  USING (public.sou_super_admin());

-- app_config: super_admin liga/desliga flags (ex.: modo_configuracao)
DROP POLICY IF EXISTS "app_config_insert_super" ON public.app_config;
CREATE POLICY "app_config_insert_super"
  ON public.app_config FOR INSERT TO authenticated
  WITH CHECK (public.sou_super_admin());
DROP POLICY IF EXISTS "app_config_update_super" ON public.app_config;
CREATE POLICY "app_config_update_super"
  ON public.app_config FOR UPDATE TO authenticated
  USING (public.sou_super_admin()) WITH CHECK (public.sou_super_admin());

SELECT 'Migration 019 — escrita do Estúdio por super_admin: OK ✅' AS resultado;
