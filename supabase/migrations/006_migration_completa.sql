-- ============================================================
-- LOTA — MIGRATION COMPLETA (004 + 005 combinados)
-- Execute TUDO de uma vez no Supabase SQL Editor:
-- supabase.com/dashboard/project/favryvjzvfdqlftkyhpi/sql
-- ============================================================

-- ─── 1. Função de updated_at (usada por todos os triggers) ───────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─── 2. Tabela templates ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS templates (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  box_id     uuid        REFERENCES boxes(id) ON DELETE CASCADE NOT NULL,
  key        text        NOT NULL,
  nome       text        NOT NULL,
  categoria  text        NOT NULL,
  canal      text        DEFAULT 'whatsapp',
  ativo      boolean     DEFAULT true,
  texto      text        NOT NULL,
  variaveis  text[]      DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(box_id, key)
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "templates_box_policy" ON templates;
CREATE POLICY "templates_box_policy" ON templates FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS templates_updated_at ON templates;
CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 3. Tabela contatos_especiais ─────────────────────────────────────────────
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

DROP POLICY IF EXISTS "contatos_especiais_box_policy" ON contatos_especiais;
CREATE POLICY "contatos_especiais_box_policy" ON contatos_especiais FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS contatos_especiais_updated_at ON contatos_especiais;
CREATE TRIGGER contatos_especiais_updated_at
  BEFORE UPDATE ON contatos_especiais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 4. Templates padrão BraveFit ────────────────────────────────────────────
-- Boas-vindas
INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'lead_boas_vindas', 'Boas-vindas (WhatsApp)', 'boas_vindas',
'Oi {nome}! 😊

Que bom que entrou em contato com o *{box_nome}*! 💪

Me conta: você está buscando começar do zero ou tem algum objetivo específico?

Assim consigo te indicar o melhor plano! 🏋️',
ARRAY['{nome}', '{box_nome}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

-- Follow-up Agora
INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_agora_1', 'Follow-up Agora — Msg 1 (1h)', 'follow_up',
'{nome}, oi! 👋

Ainda temos horários disponíveis essa semana no *{box_nome}*!

Qual seria o melhor horário pra você vir conhecer? Sem compromisso! 😊',
ARRAY['{nome}', '{box_nome}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_agora_2', 'Follow-up Agora — Msg 2 (3h)', 'follow_up',
'{nome}! 🔥

Você sabia que quem começa esse mês no *{box_nome}* garante condições especiais?

Manda uma mensagem que te conto os detalhes! 😉',
ARRAY['{nome}', '{box_nome}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_agora_3', 'Follow-up Agora — Msg 3 (24h)', 'follow_up',
'{nome}, última chamada! ⏰

Temos apenas algumas vagas essa semana no *{box_nome}*.

Posso reservar uma pra você? É só confirmar! 💪',
ARRAY['{nome}', '{box_nome}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

-- Follow-up Em Breve
INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_em_breve_1', 'Follow-up Em Breve — Msg 1 (3h)', 'follow_up',
'Oi {nome}! 😊

Entendo que você quer se planejar. No *{box_nome}* temos opções pra todo tipo de agenda e orçamento.

Posso te mandar informações sobre os planos?',
ARRAY['{nome}', '{box_nome}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_em_breve_2', 'Follow-up Em Breve — Msg 2 (1 dia)', 'follow_up',
'{nome}, tudo bem? 👋

Só passando pra lembrar que no *{box_nome}* temos aulas em vários horários.

Quando você se sentir pronto(a), estamos aqui! 💪',
ARRAY['{nome}', '{box_nome}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_em_breve_3', 'Follow-up Em Breve — Msg 3 (3 dias)', 'follow_up',
'{nome}! 🏋️

Passei pra ver se consigo te ajudar com alguma dúvida sobre o *{box_nome}*.

Qualquer coisa é só chamar! 😊',
ARRAY['{nome}', '{box_nome}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

-- Follow-up Comparando
INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_comparando_1', 'Follow-up Comparando — Msg 1 (1d)', 'follow_up',
'{nome}, boa tarde! ☀️

Ainda avaliando opções de treino?

O *{box_nome}* tem estrutura completa. Que tal uma aula experimental sem compromisso? 💪',
ARRAY['{nome}', '{box_nome}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_comparando_2', 'Follow-up Comparando — Msg 2 (7d)', 'follow_up',
'Oi {nome}! 😊

Sempre que precisar tirar dúvidas sobre o *{box_nome}*, estou aqui!

Temos planos flexíveis e você pode começar a qualquer momento. 🏋️',
ARRAY['{nome}', '{box_nome}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_comparando_3', 'Follow-up Comparando — Msg 3 (14d)', 'follow_up',
'{nome}! 👋

Última mensagem, prometo! 😄

Se um dia decidir começar, o *{box_nome}* estará sempre de portas abertas! 💪

Boa semana!',
ARRAY['{nome}', '{box_nome}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

-- Retenção
INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'retencao_3_faltas', 'Retenção — 3 Faltas', 'retencao',
'{nome}, sumiu! 😮

Faz {faltas} dias que você não aparece no *{box_nome}*...

Está tudo bem? Nossa equipe está sentindo sua falta! 💪',
ARRAY['{nome}', '{box_nome}', '{faltas}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'retencao_5_faltas', 'Retenção — 5 Faltas (Crítico)', 'retencao',
'{nome}! ⚠️

Estamos preocupados! Faz {faltas} dias sem aparecer no *{box_nome}*.

Se estiver passando por alguma dificuldade, vamos encontrar uma solução juntos. Não some! 🙏',
ARRAY['{nome}', '{box_nome}', '{faltas}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

-- Renovação
INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'renovacao_7_dias', 'Renovação — 7 Dias Antes', 'renovacao',
'Oi {nome}! 📅

Seu plano no *{box_nome}* vence em *{dias_vencimento} dias* (dia {data_vencimento}).

Para renovar é super simples — me chama aqui! 😊',
ARRAY['{nome}', '{box_nome}', '{dias_vencimento}', '{data_vencimento}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'renovacao_1_dia', 'Renovação — 1 Dia Antes', 'renovacao',
'{nome}! ⏰

Seu plano vence *amanhã* ({data_vencimento}) no *{box_nome}*.

Renova agora pra não perder o ritmo! Me chama! 💪',
ARRAY['{nome}', '{box_nome}', '{data_vencimento}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'renovacao_inadimplente', 'Cobrança Amigável', 'renovacao',
'Oi {nome}! 😊

Passando pra lembrar que seu plano no *{box_nome}* está em aberto.

Pode contar com a gente pra encontrar uma solução! Me chama. 🙏',
ARRAY['{nome}', '{box_nome}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

-- Indicação
INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'indicacao_convertida', 'Indicação Convertida', 'indicacao',
'{nome}! 🎉

Sua indicação funcionou! A pessoa que você indicou para o *{box_nome}* acabou de se matricular!

Muito obrigado por confiar em nós. Você é incrível! 💪

Seu benefício de indicação será aplicado na próxima renovação! 🎁',
ARRAY['{nome}', '{box_nome}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

-- Alertas para o dono
INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'alerta_lead_novo', 'Alerta de Novo Lead (Dono)', 'alertas',
'🔥 *Novo lead no {box_nome}!*

👤 *{nome}*
💬 "{mensagem_original}"

Acesse o painel LOTA!
_www.lota.app.br_',
ARRAY['{nome}', '{box_nome}', '{mensagem_original}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

-- Atendimento por tipo de contato
INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'aluno_ativo_resposta', 'Resposta — Aluno Ativo', 'atendimento',
'Oi {nome}! 😊

Que bom te ver por aqui! 💪

Nosso time vai te atender em breve. Se precisar de algo urgente, pode responder aqui mesmo!

Um abraço, equipe *{box_nome}* 🏋️',
ARRAY['{nome}', '{box_nome}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'aluno_cancelado_resposta', 'Resposta — Ex-aluno (Reconquista)', 'atendimento',
'{nome}! Que surpresa boa! 😄

Sentimos muito a sua falta no *{box_nome}*! 💪

Temos novidades e condições especiais para alunos que querem retornar.

Quer saber mais? É só me falar! 🏋️',
ARRAY['{nome}', '{box_nome}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'aluno_inadimplente_resposta', 'Resposta — Aluno Inadimplente', 'atendimento',
'Oi {nome}! 😊

Tudo bem? Passando pra lembrar que seu plano no *{box_nome}* está com pagamento em aberto.

Pode contar com a gente pra encontrar uma solução! Me fala como posso te ajudar. 🙏',
ARRAY['{nome}', '{box_nome}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'contato_vip_resposta', 'Resposta — Contato VIP', 'atendimento',
'Oi {nome}! ⭐

Que prazer receber sua mensagem! Nossa equipe do *{box_nome}* vai te atender com prioridade.

Já estamos vendo sua mensagem! 💪',
ARRAY['{nome}', '{box_nome}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'contato_externo_resposta', 'Resposta — Fornecedor/Parceiro', 'atendimento',
'Olá! 👋

Obrigado pela mensagem! Redirecionei seu contato ao responsável do *{box_nome}*.

Você será atendido em breve! 😊',
ARRAY['{box_nome}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'alerta_contato_externo', 'Alerta Dono — Contato Externo', 'alertas',
'📩 *Nova mensagem externa no {box_nome}!*

👤 *{nome}* ({tipo})
📱 {whatsapp}
💬 "{mensagem_original}"

Verifique seu WhatsApp!',
ARRAY['{box_nome}', '{nome}', '{tipo}', '{whatsapp}', '{mensagem_original}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'alerta_aluno_mensagem', 'Alerta Dono — Aluno enviou mensagem', 'alertas',
'💬 *{nome} enviou mensagem no {box_nome}!*

📱 {whatsapp}
🏷️ Status: {status_aluno}
💬 "{mensagem_original}"

Acesse o painel LOTA para ver mais detalhes.',
ARRAY['{box_nome}', '{nome}', '{whatsapp}', '{status_aluno}', '{mensagem_original}'] FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

-- ─── 5. Confirmação ──────────────────────────────────────────────────────────
SELECT
  t.nome AS tabela,
  COUNT(*) AS registros
FROM (
  SELECT 'templates' AS nome FROM templates WHERE box_id = (SELECT id FROM boxes WHERE slug = 'bravefit')
  UNION ALL
  SELECT 'contatos_especiais' FROM contatos_especiais WHERE box_id = (SELECT id FROM boxes WHERE slug = 'bravefit')
) t
GROUP BY t.nome;
