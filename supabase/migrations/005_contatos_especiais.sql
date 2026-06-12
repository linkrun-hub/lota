-- ============================================================
-- MIGRATION: contatos_especiais + novos templates de atendimento
-- Execute no Supabase SQL Editor:
-- supabase.com/dashboard/project/favryvjzvfdqlftkyhpi/sql
-- ============================================================

-- Tabela de contatos especiais (fornecedores, parceiros, VIPs, bloqueados)
CREATE TABLE IF NOT EXISTS contatos_especiais (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  box_id     uuid        REFERENCES boxes(id) ON DELETE CASCADE NOT NULL,
  whatsapp   text        NOT NULL,
  nome       text,
  tipo       text        NOT NULL CHECK (tipo IN ('fornecedor','parceiro','bloqueado','vip','outro')),
  nota       text,
  ativo      boolean     DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(box_id, whatsapp)
);

ALTER TABLE contatos_especiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contatos_especiais_box_policy" ON contatos_especiais FOR ALL USING (true) WITH CHECK (true);

-- Cria a função de updated_at (se ainda não existir)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contatos_especiais_updated_at
  BEFORE UPDATE ON contatos_especiais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Novos templates de atendimento para o BraveFit
INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'aluno_ativo_resposta', 'Resposta — Aluno Ativo', 'atendimento',
  'Oi {nome}! 😊

Que bom te ver por aqui! 💪

Nosso time vai te atender em breve. Se precisar de algo urgente, pode responder aqui mesmo!

Um abraço, equipe *{box_nome}* 🏋️',
  ARRAY['{nome}', '{box_nome}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'aluno_cancelado_resposta', 'Resposta — Ex-aluno (Reconquista)', 'atendimento',
  '{nome}! Que surpresa boa! 😄

Sentimos muito a sua falta no *{box_nome}*! 💪

Temos novidades e condições especiais para alunos que querem retornar.

Quer saber mais? É só me falar! 🏋️',
  ARRAY['{nome}', '{box_nome}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'aluno_inadimplente_resposta', 'Resposta — Aluno Inadimplente', 'atendimento',
  'Oi {nome}! 😊

Tudo bem? Passando pra lembrar que seu plano no *{box_nome}* está com pagamento em aberto.

Pode contar com a gente pra encontrar uma solução! Me fala como posso te ajudar. 🙏',
  ARRAY['{nome}', '{box_nome}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'contato_vip_resposta', 'Resposta — Contato VIP', 'atendimento',
  'Oi {nome}! ⭐

Que prazer receber sua mensagem! Nossa equipe do *{box_nome}* vai te atender com prioridade.

Já estamos vendo sua mensagem! 💪',
  ARRAY['{nome}', '{box_nome}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'contato_externo_resposta', 'Resposta — Contato Externo (Fornecedor/Parceiro)', 'atendimento',
  'Olá! 👋

Obrigado pela mensagem! Redirecionei seu contato ao responsável do *{box_nome}*.

Você será atendido em breve! 😊',
  ARRAY['{box_nome}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'alerta_contato_externo', 'Alerta Dono — Contato Externo (Fornecedor/Parceiro)', 'alertas',
  '📩 *Nova mensagem externa no {box_nome}!*

👤 *{nome}* ({tipo})
📱 {whatsapp}
💬 "{mensagem_original}"

Verifique seu WhatsApp!',
  ARRAY['{box_nome}', '{nome}', '{tipo}', '{whatsapp}', '{mensagem_original}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'alerta_aluno_mensagem', 'Alerta Dono — Aluno enviou mensagem', 'alertas',
  '💬 *{nome} enviou mensagem no {box_nome}!*

📱 {whatsapp}
🏷️ Status: {status_aluno}
💬 "{mensagem_original}"

Acesse o painel LOTA para ver mais detalhes.',
  ARRAY['{box_nome}', '{nome}', '{whatsapp}', '{status_aluno}', '{mensagem_original}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

-- Confirma
SELECT key, nome, categoria FROM templates ORDER BY categoria, key;
