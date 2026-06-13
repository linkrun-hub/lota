-- ============================================================
-- LOTA — Migration 015: Motor de Retenção Genérico (Fase 6)
-- "Se X dias sem evento Y → mensagem Z" — uma regra, todos os nichos.
-- O cron antigo (retencao-alunos) CONTINUA rodando; o motor novo nasce
-- em modo dry-run e só assume após paridade comprovada (plano, fase 6).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.retention_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id        UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN ('faltas','vencimento','recompra','retorno')),
  parametro     INTEGER NOT NULL, -- faltas: nº de faltas · demais: dias
  template_key  TEXT NOT NULL,
  notifica_dono BOOLEAN NOT NULL DEFAULT false,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.retention_rules ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  EXECUTE '
    CREATE POLICY "retention_rules_select_box" ON public.retention_rules FOR SELECT TO authenticated
      USING (box_id = public.meu_box_id() OR public.sou_super_admin());
    CREATE POLICY "retention_rules_insert_box" ON public.retention_rules FOR INSERT TO authenticated
      WITH CHECK (box_id = public.meu_box_id() OR public.sou_super_admin());
    CREATE POLICY "retention_rules_update_box" ON public.retention_rules FOR UPDATE TO authenticated
      USING (box_id = public.meu_box_id() OR public.sou_super_admin());
    CREATE POLICY "retention_rules_delete_box" ON public.retention_rules FOR DELETE TO authenticated
      USING (box_id = public.meu_box_id() OR public.sou_super_admin());
  ';
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- Templates novos (recompra / retorno) para todos os boxes
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.templates (box_id, key, nome, texto, categoria, ativo)
SELECT b.id, t.key, t.nome, t.texto, 'retencao', true
FROM public.boxes b
CROSS JOIN (VALUES
  ('retencao_recompra', 'Retenção — Recompra',
   E'{nome}, saudades! 💙\n\nFaz um tempinho que você não aparece por aqui no *{box_nome}*.\n\nChegaram novidades que são a sua cara — quer dar uma olhada? 👀'),
  ('retencao_retorno', 'Retenção — Retorno de serviço',
   E'{nome}, tudo bem? 👋\n\nJá faz {dias} dias desde o seu último atendimento no *{box_nome}*.\n\nQue tal agendar a próxima visita? É só me chamar! 📅')
) AS t(key, nome, texto)
WHERE NOT EXISTS (
  SELECT 1 FROM public.templates x WHERE x.box_id = b.id AND x.key = t.key
);

-- ─────────────────────────────────────────────────────────────
-- Seed das regras por vertical (espelha o comportamento atual)
-- ─────────────────────────────────────────────────────────────
-- Fitness (faltas + vencimento) — replica o retencao-alunos atual
INSERT INTO public.retention_rules (box_id, nome, tipo, parametro, template_key, notifica_dono)
SELECT b.id, r.nome, r.tipo, r.parametro, r.template_key, r.notifica_dono
FROM public.boxes b
JOIN public.verticals v ON v.slug = b.vertical
CROSS JOIN (VALUES
  ('3 faltas seguidas',  'faltas',     3, 'retencao_3_faltas', false),
  ('5 faltas seguidas',  'faltas',     5, 'retencao_5_faltas', true),
  ('Vence em 7 dias',    'vencimento', 7, 'renovacao_7_dias',  false),
  ('Vence amanhã',       'vencimento', 1, 'renovacao_1_dia',   true)
) AS r(nome, tipo, parametro, template_key, notifica_dono)
WHERE v.retencao_config->>'tipo' = 'faltas'
  AND NOT EXISTS (
    SELECT 1 FROM public.retention_rules x
    WHERE x.box_id = b.id AND x.tipo = r.tipo AND x.parametro = r.parametro
  );

-- Serviços (retorno periódico)
INSERT INTO public.retention_rules (box_id, nome, tipo, parametro, template_key, notifica_dono)
SELECT b.id, 'Sem retorno há ' || (v.retencao_config->>'dias') || ' dias', 'retorno',
       (v.retencao_config->>'dias')::int, 'retencao_retorno', false
FROM public.boxes b
JOIN public.verticals v ON v.slug = b.vertical
WHERE v.retencao_config->>'tipo' = 'retorno'
  AND NOT EXISTS (
    SELECT 1 FROM public.retention_rules x WHERE x.box_id = b.id AND x.tipo = 'retorno'
  );

-- Varejo (recompra 30/60/90 — usa o primeiro nível como gatilho)
INSERT INTO public.retention_rules (box_id, nome, tipo, parametro, template_key, notifica_dono)
SELECT b.id, 'Sem comprar há 30+ dias', 'recompra', 30, 'retencao_recompra', false
FROM public.boxes b
JOIN public.verticals v ON v.slug = b.vertical
WHERE v.retencao_config->>'tipo' = 'recompra'
  AND NOT EXISTS (
    SELECT 1 FROM public.retention_rules x WHERE x.box_id = b.id AND x.tipo = 'recompra'
  );

SELECT 'Migration 015 — Motor de Retenção: OK ✅' AS resultado;
