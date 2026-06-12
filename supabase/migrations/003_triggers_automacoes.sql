-- ============================================================
-- FitLead — Migration 003: Triggers de Automação
-- ⚠️ Execute no SQL Editor do Supabase Dashboard APÓS 002
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TRIGGER 1: Novo lead → cria sequência de follow-up
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.criar_sequencia_followup()
RETURNS TRIGGER AS $$
DECLARE
  primeiro_disparo TIMESTAMPTZ;
  momento TEXT;
BEGIN
  -- Só cria sequência se tem consentimento LGPD e não é opt-out
  IF NEW.lgpd_consent = false OR NEW.opt_out = true THEN
    RETURN NEW;
  END IF;

  -- Define momento_compra padrão se não informado
  momento := COALESCE(NEW.momento_compra, 'comparando');

  -- Define o primeiro disparo baseado no momento
  primeiro_disparo := CASE momento
    WHEN 'agora'      THEN NOW() + INTERVAL '1 hour'
    WHEN 'em_breve'   THEN NOW() + INTERVAL '3 hours'
    WHEN 'comparando' THEN NOW() + INTERVAL '1 day'
    ELSE NOW() + INTERVAL '1 day'
  END;

  -- Respeita horário comercial: se fora do range 9h-20h, agenda pro dia seguinte 9h
  -- (lógica simplificada — refinamento na camada de aplicação)

  INSERT INTO public.follow_up_sequencias (
    box_id, lead_id, momento_compra, step_atual, proximo_disparo_em, status
  ) VALUES (
    NEW.box_id, NEW.id, momento, 1, primeiro_disparo, 'ativo'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_novo_lead_sequencia
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.criar_sequencia_followup();

-- ─────────────────────────────────────────────────────────────
-- TRIGGER 2: Opt-out → cancela sequências ativas
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.processar_opt_out_lead()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.opt_out = true AND OLD.opt_out = false THEN
    -- Cancela todas as sequências ativas
    UPDATE public.follow_up_sequencias
    SET status = 'opt_out', atualizado_em = NOW()
    WHERE lead_id = NEW.id AND status = 'ativo';

    -- Cancela mensagens pendentes na fila
    UPDATE public.disparo_fila
    SET status = 'cancelado'
    WHERE destinatario_id = NEW.id 
      AND destinatario_tipo = 'lead'
      AND status = 'pendente';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_opt_out_lead
  AFTER UPDATE ON public.leads
  FOR EACH ROW 
  WHEN (NEW.opt_out IS DISTINCT FROM OLD.opt_out)
  EXECUTE FUNCTION public.processar_opt_out_lead();

-- ─────────────────────────────────────────────────────────────
-- TRIGGER 3: Lead convertido → para sequência de follow-up
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.lead_convertido_para_sequencia()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'convertido' AND OLD.status != 'convertido' THEN
    UPDATE public.follow_up_sequencias
    SET status = 'convertido', atualizado_em = NOW()
    WHERE lead_id = NEW.id AND status = 'ativo';

    -- Cancela mensagens pendentes de follow-up
    UPDATE public.disparo_fila
    SET status = 'cancelado'
    WHERE destinatario_id = NEW.id
      AND destinatario_tipo = 'lead'
      AND status = 'pendente';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_lead_convertido
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.lead_convertido_para_sequencia();

-- ─────────────────────────────────────────────────────────────
-- TRIGGER 4: Nova presença → recalcula faltas_consecutivas
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recalcular_faltas()
RETURNS TRIGGER AS $$
DECLARE
  ultima_presenca DATE;
  dias_sem_ir INTEGER;
BEGIN
  -- Ao registrar uma presença, zera o contador de faltas
  UPDATE public.alunos
  SET faltas_consecutivas = 0, atualizado_em = NOW()
  WHERE id = NEW.aluno_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_presenca_faltas
  AFTER INSERT ON public.presencas
  FOR EACH ROW EXECUTE FUNCTION public.recalcular_faltas();

-- ─────────────────────────────────────────────────────────────
-- TRIGGER 5: Aluno status → notifica dono
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notificar_status_aluno()
RETURNS TRIGGER AS $$
BEGIN
  -- Cancelamento
  IF NEW.status = 'cancelado' AND OLD.status != 'cancelado' THEN
    INSERT INTO public.notificacoes (box_id, tipo, titulo, corpo, payload)
    VALUES (
      NEW.box_id,
      'risco_cancelamento',
      '⚠️ Aluno cancelou matrícula',
      format('%s cancelou a matrícula. Verifique o motivo e tente uma recuperação.', NEW.nome),
      jsonb_build_object('aluno_id', NEW.id, 'aluno_nome', NEW.nome, 'status_anterior', OLD.status)
    );
  END IF;

  -- Inadimplência
  IF NEW.status = 'inadimplente' AND OLD.status != 'inadimplente' THEN
    INSERT INTO public.notificacoes (box_id, tipo, titulo, corpo, payload)
    VALUES (
      NEW.box_id,
      'inadimplencia',
      '💰 Aluno inadimplente',
      format('%s está com pagamento em atraso.', NEW.nome),
      jsonb_build_object('aluno_id', NEW.id, 'aluno_nome', NEW.nome, 'vencimento', NEW.data_vencimento)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_status_aluno_notificacao
  AFTER UPDATE ON public.alunos
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.notificar_status_aluno();

-- ─────────────────────────────────────────────────────────────
-- TRIGGER 6: Novo lead → notificação imediata para dono
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notificar_novo_lead()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notificacoes (box_id, tipo, titulo, corpo, payload)
  VALUES (
    NEW.box_id,
    'lead_novo',
    '👤 Novo lead chegou!',
    format('%s entrou em contato via %s.', NEW.nome, NEW.origem),
    jsonb_build_object(
      'lead_id', NEW.id,
      'lead_nome', NEW.nome,
      'lead_whatsapp', NEW.whatsapp,
      'origem', NEW.origem
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_novo_lead_notificacao
  AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notificar_novo_lead();

-- ─────────────────────────────────────────────────────────────
-- FUNÇÃO: Verificar e marcar alunos com faltas críticas
-- Chamada pelo cron diário (via API route)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.verificar_faltas_alunos(p_box_id UUID)
RETURNS TABLE(aluno_id UUID, nome TEXT, faltas INTEGER, nivel TEXT) AS $$
DECLARE
  aluno RECORD;
  dias_sem_presenca INTEGER;
BEGIN
  FOR aluno IN
    SELECT a.id, a.nome, a.faltas_consecutivas,
           a.whatsapp, a.opt_out, a.box_id
    FROM public.alunos a
    WHERE a.box_id = p_box_id
      AND a.status = 'ativo'
      AND a.opt_out = false
  LOOP
    -- Calcula dias desde última presença
    SELECT COALESCE(
      EXTRACT(DAY FROM NOW() - MAX(p.criado_em))::INTEGER,
      EXTRACT(DAY FROM NOW() - aluno_ref.data_inicio)::INTEGER
    )
    INTO dias_sem_presenca
    FROM public.presencas p
    WHERE p.aluno_id = aluno.id;

    -- Atualiza contador
    UPDATE public.alunos
    SET faltas_consecutivas = COALESCE(dias_sem_presenca, faltas_consecutivas)
    WHERE id = aluno.id
    RETURNING id, nome, faltas_consecutivas INTO aluno_id, nome, faltas;

    -- Define nível de risco
    IF faltas >= 5 THEN
      nivel := 'critico';
    ELSIF faltas >= 3 THEN
      nivel := 'atencao';
    ELSE
      nivel := 'ok';
    END IF;

    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT 'Migration 003 — Triggers de Automação: OK ✅' AS resultado;
