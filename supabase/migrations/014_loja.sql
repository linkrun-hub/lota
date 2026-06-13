-- ============================================================
-- LOTA — Migration 014: Bloco LOJA / Catálogo e Pedidos (Fase 5)
-- Abre os nichos de varejo (roupa fitness, confeitaria, e-commerce).
-- Schema inspirado no Revenda Profit, enxuto para a V1.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id      UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  fotos       JSONB NOT NULL DEFAULT '[]',
  preco       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (preco >= 0),
  estoque     INTEGER, -- NULL = ilimitado (sob encomenda)
  categoria   TEXT,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_box ON public.products(box_id, ativo);

CREATE TABLE IF NOT EXISTS public.orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id           UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  cliente_nome     TEXT NOT NULL,
  cliente_whatsapp TEXT NOT NULL,
  itens            JSONB NOT NULL DEFAULT '[]', -- [{product_id, nome, qtd, preco}]
  total            NUMERIC(10,2) NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'novo' CHECK (
                     status IN ('novo','confirmado','entregue','cancelado')
                   ),
  entrega_data     DATE,  -- encomendas (confeitaria)
  notas            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_box ON public.orders(box_id, status, created_at);

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['products','orders']
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

-- Módulo loja: liga só no demo por enquanto (varejo não é o nicho do BraveFit)
UPDATE public.boxes
SET modulos_ativos = array_append(modulos_ativos, 'loja')
WHERE slug = 'demo' AND NOT ('loja' = ANY(COALESCE(modulos_ativos, '{}')));

-- Presets de varejo ganham o módulo por default
UPDATE public.verticals
SET modulos_default = array_append(modulos_default, 'loja')
WHERE slug IN ('varejo_fitness','confeitaria','ecommerce')
  AND NOT ('loja' = ANY(modulos_default));

SELECT 'Migration 014 — Bloco Loja: OK ✅' AS resultado;
