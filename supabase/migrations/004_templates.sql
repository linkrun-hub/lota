-- ============================================================
-- MIGRATION: templates — mensagens configuráveis por box
-- Execute no Supabase SQL Editor:
-- supabase.com/dashboard/project/favryvjzvfdqlftkyhpi/sql
-- ============================================================

CREATE TABLE IF NOT EXISTS templates (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  box_id       uuid        REFERENCES boxes(id) ON DELETE CASCADE NOT NULL,
  key          text        NOT NULL,
  nome         text        NOT NULL,
  categoria    text        NOT NULL,
  canal        text        DEFAULT 'whatsapp',
  ativo        boolean     DEFAULT true,
  texto        text        NOT NULL,
  variaveis    text[]      DEFAULT '{}',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(box_id, key)
);

-- RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "templates_box_policy"
ON templates FOR ALL
USING (true)
WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insere templates padrão para o box BraveFit
-- (rode depois de ter o box_id correto)
INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT 
  id,
  'lead_boas_vindas',
  'Boas-vindas (WhatsApp)',
  'boas_vindas',
  'Oi {nome}! 😊

Que bom que entrou em contato com o *{box_nome}*! 💪

Me conta: você está buscando começar do zero ou tem algum objetivo específico?

Assim consigo te indicar o melhor plano! 🏋️',
  ARRAY['{nome}', '{box_nome}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_agora_1', 'Follow-up Agora — Mensagem 1 (1h)', 'follow_up',
  '{nome}, oi! 👋

Ainda temos horários disponíveis essa semana no *{box_nome}*!

Qual seria o melhor horário pra você vir conhecer? Sem compromisso! 😊',
  ARRAY['{nome}', '{box_nome}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_agora_2', 'Follow-up Agora — Mensagem 2 (3h)', 'follow_up',
  '{nome}! 🔥

Você sabia que quem começa esse mês no *{box_nome}* garante condições especiais?

Manda uma mensagem que te conto os detalhes! 😉',
  ARRAY['{nome}', '{box_nome}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_agora_3', 'Follow-up Agora — Mensagem 3 (24h)', 'follow_up',
  '{nome}, última chamada! ⏰

Temos apenas algumas vagas essa semana no *{box_nome}*.

Posso reservar uma pra você? É só confirmar! 💪',
  ARRAY['{nome}', '{box_nome}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_em_breve_1', 'Follow-up Em Breve — Mensagem 1 (3h)', 'follow_up',
  'Oi {nome}! 😊

Entendo que você quer se planejar. No *{box_nome}* temos opções pra todo tipo de agenda e orçamento.

Posso te mandar informações sobre os planos?',
  ARRAY['{nome}', '{box_nome}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_em_breve_2', 'Follow-up Em Breve — Mensagem 2 (1 dia)', 'follow_up',
  '{nome}, tudo bem? 👋

Só passando pra lembrar que no *{box_nome}* temos aulas em vários horários.

Quando você se sentir pronto(a), estamos aqui! 💪',
  ARRAY['{nome}', '{box_nome}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_em_breve_3', 'Follow-up Em Breve — Mensagem 3 (3 dias)', 'follow_up',
  '{nome}! 🏋️

Passei pra ver se consigo te ajudar com alguma dúvida sobre o *{box_nome}*.

Qualquer coisa é só chamar! 😊',
  ARRAY['{nome}', '{box_nome}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_comparando_1', 'Follow-up Comparando — Mensagem 1 (1 dia)', 'follow_up',
  '{nome}, boa tarde! ☀️

Ainda avaliando opções de treino?

O *{box_nome}* tem estrutura completa. Que tal uma aula experimental sem compromisso? 💪',
  ARRAY['{nome}', '{box_nome}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_comparando_2', 'Follow-up Comparando — Mensagem 2 (7 dias)', 'follow_up',
  'Oi {nome}! 😊

Sempre que precisar tirar dúvidas sobre o *{box_nome}*, estou aqui!

Temos planos flexíveis e você pode começar a qualquer momento. 🏋️',
  ARRAY['{nome}', '{box_nome}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'followup_comparando_3', 'Follow-up Comparando — Mensagem 3 (14 dias)', 'follow_up',
  '{nome}! 👋

Última mensagem, prometo! 😄

Se um dia decidir começar, o *{box_nome}* estará sempre de portas abertas! 💪

Boa semana!',
  ARRAY['{nome}', '{box_nome}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'retencao_3_faltas', 'Retenção — 3 Faltas Consecutivas', 'retencao',
  '{nome}, sumiu! 😮

Faz {faltas} dias que você não aparece no *{box_nome}*...

Está tudo bem? Nossa equipe está sentindo sua falta! 💪',
  ARRAY['{nome}', '{box_nome}', '{faltas}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'retencao_5_faltas', 'Retenção — 5 Faltas Consecutivas', 'retencao',
  '{nome}! ⚠️

Estamos preocupados! Faz {faltas} dias sem aparecer no *{box_nome}*.

Se estiver passando por alguma dificuldade, vamos encontrar uma solução juntos. Não some! 🙏',
  ARRAY['{nome}', '{box_nome}', '{faltas}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'renovacao_7_dias', 'Renovação — 7 Dias Antes', 'renovacao',
  'Oi {nome}! 📅

Seu plano no *{box_nome}* vence em *{dias_vencimento} dias* (dia {data_vencimento}).

Para renovar é super simples — me chama aqui! 😊',
  ARRAY['{nome}', '{box_nome}', '{dias_vencimento}', '{data_vencimento}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'renovacao_1_dia', 'Renovação — 1 Dia Antes', 'renovacao',
  '{nome}! ⏰

Seu plano vence *amanhã* ({data_vencimento}) no *{box_nome}*.

Renova agora pra não perder o ritmo! Me chama! 💪',
  ARRAY['{nome}', '{box_nome}', '{data_vencimento}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'renovacao_inadimplente', 'Cobrança Amigável (Inadimplente)', 'renovacao',
  'Oi {nome}! 😊

Passando pra lembrar que seu plano no *{box_nome}* está em aberto.

Pode contar com a gente pra encontrar uma solução! Me chama. 🙏',
  ARRAY['{nome}', '{box_nome}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'indicacao_convertida', 'Indicação Convertida', 'indicacao',
  '{nome}! 🎉

Sua indicação funcionou! A pessoa que você indicou para o *{box_nome}* acabou de se matricular!

Muito obrigado por confiar em nós. Você é incrível! 💪

Seu benefício de indicação será aplicado na próxima renovação! 🎁',
  ARRAY['{nome}', '{box_nome}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

INSERT INTO templates (box_id, key, nome, categoria, texto, variaveis)
SELECT id, 'alerta_lead_novo', 'Alerta de Novo Lead (para o Dono)', 'alertas',
  '🔥 *Novo lead no {box_nome}!*

👤 *{nome}*
💬 "{mensagem_original}"

Acesse o painel LOTA!
_www.lota.app.br_',
  ARRAY['{nome}', '{box_nome}', '{mensagem_original}']
FROM boxes WHERE slug = 'bravefit'
ON CONFLICT (box_id, key) DO NOTHING;

-- Confirma
SELECT key, nome, categoria, ativo FROM templates ORDER BY categoria, key;
