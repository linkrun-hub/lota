-- ============================================================
-- LOTA — Migration 012: Verticais e Terminologia (Fase 3)
-- Um código, vários nichos: nicho = preset de configuração.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.verticals (
  slug               TEXT PRIMARY KEY,
  nome               TEXT NOT NULL,
  terminologia       JSONB NOT NULL DEFAULT '{}',
  modulos_default    TEXT[] NOT NULL DEFAULT '{leads}',
  retencao_config    JSONB NOT NULL DEFAULT '{}',
  financeiro_config  JSONB NOT NULL DEFAULT '{}',
  ia_persona_default TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.verticals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "verticals_select_auth" ON public.verticals;
CREATE POLICY "verticals_select_auth"
  ON public.verticals FOR SELECT TO authenticated USING (true);
-- escrita: apenas service role (editor de presets do admin)

ALTER TABLE public.boxes ADD COLUMN IF NOT EXISTS vertical TEXT DEFAULT 'crossfit';
ALTER TABLE public.boxes ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';

-- ─────────────────────────────────────────────────────────────
-- Os 7 presets iniciais
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.verticals (slug, nome, terminologia, modulos_default, retencao_config, financeiro_config, ia_persona_default) VALUES
('crossfit', 'Box CrossFit / Hyrox',
 '{"cliente":"Aluno","clientes":"Alunos","unidade":"Box","visita":"Check-in","grupo":"Turma","grupos":"Turmas","mensalidade":"Mensalidade"}',
 '{leads,indicacoes,retencao,gestao,disparos,captacao,agenda}',
 '{"tipo":"faltas","niveis":[3,5,7]}',
 '{"modelo":"recorrente"}',
 'Você é atendente de um box de CrossFit/Hyrox. Tom enérgico e motivador, trate todos como atletas em potencial. Objetivo: levar o lead à aula experimental gratuita.'),
('academia', 'Academia tradicional',
 '{"cliente":"Aluno","clientes":"Alunos","unidade":"Academia","visita":"Check-in","grupo":"Turma","grupos":"Turmas","mensalidade":"Mensalidade"}',
 '{leads,indicacoes,retencao,gestao,disparos,captacao,agenda}',
 '{"tipo":"faltas","niveis":[3,5,7]}',
 '{"modelo":"recorrente"}',
 'Você é atendente de uma academia. Tom acolhedor e profissional. Destaque estrutura, horários flexíveis e avaliação física gratuita. Objetivo: agendar uma visita.'),
('studio', 'Studio Fitness / Pilates',
 '{"cliente":"Aluno","clientes":"Alunos","unidade":"Studio","visita":"Sessão","grupo":"Turma","grupos":"Turmas","mensalidade":"Plano"}',
 '{leads,indicacoes,retencao,gestao,disparos,captacao,agenda}',
 '{"tipo":"faltas","niveis":[2,4,6]}',
 '{"modelo":"recorrente"}',
 'Você é atendente de um studio fitness boutique. Tom próximo e personalizado — atendimento exclusivo é o diferencial. Objetivo: agendar aula experimental.'),
('servicos', 'Serviços (dedetização, mecânica...)',
 '{"cliente":"Cliente","clientes":"Clientes","unidade":"Empresa","visita":"Atendimento","grupo":"Equipe","grupos":"Equipes","mensalidade":"Contrato"}',
 '{leads,indicacoes,retencao,disparos,captacao,agenda}',
 '{"tipo":"retorno","dias":180}',
 '{"modelo":"os"}',
 'Você é atendente de uma empresa de serviços. Tom profissional e ágil — responda dúvidas técnicas com clareza e ofereça orçamento rápido. Objetivo: agendar visita técnica.'),
('varejo_fitness', 'Revenda de roupa fitness',
 '{"cliente":"Cliente","clientes":"Clientes","unidade":"Loja","visita":"Compra","grupo":"Coleção","grupos":"Coleções","mensalidade":"Pedido"}',
 '{leads,indicacoes,retencao,disparos,captacao}',
 '{"tipo":"recompra","dias":[30,60,90]}',
 '{"modelo":"pedido"}',
 'Você é vendedora de uma loja de roupas fitness. Tom amigo e estiloso — sugira looks e novidades. Objetivo: fechar a venda pelo WhatsApp.'),
('confeitaria', 'Confeitaria / produtos artesanais',
 '{"cliente":"Cliente","clientes":"Clientes","unidade":"Confeitaria","visita":"Pedido","grupo":"Encomenda","grupos":"Encomendas","mensalidade":"Pedido"}',
 '{leads,indicacoes,retencao,disparos,captacao,agenda}',
 '{"tipo":"recompra","dias":[30,60,90]}',
 '{"modelo":"pedido"}',
 'Você é atendente de uma confeitaria artesanal. Tom doce e caprichado 🍰 — pergunte data do evento e quantidade. Objetivo: fechar a encomenda com antecedência.'),
('ecommerce', 'E-commerce (equipamentos fitness)',
 '{"cliente":"Cliente","clientes":"Clientes","unidade":"Loja","visita":"Pedido","grupo":"Categoria","grupos":"Categorias","mensalidade":"Pedido"}',
 '{leads,retencao,disparos,captacao}',
 '{"tipo":"recompra","dias":[45,90,180]}',
 '{"modelo":"pedido"}',
 'Você é atendente de um e-commerce de equipamentos fitness. Tom técnico e confiável — tire dúvidas de specs, frete e garantia. Objetivo: converter o carrinho em pedido.')
ON CONFLICT (slug) DO UPDATE SET
  terminologia = EXCLUDED.terminologia,
  retencao_config = EXCLUDED.retencao_config,
  financeiro_config = EXCLUDED.financeiro_config;

-- Boxes existentes: BraveFit é crossfit; demo vira "servicos" pra validar a terminologia
UPDATE public.boxes SET vertical = 'crossfit' WHERE slug = 'bravefit';
UPDATE public.boxes SET vertical = 'servicos' WHERE slug = 'demo';

SELECT 'Migration 012 — Verticais: OK ✅' AS resultado;
