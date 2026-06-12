-- ============================================================
-- FitLead — Migration 004: Seed Data (Dados de Teste)
-- ⚠️ Execute no SQL Editor do Supabase Dashboard APÓS 003
-- ⚠️ APENAS em ambiente de desenvolvimento/teste!
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- Box de Demonstração: CrossFit Zona Norte
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.boxes (
  id, nome, slug, dono_nome, dono_whatsapp, dono_email,
  plano, limite_msgs_dia, ativo
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'CrossFit Zona Norte',
  'crossfit-zona-norte',
  'Carlos Oliveira',
  '+5511999990001',
  'carlos@crossfitzonanorte.com.br',
  'pro',
  25,
  true
) ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Leads de Teste
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.leads (
  id, box_id, nome, whatsapp, email, origem, status,
  momento_compra, interesse, score, lgpd_consent, lgpd_consent_em
) VALUES
  -- Lead quente - quer se matricular logo
  (
    'lead0001-0000-0000-0000-000000000001',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Ana Costa', '+5511999990010', 'ana@email.com',
    'whatsapp', 'qualificado', 'agora',
    ARRAY['crossfit'], 75, true, NOW() - INTERVAL '2 hours'
  ),
  -- Lead morno - pensando ainda
  (
    'lead0002-0000-0000-0000-000000000002',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Bruno Silva', '+5511999990011', NULL,
    'lead_ads_meta', 'em_conversa', 'em_breve',
    ARRAY['funcional', 'musculacao'], 45, true, NOW() - INTERVAL '1 day'
  ),
  -- Lead novo - acabou de chegar
  (
    'lead0003-0000-0000-0000-000000000003',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Mariana Souza', '+5511999990012', 'mari@email.com',
    'landing_page', 'novo', 'comparando',
    ARRAY['musculacao'], 20, true, NOW() - INTERVAL '30 minutes'
  ),
  -- Lead perdido
  (
    'lead0004-0000-0000-0000-000000000004',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Ricardo Lima', '+5511999990013', NULL,
    'whatsapp', 'perdido', NULL,
    ARRAY['crossfit'], 15, true, NOW() - INTERVAL '10 days'
  )
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Alunos de Teste
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.alunos (
  id, box_id, nome, whatsapp, email, plano,
  valor_mensalidade, dia_vencimento, data_inicio, data_vencimento,
  status, faltas_consecutivas, nps_score
) VALUES
  -- Aluno ativo e engajado
  (
    'aluno001-0000-0000-0000-000000000001',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Fernanda Rocha', '+5511999990020', 'fernanda@email.com',
    'Plano Mensal', 250.00, 10,
    CURRENT_DATE - INTERVAL '6 months', CURRENT_DATE + INTERVAL '10 days',
    'ativo', 0, 9
  ),
  -- Aluno com risco de cancelamento (3 faltas)
  (
    'aluno002-0000-0000-0000-000000000002',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Gabriel Santos', '+5511999990021', NULL,
    'Plano Trimestral', 220.00, 15,
    CURRENT_DATE - INTERVAL '3 months', CURRENT_DATE + INTERVAL '15 days',
    'ativo', 3, NULL
  ),
  -- Aluno inadimplente
  (
    'aluno003-0000-0000-0000-000000000003',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Juliana Ferreira', '+5511999990022', 'ju@email.com',
    'Plano Mensal', 250.00, 5,
    CURRENT_DATE - INTERVAL '2 months', CURRENT_DATE - INTERVAL '5 days',
    'inadimplente', 5, NULL
  ),
  -- Aluno com renovação próxima (7 dias)
  (
    'aluno004-0000-0000-0000-000000000004',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Pedro Martins', '+5511999990023', 'pedro@email.com',
    'Plano Anual', 200.00, 20,
    CURRENT_DATE - INTERVAL '11 months', CURRENT_DATE + INTERVAL '7 days',
    'ativo', 1, 8
  )
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Presenças de Teste (últimos 30 dias)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.presencas (box_id, aluno_id, data_presenca)
SELECT
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'aluno001-0000-0000-0000-000000000001',
  CURRENT_DATE - (s || ' days')::INTERVAL
FROM generate_series(0, 25, 2) AS s
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- Notificações de Teste
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.notificacoes (box_id, tipo, titulo, corpo, payload, lida) VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'lead_novo',
    '👤 Novo lead chegou!',
    'Mariana Souza entrou em contato via landing_page.',
    '{"lead_nome": "Mariana Souza", "origem": "landing_page"}',
    false
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'risco_cancelamento',
    '⚠️ Gabriel está sumindo',
    'Gabriel Santos não aparece há 3 dias. Entre em contato!',
    '{"aluno_nome": "Gabriel Santos", "faltas": 3}',
    false
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'inadimplencia',
    '💰 Pagamento atrasado',
    'Juliana Ferreira está com 5 dias de atraso.',
    '{"aluno_nome": "Juliana Ferreira", "dias_atraso": 5}',
    false
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'renovacao_proxima',
    '🔄 Renovação em 7 dias',
    'Pedro Martins renova em 7 dias. Confirme com ele!',
    '{"aluno_nome": "Pedro Martins", "dias": 7}',
    true
  );

SELECT 'Migration 004 — Seed Data: OK ✅' AS resultado;
SELECT 'Box de teste: CrossFit Zona Norte (a1b2c3d4-...)' AS info;
SELECT 'Leads: 4 | Alunos: 4 | Notificações: 4' AS summary;
