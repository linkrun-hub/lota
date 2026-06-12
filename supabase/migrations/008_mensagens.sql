-- ============================================================
-- MIGRATION 008: mensagens
-- Execute no Supabase SQL Editor:
-- supabase.com/dashboard/project/favryvjzvfdqlftkyhpi/sql
-- ============================================================

CREATE TABLE IF NOT EXISTS mensagens (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  box_id            uuid        REFERENCES boxes(id) ON DELETE CASCADE NOT NULL,
  contato_whatsapp  text        NOT NULL,
  contato_nome      text,
  direcao           text        CHECK (direcao IN ('entrada', 'saida')) NOT NULL,
  texto             text,
  tipo              text        DEFAULT 'texto', -- texto | imagem | audio | doc | sticker
  media_url         text,
  lead_id           uuid        REFERENCES leads(id) ON DELETE SET NULL,
  aluno_id          uuid        REFERENCES alunos(id) ON DELETE SET NULL,
  lida              boolean     DEFAULT false,
  whatsapp_msg_id   text,
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE mensagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mensagens_box_policy" ON mensagens FOR ALL USING (true) WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS mensagens_box_contato_idx ON mensagens (box_id, contato_whatsapp, created_at DESC);
CREATE INDEX IF NOT EXISTS mensagens_nao_lidas_idx   ON mensagens (box_id, lida) WHERE lida = false;
CREATE INDEX IF NOT EXISTS mensagens_lead_idx        ON mensagens (lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS mensagens_aluno_idx       ON mensagens (aluno_id) WHERE aluno_id IS NOT NULL;

-- Trigger updated_at (reusa função já existente)
-- Ignorar erro se a função não existir
DO $$ BEGIN
  CREATE TRIGGER mensagens_updated_at
    BEFORE UPDATE ON mensagens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN others THEN NULL;
END $$;

-- ⚡ Habilita Supabase Realtime para delay ~100ms (em vez de polling)
-- Isso permite que o frontend receba novas mensagens em tempo real via WebSocket
ALTER PUBLICATION supabase_realtime ADD TABLE mensagens;
