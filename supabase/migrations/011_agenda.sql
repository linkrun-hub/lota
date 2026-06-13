-- ============================================================
-- LOTA — Migration 011: Bloco AGENDA (Fase 2)
-- services, availability, appointments, waitlist + RLS
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. TABELAS
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.services (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id       UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  descricao    TEXT,
  duracao_min  INTEGER NOT NULL DEFAULT 60 CHECK (duracao_min BETWEEN 5 AND 480),
  preco        NUMERIC(10,2) NOT NULL DEFAULT 0,
  capacidade   INTEGER NOT NULL DEFAULT 1 CHECK (capacidade BETWEEN 1 AND 200),
  ativo        BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.availability (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id       UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  service_id   UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  dia_semana   INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=domingo
  hora_inicio  TIME NOT NULL,
  hora_fim     TIME NOT NULL,
  vagas        INTEGER, -- NULL = usa capacidade do service
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (hora_fim > hora_inicio)
);

CREATE TABLE IF NOT EXISTS public.appointments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id       UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  service_id   UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  lead_id      UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  nome         TEXT NOT NULL,
  whatsapp     TEXT NOT NULL,
  email        TEXT,
  data_hora    TIMESTAMPTZ NOT NULL,
  status       TEXT NOT NULL DEFAULT 'agendado' CHECK (
                 status IN ('agendado','confirmado','compareceu','no_show','cancelado')
               ),
  origem       TEXT NOT NULL DEFAULT 'publico',
  notas        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_box_data ON public.appointments(box_id, data_hora);
CREATE INDEX IF NOT EXISTS idx_appointments_service ON public.appointments(service_id, data_hora);

CREATE TABLE IF NOT EXISTS public.waitlist (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id        UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  service_id    UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  whatsapp      TEXT NOT NULL,
  data_desejada DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 2. RLS (mesmo padrão multi-tenant da migration 010)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  tabelas TEXT[] := ARRAY['services','availability','appointments','waitlist'];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tabelas
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

-- ─────────────────────────────────────────────────────────────
-- 3. TEMPLATES de agendamento (para os boxes existentes)
-- processar-fila busca primeiro na tabela templates do box
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.templates (box_id, key, nome, texto, categoria, ativo)
SELECT b.id, t.key, t.nome, t.texto, 'agendamento', true
FROM public.boxes b
CROSS JOIN (VALUES
  ('agendamento_confirmacao', 'Agendamento — Confirmação',
   E'{nome}, agendamento confirmado! ✅\n\n📅 *{servico}*\n🗓 {data} às {hora}\n📍 *{box_nome}*\n\nQualquer imprevisto, é só avisar por aqui. Te esperamos! 💪'),
  ('agendamento_lembrete_24h', 'Agendamento — Lembrete 24h',
   E'{nome}, passando pra lembrar! 👋\n\nAmanhã tem *{servico}* às *{hora}* no *{box_nome}*.\n\nConfirma sua presença? 😊'),
  ('agendamento_lembrete_2h', 'Agendamento — Lembrete 2h',
   E'{nome}, é hoje! ⏰\n\nSeu *{servico}* é às *{hora}* no *{box_nome}*.\n\nJá prepara o coração (e a garrafinha de água)! 💪'),
  ('agendamento_no_show', 'Agendamento — Remarcação',
   E'{nome}, sentimos sua falta hoje! 😢\n\nImprevistos acontecem. Quer remarcar seu *{servico}* no *{box_nome}*?\n\nMe avisa qual o melhor dia! 📅')
) AS t(key, nome, texto)
WHERE NOT EXISTS (
  SELECT 1 FROM public.templates x WHERE x.box_id = b.id AND x.key = t.key
);

-- ─────────────────────────────────────────────────────────────
-- 4. Ativa o módulo agenda nos boxes existentes
-- ─────────────────────────────────────────────────────────────
UPDATE public.boxes
SET modulos_ativos = array_append(modulos_ativos, 'agenda')
WHERE NOT ('agenda' = ANY(COALESCE(modulos_ativos, '{}')));

SELECT 'Migration 011 — Bloco Agenda: OK ✅' AS resultado;
