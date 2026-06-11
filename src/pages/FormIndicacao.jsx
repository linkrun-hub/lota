/**
 * FormIndicacao.jsx — Landing page pública de indicação
 * Rota: /i/:token
 * Acessível SEM autenticação
 */
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function Spinner() {
  return (
    <div style={{
      width: 32, height: 32, border: '3px solid rgba(255,184,0,0.2)',
      borderTopColor: '#FFB800', borderRadius: '50%',
      animation: 'spin 0.8s linear infinite', margin: '0 auto',
    }} />
  )
}

export default function FormIndicacao() {
  // Extrai token da URL: /i/:token
  const token = window.location.pathname.split('/i/')[1]?.split('/')[0] || ''

  const [indicacao, setIndicacao] = useState(null)
  const [box, setBox] = useState(null)
  const [aluno, setAluno] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({ nome: '', whatsapp: '', lgpd: false })
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    if (!token) { setErro('Link inválido'); setLoading(false); return }
    carregarDados()
  }, [token])

  const carregarDados = async () => {
    setLoading(true)
    try {
      // Busca indicação pelo token
      const { data: ind } = await supabase
        .from('indicacoes')
        .select('*, aluno_indicador_id')
        .eq('token', token)
        .single()

      if (!ind) { setErro('Link de indicação não encontrado ou expirado.'); return }
      if (ind.status === 'expirado') { setErro('Este link de indicação expirou.'); return }
      if (ind.status === 'convertido') { setErro('Este link já foi utilizado!'); return }

      setIndicacao(ind)

      // Busca dados do box
      const { data: b } = await supabase.from('boxes').select('nome, slug').eq('id', ind.box_id).single()
      setBox(b)

      // Busca nome do aluno indicador
      const { data: a } = await supabase.from('alunos').select('nome').eq('id', ind.aluno_indicador_id).single()
      setAluno(a)

    } catch (e) {
      setErro('Erro ao carregar dados. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!form.nome.trim()) { alert('Informe seu nome'); return }
    if (!form.whatsapp.trim()) { alert('Informe seu WhatsApp'); return }
    if (!form.lgpd) { alert('Aceite a política de privacidade para continuar'); return }

    setEnviando(true)
    try {
      // Formata o número
      const wpp = form.whatsapp.replace(/\D/g, '')
      const whatsapp = wpp.startsWith('55') ? `+${wpp}` : `+55${wpp}`

      // Verifica se já existe lead com esse número neste box
      const { data: leadExistente } = await supabase
        .from('leads')
        .select('id')
        .eq('box_id', indicacao.box_id)
        .eq('whatsapp', whatsapp)
        .maybeSingle()

      let leadId = leadExistente?.id

      if (!leadId) {
        // Cria o lead
        const { data: novoLead, error } = await supabase
          .from('leads')
          .insert({
            box_id:          indicacao.box_id,
            nome:            form.nome.trim(),
            whatsapp,
            origem:          'indicacao',
            status:          'novo',
            momento_compra:  'agora', // indicados tendem a querer logo
            lgpd_consent:    true,
            lgpd_consent_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) throw error
        leadId = novoLead.id

        // Cria sequência de follow-up (indicado: começa em 1h)
        await supabase.from('follow_up_sequencias').insert({
          box_id:             indicacao.box_id,
          lead_id:            leadId,
          momento_compra:     'agora',
          step_atual:         1,
          proximo_disparo_at: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
          status:             'ativo',
        })

        // Enfileira boas-vindas
        await supabase.from('disparo_fila').insert({
          box_id:            indicacao.box_id,
          destinatario_tipo: 'lead',
          destinatario_id:   leadId,
          canal:             'whatsapp',
          template_key:      'lead_boas_vindas',
          payload:           { nome: form.nome.trim(), box_nome: box?.nome || 'nosso box' },
          agendado_para:     new Date().toISOString(),
          status:            'pendente',
        })
      }

      // Vincula lead à indicação
      await supabase
        .from('indicacoes')
        .update({ lead_indicado_id: leadId })
        .eq('id', indicacao.id)

      // Notificação no painel para o dono
      await supabase.from('notificacoes').insert({
        box_id:  indicacao.box_id,
        tipo:    'lead_novo',
        titulo:  `🎁 ${form.nome.trim()} chegou via indicação de ${aluno?.nome || 'um aluno'}!`,
        corpo:   `Novo lead por indicação. WhatsApp: ${whatsapp}`,
        payload: { lead_id: leadId, indicacao_id: indicacao.id },
        lida:    false,
      })

      setSucesso(true)
    } catch (e) {
      alert('Erro ao enviar. Tente novamente.')
      console.error(e)
    } finally {
      setEnviando(false)
    }
  }

  // ─── Tela de carregamento ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner />
      </div>
    )
  }

  // ─── Tela de erro ─────────────────────────────────────────────────────────
  if (erro) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A10', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😔</div>
          <h2 style={{ color: '#EF4444', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Link inválido</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6 }}>{erro}</p>
        </div>
      </div>
    )
  }

  // ─── Tela de sucesso ──────────────────────────────────────────────────────
  if (sucesso) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0A10', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h2 style={{ color: '#10B981', fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
            Cadastro realizado!
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>
            Obrigado, <strong style={{ color: '#fff' }}>{form.nome.split(' ')[0]}</strong>!
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6 }}>
            A equipe do <strong style={{ color: '#FFB800' }}>{box?.nome}</strong> vai entrar em contato com você
            pelo WhatsApp em breve. 💪
          </p>
          <div style={{
            marginTop: 24, padding: '14px 20px',
            background: 'rgba(255,184,0,0.08)', border: '1px solid rgba(255,184,0,0.2)',
            borderRadius: 10, fontSize: 13, color: 'rgba(255,255,255,0.6)',
          }}>
            Você foi indicado por <strong style={{ color: '#FFB800' }}>{aluno?.nome?.split(' ')[0] || 'um amigo'}</strong> 🙌
          </div>
        </div>
      </div>
    )
  }

  // ─── Formulário ───────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0A0A10 0%, #0F0F1A 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: "'Inter', 'Outfit', sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Header com branding */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 16, marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(255,184,0,0.2), rgba(255,184,0,0.05))',
            border: '1px solid rgba(255,184,0,0.3)',
            fontSize: 32,
          }}>
            🏋️
          </div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
            {box?.nome || 'Nosso Box'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
            {aluno?.nome?.split(' ')[0]} te convidou para conhecer!
          </p>
        </div>

        {/* Card do formulário */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16, padding: 28,
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{
            background: 'rgba(255,184,0,0.06)', border: '1px solid rgba(255,184,0,0.15)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 24,
            fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6,
          }}>
            🎁 <strong style={{ color: '#FFB800' }}>Você foi convidado!</strong> Preencha seus dados
            e a equipe entra em contato pelo WhatsApp com todas as informações.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: 6, display: 'block' }}>
                Seu nome *
              </label>
              <input
                value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                placeholder="Como você se chama?"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 14, boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: 6, display: 'block' }}>
                Seu WhatsApp *
              </label>
              <input
                value={form.whatsapp}
                onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
                placeholder="(11) 99999-9999"
                type="tel"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 8,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 14, boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {/* LGPD */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.lgpd}
                onChange={e => setForm(p => ({ ...p, lgpd: e.target.checked }))}
                style={{ marginTop: 2, accentColor: '#FFB800', flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                Autorizo o <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{box?.nome}</strong> a entrar em contato
                comigo pelo WhatsApp com informações sobre planos e atividades.
              </span>
            </label>

            <button
              onClick={handleSubmit}
              disabled={enviando}
              style={{
                padding: '14px', borderRadius: 10, border: 'none',
                background: enviando ? 'rgba(255,184,0,0.4)' : 'linear-gradient(135deg, #FFB800, #FF8800)',
                color: '#000', fontWeight: 700, fontSize: 15, cursor: enviando ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {enviando ? '⏳ Enviando...' : '🏋️ Quero conhecer!'}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
          Powered by <span style={{ color: 'rgba(255,255,255,0.4)' }}>LOTA</span> · www.lota.app.br
        </p>
      </div>
    </div>
  )
}
