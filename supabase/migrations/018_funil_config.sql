-- ============================================================
-- LOTA — Migration 018: Funil de leads configurável por vertical
-- Valores internos do status continuam fixos (não quebra dados);
-- rótulo/cor/emoji/ordem/visibilidade no kanban viram configuráveis.
-- ============================================================

ALTER TABLE public.verticals ADD COLUMN IF NOT EXISTS funil_config   JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.verticals ADD COLUMN IF NOT EXISTS momento_config JSONB NOT NULL DEFAULT '[]';

-- Semeia TODOS os verticais com o funil/momentos atuais (do constants.js).
-- Assim nada muda visualmente até o admin customizar por nicho.
UPDATE public.verticals SET funil_config = '[
  {"key":"novo","label":"Novo","color":"#00E5FF","emoji":"🆕","kanban":true},
  {"key":"em_conversa","label":"Conversando","color":"#FFB800","emoji":"💬","kanban":true},
  {"key":"qualificado","label":"Qualificado","color":"#A78BFA","emoji":"✅","kanban":true},
  {"key":"agendado","label":"Agendado","color":"#00E5FF","emoji":"📅","kanban":false},
  {"key":"convertido","label":"Fechou!","color":"#22C55E","emoji":"🎉","kanban":true},
  {"key":"perdido","label":"Perdido","color":"#6B7280","emoji":"❌","kanban":true},
  {"key":"opt_out","label":"Opt-out","color":"#4B5563","emoji":"🚫","kanban":false}
]'::jsonb
WHERE funil_config = '[]'::jsonb OR funil_config IS NULL;

UPDATE public.verticals SET momento_config = '[
  {"key":"agora","label":"Quer agora","color":"#FF4444","emoji":"🔥"},
  {"key":"em_breve","label":"Em breve","color":"#FFB800","emoji":"📆"},
  {"key":"comparando","label":"Comparando","color":"#A78BFA","emoji":"🔍"},
  {"key":"curiosidade","label":"Curiosidade","color":"#6B7280","emoji":"👀"}
]'::jsonb
WHERE momento_config = '[]'::jsonb OR momento_config IS NULL;

-- Sugestões de rótulo por nicho (o admin pode ajustar no Estúdio):
-- serviços → "Agendado"="Visita agendada", "Fechou!"="Contratou"
UPDATE public.verticals SET funil_config = '[
  {"key":"novo","label":"Novo","color":"#00E5FF","emoji":"🆕","kanban":true},
  {"key":"em_conversa","label":"Em contato","color":"#FFB800","emoji":"💬","kanban":true},
  {"key":"qualificado","label":"Orçamento","color":"#A78BFA","emoji":"📄","kanban":true},
  {"key":"agendado","label":"Visita agendada","color":"#00E5FF","emoji":"📅","kanban":true},
  {"key":"convertido","label":"Contratou!","color":"#22C55E","emoji":"🎉","kanban":true},
  {"key":"perdido","label":"Perdido","color":"#6B7280","emoji":"❌","kanban":true},
  {"key":"opt_out","label":"Opt-out","color":"#4B5563","emoji":"🚫","kanban":false}
]'::jsonb
WHERE slug = 'servicos';

-- varejo/confeitaria/ecommerce → "Fechou!"="Comprou", "Agendado" oculto
UPDATE public.verticals SET funil_config = '[
  {"key":"novo","label":"Novo","color":"#00E5FF","emoji":"🆕","kanban":true},
  {"key":"em_conversa","label":"Conversando","color":"#FFB800","emoji":"💬","kanban":true},
  {"key":"qualificado","label":"Interessado","color":"#A78BFA","emoji":"✅","kanban":true},
  {"key":"agendado","label":"Reservado","color":"#00E5FF","emoji":"🛒","kanban":false},
  {"key":"convertido","label":"Comprou!","color":"#22C55E","emoji":"🎉","kanban":true},
  {"key":"perdido","label":"Perdido","color":"#6B7280","emoji":"❌","kanban":true},
  {"key":"opt_out","label":"Opt-out","color":"#4B5563","emoji":"🚫","kanban":false}
]'::jsonb
WHERE slug IN ('varejo_fitness','confeitaria','ecommerce');

SELECT 'Migration 018 — Funil configurável: OK ✅' AS resultado;
