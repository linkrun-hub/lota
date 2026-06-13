-- ============================================================
-- LOTA — Migration 017: Estúdio de Verticais (config in-app)
-- Permite ao super_admin configurar cada nicho pela interface.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. app_config — flags globais da plataforma (key-value)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_config (
  chave      TEXT PRIMARY KEY,
  valor      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_config_select_super" ON public.app_config;
CREATE POLICY "app_config_select_super"
  ON public.app_config FOR SELECT TO authenticated
  USING (public.sou_super_admin());
-- escrita só via service role (admin-api)

INSERT INTO public.app_config (chave, valor) VALUES
  ('modo_configuracao', 'true'::jsonb)
ON CONFLICT (chave) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 2. vertical_templates — biblioteca de mensagens POR nicho
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.vertical_templates (
  vertical_slug TEXT NOT NULL REFERENCES public.verticals(slug) ON DELETE CASCADE,
  key           TEXT NOT NULL,
  nome          TEXT NOT NULL,
  texto         TEXT NOT NULL,
  categoria     TEXT NOT NULL DEFAULT 'geral',
  ativo         BOOLEAN NOT NULL DEFAULT true,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (vertical_slug, key)
);

ALTER TABLE public.vertical_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vtemplates_select_auth" ON public.vertical_templates;
CREATE POLICY "vtemplates_select_auth"
  ON public.vertical_templates FOR SELECT TO authenticated USING (true);
-- escrita só via service role (admin-api)

-- Semeia cada vertical com a biblioteca atual (uma versão de cada key).
INSERT INTO public.vertical_templates (vertical_slug, key, nome, texto, categoria)
SELECT v.slug, t.key, t.nome, t.texto, t.categoria
FROM public.verticals v
CROSS JOIN (
  SELECT DISTINCT ON (key) key, nome, texto, categoria
  FROM public.templates
  ORDER BY key, created_at
) t
ON CONFLICT (vertical_slug, key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. criar_tenant passa a copiar templates do VERTICAL do box
--    (fallback para a biblioteca genérica se o vertical não tiver)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.criar_tenant(
  p_nome          TEXT,
  p_slug          TEXT,
  p_vertical      TEXT,
  p_dono_nome     TEXT,
  p_dono_whatsapp TEXT,
  p_dono_email    TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_box_id  UUID;
  v_modulos TEXT[];
  v_ret     JSONB;
  v_tem_vt  BOOLEAN;
BEGIN
  IF NOT (p_slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$') THEN
    RAISE EXCEPTION 'Slug inválido (use letras minúsculas, números e hífens)';
  END IF;
  IF EXISTS (SELECT 1 FROM public.boxes WHERE slug = p_slug) THEN
    RAISE EXCEPTION 'Slug já em uso';
  END IF;

  SELECT modulos_default, retencao_config INTO v_modulos, v_ret
  FROM public.verticals WHERE slug = p_vertical;
  IF v_modulos IS NULL THEN
    RAISE EXCEPTION 'Vertical inexistente: %', p_vertical;
  END IF;

  INSERT INTO public.boxes (nome, slug, dono_nome, dono_whatsapp, dono_email,
                            plano, limite_msgs_dia, ativo, modulos_ativos, vertical)
  VALUES (p_nome, p_slug, p_dono_nome, p_dono_whatsapp, p_dono_email,
          'basico', 30, true, v_modulos, p_vertical)
  RETURNING id INTO v_box_id;

  -- Templates: do vertical se houver, senão da biblioteca genérica
  SELECT EXISTS(SELECT 1 FROM public.vertical_templates WHERE vertical_slug = p_vertical) INTO v_tem_vt;
  IF v_tem_vt THEN
    INSERT INTO public.templates (box_id, key, nome, texto, categoria, ativo)
    SELECT v_box_id, key, nome, texto, categoria, ativo
    FROM public.vertical_templates WHERE vertical_slug = p_vertical;
  ELSE
    INSERT INTO public.templates (box_id, key, nome, texto, categoria, ativo)
    SELECT v_box_id, t.key, t.nome, t.texto, t.categoria, true
    FROM (
      SELECT DISTINCT ON (key) key, nome, texto, categoria
      FROM public.templates ORDER BY key, created_at
    ) t;
  END IF;

  -- Regras de retenção conforme o vertical
  IF v_ret->>'tipo' = 'faltas' THEN
    INSERT INTO public.retention_rules (box_id, nome, tipo, parametro, template_key, notifica_dono) VALUES
      (v_box_id, '3 faltas seguidas', 'faltas',     3, 'retencao_3_faltas', false),
      (v_box_id, '5 faltas seguidas', 'faltas',     5, 'retencao_5_faltas', true),
      (v_box_id, 'Vence em 7 dias',   'vencimento', 7, 'renovacao_7_dias',  false),
      (v_box_id, 'Vence amanhã',      'vencimento', 1, 'renovacao_1_dia',   true);
  ELSIF v_ret->>'tipo' = 'retorno' THEN
    INSERT INTO public.retention_rules (box_id, nome, tipo, parametro, template_key, notifica_dono)
    VALUES (v_box_id, 'Sem retorno há ' || (v_ret->>'dias') || ' dias', 'retorno',
            (v_ret->>'dias')::int, 'retencao_retorno', false);
  ELSIF v_ret->>'tipo' = 'recompra' THEN
    INSERT INTO public.retention_rules (box_id, nome, tipo, parametro, template_key, notifica_dono)
    VALUES (v_box_id, 'Sem comprar há 30+ dias', 'recompra', 30, 'retencao_recompra', false);
  END IF;

  RETURN v_box_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.criar_tenant FROM PUBLIC, anon, authenticated;

SELECT 'Migration 017 — Estúdio de Verticais: OK ✅' AS resultado;
