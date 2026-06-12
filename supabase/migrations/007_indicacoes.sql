-- ============================================================
-- MIGRATION 007: Tabela de indicações
-- Execute no Supabase SQL Editor:
-- supabase.com/dashboard/project/favryvjzvfdqlftkyhpi/sql
-- ============================================================

CREATE TABLE IF NOT EXISTS indicacoes (
  id                 uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  box_id             uuid        REFERENCES boxes(id) ON DELETE CASCADE NOT NULL,
  aluno_indicador_id uuid        REFERENCES alunos(id) ON DELETE CASCADE NOT NULL,
  lead_indicado_id   uuid        REFERENCES leads(id) ON DELETE SET NULL,
  token              text        UNIQUE NOT NULL,
  status             text        NOT NULL DEFAULT 'pendente'
                                 CHECK (status IN ('pendente', 'convertido', 'expirado')),
  expira_em          timestamptz DEFAULT now() + interval '60 days',
  created_at         timestamptz DEFAULT now(),
  convertido_at      timestamptz
);

ALTER TABLE indicacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "indicacoes_box_policy" ON indicacoes;
CREATE POLICY "indicacoes_box_policy" ON indicacoes FOR ALL USING (true) WITH CHECK (true);

-- Expirar automaticamente indicações vencidas (run periodically or on query)
CREATE OR REPLACE FUNCTION expirar_indicacoes()
RETURNS void AS $$
  UPDATE indicacoes
  SET status = 'expirado'
  WHERE status = 'pendente'
    AND expira_em < now();
$$ LANGUAGE sql;

-- Confirmação
SELECT 'Tabela indicacoes criada com sucesso!' AS resultado;
