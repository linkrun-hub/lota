-- ============================================================
-- FitLead — Migration 001: Schema Inicial
-- ⚠️ Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para buscas por texto

-- ─────────────────────────────────────────────────────────────
-- TABELA: boxes (Tenants)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.boxes (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome                    TEXT NOT NULL,
  slug                    TEXT UNIQUE NOT NULL,
  dono_nome               TEXT NOT NULL,
  dono_whatsapp           TEXT NOT NULL, -- formato E.164: +5511999999999
  dono_email              TEXT,
  plano                   TEXT NOT NULL DEFAULT 'basico' CHECK (plano IN ('basico', 'pro', 'enterprise')),
  limite_msgs_dia         INTEGER NOT NULL DEFAULT 25,
  botconversa_inbox_id    TEXT,
  resend_from_email       TEXT,
  ativo                   BOOLEAN NOT NULL DEFAULT true,
  criado_em               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.boxes IS 'Tenants da plataforma FitLead — cada box é um cliente isolado';

-- ─────────────────────────────────────────────────────────────
-- TABELA: leads (Contatos em Funil)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.leads (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  box_id            UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  whatsapp          TEXT NOT NULL, -- E.164
  email             TEXT,
  origem            TEXT NOT NULL DEFAULT 'whatsapp' CHECK (
                      origem IN ('whatsapp','lead_ads_meta','lead_ads_google','landing_page','indicacao','manual')
                    ),
  status            TEXT NOT NULL DEFAULT 'novo' CHECK (
                      status IN ('novo','em_conversa','qualificado','agendado','convertido','perdido','opt_out')
                    ),
  momento_compra    TEXT CHECK (momento_compra IN ('agora','em_breve','comparando')),
  interesse         TEXT[] DEFAULT '{}',
  score             INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  lgpd_consent      BOOLEAN NOT NULL DEFAULT false,
  lgpd_consent_em   TIMESTAMPTZ,
  opt_out           BOOLEAN NOT NULL DEFAULT false,
  opt_out_em        TIMESTAMPTZ,
  utm_source        TEXT,
  utm_campaign      TEXT,
  observacoes       TEXT,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de performance
CREATE INDEX idx_leads_box_id ON public.leads(box_id);
CREATE INDEX idx_leads_status ON public.leads(box_id, status);
CREATE INDEX idx_leads_whatsapp ON public.leads(box_id, whatsapp);
CREATE INDEX idx_leads_opt_out ON public.leads(box_id, opt_out) WHERE opt_out = false;

COMMENT ON TABLE public.leads IS 'Contatos em funil de vendas — isolados por box_id';

-- ─────────────────────────────────────────────────────────────
-- TABELA: alunos (Alunos Matriculados)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.alunos (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  box_id                UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  lead_id               UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  nome                  TEXT NOT NULL,
  whatsapp              TEXT NOT NULL, -- E.164
  email                 TEXT,
  cpf                   TEXT,
  -- Endereço (via ViaCEP)
  cep                   TEXT,
  logradouro            TEXT,
  numero                TEXT,
  complemento           TEXT,
  bairro                TEXT,
  cidade                TEXT,
  uf                    CHAR(2),
  -- Plano e financeiro
  plano                 TEXT NOT NULL,
  valor_mensalidade     NUMERIC(10,2) NOT NULL DEFAULT 0,
  dia_vencimento        INTEGER NOT NULL DEFAULT 10 CHECK (dia_vencimento BETWEEN 1 AND 31),
  data_inicio           DATE NOT NULL,
  data_vencimento       DATE NOT NULL,
  -- Status e retenção
  status                TEXT NOT NULL DEFAULT 'ativo' CHECK (
                          status IN ('ativo','suspenso','cancelado','inadimplente')
                        ),
  faltas_consecutivas   INTEGER NOT NULL DEFAULT 0,
  nps_score             INTEGER CHECK (nps_score BETWEEN 1 AND 10),
  nps_respondido_em     TIMESTAMPTZ,
  -- LGPD
  opt_out               BOOLEAN NOT NULL DEFAULT false,
  opt_out_em            TIMESTAMPTZ,
  -- Datas
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_alunos_box_id ON public.alunos(box_id);
CREATE INDEX idx_alunos_status ON public.alunos(box_id, status);
CREATE INDEX idx_alunos_vencimento ON public.alunos(box_id, data_vencimento) WHERE status = 'ativo';
CREATE INDEX idx_alunos_faltas ON public.alunos(box_id, faltas_consecutivas) WHERE status = 'ativo';

COMMENT ON TABLE public.alunos IS 'Alunos matriculados — isolados por box_id';

-- ─────────────────────────────────────────────────────────────
-- TABELA: presencas (Check-ins)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.presencas (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  box_id          UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  aluno_id        UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  data_presenca   DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_entrada    TIME,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Evita duplicatas no mesmo dia
  UNIQUE(box_id, aluno_id, data_presenca)
);

CREATE INDEX idx_presencas_aluno ON public.presencas(box_id, aluno_id);
CREATE INDEX idx_presencas_data ON public.presencas(box_id, data_presenca);

COMMENT ON TABLE public.presencas IS 'Check-ins de alunos — isolados por box_id';

-- ─────────────────────────────────────────────────────────────
-- TABELA: indicacoes (Programa de Referral)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.indicacoes (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  box_id                UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  aluno_indicador_id    UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  lead_indicado_id      UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  token                 TEXT UNIQUE NOT NULL, -- 8 chars, único
  status                TEXT NOT NULL DEFAULT 'pendente' CHECK (
                          status IN ('pendente','convertido','expirado')
                        ),
  expira_em             TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  convertido_em         TIMESTAMPTZ
);

CREATE INDEX idx_indicacoes_box ON public.indicacoes(box_id);
CREATE INDEX idx_indicacoes_token ON public.indicacoes(token);
CREATE INDEX idx_indicacoes_indicador ON public.indicacoes(aluno_indicador_id);

COMMENT ON TABLE public.indicacoes IS 'Programa de indicação entre alunos';

-- ─────────────────────────────────────────────────────────────
-- TABELA: disparo_fila (Fila de Mensagens)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.disparo_fila (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  box_id                UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  destinatario_tipo     TEXT NOT NULL CHECK (destinatario_tipo IN ('lead','aluno','dono')),
  destinatario_id       UUID NOT NULL,
  canal                 TEXT NOT NULL CHECK (canal IN ('whatsapp','email')),
  template_key          TEXT NOT NULL,
  payload               JSONB NOT NULL DEFAULT '{}',
  agendado_para         TIMESTAMPTZ NOT NULL,
  status                TEXT NOT NULL DEFAULT 'pendente' CHECK (
                          status IN ('pendente','enviado','falhou','cancelado')
                        ),
  tentativas            INTEGER NOT NULL DEFAULT 0,
  erro_detalhes         TEXT,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  enviado_em            TIMESTAMPTZ
);

CREATE INDEX idx_fila_pendente ON public.disparo_fila(box_id, agendado_para) 
  WHERE status = 'pendente';
CREATE INDEX idx_fila_destinatario ON public.disparo_fila(destinatario_id, status);

COMMENT ON TABLE public.disparo_fila IS 'Fila de mensagens WhatsApp e Email — processada pelo cron';

-- ─────────────────────────────────────────────────────────────
-- TABELA: follow_up_sequencias
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.follow_up_sequencias (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  box_id                UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  lead_id               UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  momento_compra        TEXT NOT NULL CHECK (momento_compra IN ('agora','em_breve','comparando')),
  step_atual            INTEGER NOT NULL DEFAULT 1,
  proximo_disparo_em    TIMESTAMPTZ NOT NULL,
  status                TEXT NOT NULL DEFAULT 'ativo' CHECK (
                          status IN ('ativo','pausado','concluido','convertido','opt_out')
                        ),
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sequencias_ativas ON public.follow_up_sequencias(box_id, proximo_disparo_em)
  WHERE status = 'ativo';
CREATE INDEX idx_sequencias_lead ON public.follow_up_sequencias(lead_id);

COMMENT ON TABLE public.follow_up_sequencias IS 'Controle das sequências de follow-up por lead';

-- ─────────────────────────────────────────────────────────────
-- TABELA: notificacoes (Avisos para Donos)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.notificacoes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  box_id      UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (
                tipo IN (
                  'lead_novo','risco_cancelamento','inadimplencia',
                  'resumo_diario','renovacao_proxima','indicacao_convertida',
                  'opt_out_recebido'
                )
              ),
  titulo      TEXT NOT NULL,
  corpo       TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  lida        BOOLEAN NOT NULL DEFAULT false,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notificacoes_box ON public.notificacoes(box_id, lida, criado_em DESC);

COMMENT ON TABLE public.notificacoes IS 'Central de avisos para donos de box';

-- ─────────────────────────────────────────────────────────────
-- TABELA: msgs_contador_diario (Anti-Bloqueio WhatsApp)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.msgs_contador_diario (
  box_id      UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  data        DATE NOT NULL DEFAULT CURRENT_DATE,
  total_msgs  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (box_id, data)
);

COMMENT ON TABLE public.msgs_contador_diario IS 'Contador de mensagens WhatsApp por dia — anti-bloqueio';

-- ─────────────────────────────────────────────────────────────
-- FUNÇÃO HELPER: updated_at automático
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
CREATE TRIGGER set_boxes_updated_at BEFORE UPDATE ON public.boxes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_alunos_updated_at BEFORE UPDATE ON public.alunos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_sequencias_updated_at BEFORE UPDATE ON public.follow_up_sequencias
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

SELECT 'Migration 001 — Schema Inicial: OK ✅' AS resultado;
