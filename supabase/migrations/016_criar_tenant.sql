-- ============================================================
-- LOTA — Migration 016: Onboarding de tenants (Fase 7)
-- Função atômica que cria um box completo a partir do vertical:
-- módulos do preset + biblioteca de templates + regras de retenção.
-- Chamada APENAS pela Edge Function admin-api (service role).
-- ============================================================

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
BEGIN
  -- Validações
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

  -- 1. Box com os módulos do preset
  INSERT INTO public.boxes (nome, slug, dono_nome, dono_whatsapp, dono_email,
                            plano, limite_msgs_dia, ativo, modulos_ativos, vertical)
  VALUES (p_nome, p_slug, p_dono_nome, p_dono_whatsapp, p_dono_email,
          'basico', 30, true, v_modulos, p_vertical)
  RETURNING id INTO v_box_id;

  -- 2. Biblioteca de templates (copia a base: 1 versão de cada key existente)
  INSERT INTO public.templates (box_id, key, nome, texto, categoria, ativo)
  SELECT v_box_id, t.key, t.nome, t.texto, t.categoria, true
  FROM (
    SELECT DISTINCT ON (key) key, nome, texto, categoria
    FROM public.templates
    ORDER BY key, created_at
  ) t;

  -- 3. Regras de retenção conforme o vertical
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

-- Só service role executa (Edge Function admin-api)
REVOKE EXECUTE ON FUNCTION public.criar_tenant FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.criar_tenant FROM anon;
REVOKE EXECUTE ON FUNCTION public.criar_tenant FROM authenticated;

SELECT 'Migration 016 — criar_tenant: OK ✅' AS resultado;
