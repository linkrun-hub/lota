-- ============================================================
-- MIGRATION 009: ia_config + ia_sugestoes
-- Execute no Supabase SQL Editor:
-- supabase.com/dashboard/project/favryvjzvfdqlftkyhpi/sql
-- ============================================================

-- Tabela de configuração da IA por box
CREATE TABLE IF NOT EXISTS ia_config (
  id                      uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  box_id                  uuid        REFERENCES boxes(id) ON DELETE CASCADE UNIQUE NOT NULL,
  ativo                   boolean     DEFAULT false,
  nivel                   text        CHECK (nivel IN ('sugestao', 'semi_auto', 'autonomo')) DEFAULT 'sugestao',
  horario_inicio          time        DEFAULT '09:00',
  horario_fim             time        DEFAULT '20:00',
  dias_semana             int[]       DEFAULT '{1,2,3,4,5}',  -- 0=Dom, 1=Seg ... 6=Sab
  janela_cancelamento_seg integer     DEFAULT 30,
  contexto_box            text,
  gemini_api_key          text,       -- opcional, usa env var se vazia
  total_msgs_respondidas  integer     DEFAULT 0,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

ALTER TABLE ia_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ia_config_box_policy" ON ia_config FOR ALL USING (true) WITH CHECK (true);

-- Tabela de sugestões da IA (nível 1)
CREATE TABLE IF NOT EXISTS ia_sugestoes (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  box_id         uuid        REFERENCES boxes(id) ON DELETE CASCADE NOT NULL,
  mensagem_id    uuid        REFERENCES mensagens(id) ON DELETE CASCADE,
  whatsapp       text        NOT NULL,
  lead_id        uuid        REFERENCES leads(id) ON DELETE SET NULL,
  aluno_id       uuid        REFERENCES alunos(id) ON DELETE SET NULL,
  texto_sugerido text        NOT NULL,
  status         text        DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'editado', 'descartado')),
  texto_editado  text,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE ia_sugestoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ia_sugestoes_box_policy" ON ia_sugestoes FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS ia_sugestoes_box_whatsapp ON ia_sugestoes (box_id, whatsapp, status);

-- Colunas extras em disparo_fila para nível 2 (semi_auto com janela de cancelamento)
ALTER TABLE disparo_fila ADD COLUMN IF NOT EXISTS cancelavel_ate timestamptz;
ALTER TABLE disparo_fila ADD COLUMN IF NOT EXISTS ia_gerada     boolean DEFAULT false;

-- Realtime para sugestões da IA aparecerem instantaneamente no chat
ALTER PUBLICATION supabase_realtime ADD TABLE ia_sugestoes;
