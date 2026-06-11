/**
 * src/pages/ComoFunciona.jsx
 * Landing page pública de apresentação do LOTA para donos de box.
 * Rota: /como-funciona (sem autenticação)
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import LotaLogo from '../components/shared/LotaLogo'

const WA_LINK = 'https://wa.me/5531988001122?text=Oi%2C%20quero%20conhecer%20o%20LOTA%20e%20testar%20gr%C3%A1tis!'

// ─── Hook: scroll reveal ──────────────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.15 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

// ─── Hook: contador animado ───────────────────────────────────────────────────
function useCounter(target, duration = 1500, active = false) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      setVal(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [active, target, duration])
  return val
}

// ─── Componente: Seção animada no scroll ─────────────────────────────────────
function Section({ children, style = {}, className = '' }) {
  const [ref, visible] = useScrollReveal()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: 'opacity 0.7s ease, transform 0.7s ease',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── Componente: Balão de WhatsApp ────────────────────────────────────────────
function WaBubble({ msg, side = 'left', time = '09:01', delay = 0, visible = true }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: side === 'right' ? 'flex-end' : 'flex-start',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: `opacity 0.4s ease ${delay}s, transform 0.4s ease ${delay}s`,
        marginBottom: 8,
      }}
    >
      <div
        style={{
          maxWidth: '78%',
          background: side === 'right' ? '#005C4B' : '#1F2C34',
          borderRadius: side === 'right' ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
          padding: '8px 12px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
        }}
      >
        {side === 'left' && (
          <p style={{ fontSize: 11, color: '#00E5FF', fontWeight: 600, marginBottom: 2 }}>LOTA ⚡</p>
        )}
        <p style={{ fontSize: 14, color: '#E8E8F0', lineHeight: 1.5 }}>{msg}</p>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'right', marginTop: 4 }}>
          {time} {side === 'right' ? '✓✓' : ''}
        </p>
      </div>
    </div>
  )
}

// ─── Dados da jornada ─────────────────────────────────────────────────────────
const JORNADA = [
  {
    icone: '📲',
    hora: 'Hora 0',
    titulo: 'Lead chega pelo WhatsApp',
    desc: 'Alguém viu seu Instagram, clicou no link e mandou mensagem. Você está na quadra treinando.',
    cor: '#00E5FF',
    chat: [
      { msg: 'Oi! Vi o perfil de vocês e quero saber mais sobre os planos 😊', side: 'right', time: '09:00' },
      { msg: 'Olá, Lucas! Que ótimo ter você aqui 🙌\nSou a assistente do BraveFit. Me conta: você já pratica CrossFit ou vai começar agora?', side: 'left', time: '09:00' },
    ],
  },
  {
    icone: '🎯',
    hora: 'Hora 1',
    titulo: 'Qualificação automática',
    desc: 'O LOTA identifica o momento de compra, o interesse e o nível do lead — sem você fazer nada.',
    cor: '#A78BFA',
    chat: [
      { msg: 'Já treinei antes, mas parei há 6 meses. Quero retomar!', side: 'right', time: '09:03' },
      { msg: 'Perfeito, Lucas! Você prefere treinar de manhã ou à tarde?\nTemos turmas com capacidade limitada, mas ainda temos vagas 🔥', side: 'left', time: '09:03' },
      { msg: 'De manhã, entre 6h e 8h', side: 'right', time: '09:05' },
    ],
  },
  {
    icone: '🔄',
    hora: 'Horas 3, 24 e 72',
    titulo: 'Follow-up automático (nunca esquece)',
    desc: 'Se o lead sumiu, o sistema manda follow-up no timing certo baseado no perfil dele. Sem spam, sem invasão.',
    cor: '#FFB800',
    chat: [
      { msg: 'Lucas, passaram 3 horas e vi que você ainda não viu nossa proposta de planos. Ficou alguma dúvida? 😊', side: 'left', time: '12:00' },
      { msg: 'Opa! Esqueci de responder. Qual o valor mensal?', side: 'right', time: '18:42' },
      { msg: 'Nosso plano mensal é R$189. Mas temos uma condição especial essa semana para quem fechar até sexta 📅', side: 'left', time: '18:42' },
    ],
  },
  {
    icone: '🔥',
    hora: 'Quando está quente',
    titulo: 'Você só entra quando o lead está pronto',
    desc: 'O sistema avisa você no WhatsApp quando o lead está qualificado e pronto para fechar. Você entra no momento certo — sem perder tempo com "só quero saber o preço".',
    cor: '#FF4444',
    chat: [
      { msg: '🔥 *LOTA — Alerta: Lead Quente*\n\nLucas Silva respondeu 3 mensagens, perguntou sobre planos e disse que quer começar essa semana.\n\n👉 Hora de fechar! Clique para chamar no WhatsApp.', side: 'left', time: '18:43' },
    ],
  },
  {
    icone: '🎉',
    hora: 'Matrícula fechada',
    titulo: 'Lead vira aluno — boas-vindas automática',
    desc: 'Assim que a matrícula é confirmada no sistema, o aluno recebe uma mensagem de boas-vindas, informações da turma e um link de indicação para chamar um amigo.',
    cor: '#22C55E',
    chat: [
      { msg: 'Bem-vindo ao BraveFit, Lucas! 🏋️‍♂️🎉\n\nSua primeira aula é amanhã às 06h30.\nEndereço: Rua das Quaresmeiras, 42.\n\nInclusive, se você indicar um amigo, ganha 30% de desconto no próximo mês! 🎁', side: 'left', time: '19:01' },
    ],
  },
  {
    icone: '🔄',
    hora: '3 semanas depois',
    titulo: 'Retenção — sistema cuida do aluno',
    desc: '3 faltas consecutivas? O sistema manda "Sumiu?" automaticamente. Vencimento chegando? Lembrete enviado. NPS alto? Convite para indicar.',
    cor: '#0070F3',
    chat: [
      { msg: 'Lucas, sumiu? 😅 Já são 3 aulas sem ver você na quadra.\nTá tudo bem? A turma sentiu sua falta! Quer remarcar?', side: 'left', time: '07:01' },
      { msg: 'Kkk verdade! Viajei. Volto segunda!', side: 'right', time: '07:15' },
    ],
  },
]

const ORIGENS = [
  {
    icone: '📣',
    titulo: 'Meta / Google Ads',
    cor: '#1877F2',
    desc: 'Lead preenche formulário do anúncio → LOTA recebe via webhook → follow-up começa em < 1 hora.',
  },
  {
    icone: '💬',
    titulo: 'WhatsApp direto',
    cor: '#25D366',
    desc: 'Alguém manda mensagem no seu número → integração com BotConversa → LOTA qualifica automaticamente.',
  },
  {
    icone: '🌐',
    titulo: 'Formulário público',
    cor: '#A78BFA',
    desc: 'Link único do seu box (lota.app/f/bravefit) → compartilha no Stories → lead cai direto no funil.',
  },
  {
    icone: '🎁',
    titulo: 'Indicação de aluno',
    cor: '#FFB800',
    desc: 'Aluno satisfeito compartilha link → amigo se cadastra → sistema credita o prêmio automaticamente.',
  },
]

const MODULOS = [
  { icone: '🎯', nome: 'Leads', desc: 'Funil visual Kanban + tabela com todos os contatos e histórico completo.' },
  { icone: '📡', nome: 'Captação', desc: 'Formulário público com link exclusivo + métricas de conversão por canal.' },
  { icone: '🎁', nome: 'Indicações', desc: 'Programa de referral com link único, ranking e controle de prêmios.' },
  { icone: '🔄', nome: 'Retenção', desc: 'Alertas de faltas, renovações próximas e NPS dos alunos.' },
  { icone: '🏋', nome: 'Gestão', desc: 'Controle de alunos, turmas, presenças e financeiro (MRR).' },
  { icone: '📣', nome: 'Disparos', desc: 'Campanhas de WhatsApp e email com segmentação e conformidade LGPD.' },
]

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ComoFunciona() {
  const navigate = useNavigate()
  const [heroRef, heroVisible] = useScrollReveal()
  const [statsRef, statsVisible] = useScrollReveal()
  const [jornadaAtiva, setJornadaAtiva] = useState(0)
  const [roiLeads, setRoiLeads] = useState(30)

  const conv = useCounter(34, 1200, statsVisible)
  const horas = useCounter(3, 1200, statsVisible)
  const taxa = useCounter(0, 1200, statsVisible)

  // Avança jornada automaticamente
  useEffect(() => {
    const t = setInterval(() => {
      setJornadaAtiva((a) => (a + 1) % JORNADA.length)
    }, 4000)
    return () => clearInterval(t)
  }, [])

  const roiAlunos = Math.round(roiLeads * 0.3)
  const roiMrr = roiAlunos * 189

  return (
    <div style={{ background: '#0A0A0F', color: '#E8E8F0', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 60,
      }}>
        <LotaLogo variant="wordmark" color="dark" width={100} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={() => navigate('/login')}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.1)',
              color: '#9CA3AF', borderRadius: 8, padding: '7px 16px',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            Acessar painel
          </button>
          <a
            href={WA_LINK}
            target="_blank"
            rel="noreferrer"
            style={{
              background: 'linear-gradient(135deg, #0070F3, #00E5FF)',
              color: '#000', fontWeight: 700, borderRadius: 8,
              padding: '8px 18px', fontSize: 13, textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            💬 Falar no WhatsApp
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Glows */}
        <div style={{ position: 'absolute', top: '15%', left: '10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(0,112,243,0.07) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(0,229,255,0.05) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

        <div
          ref={heroRef}
          style={{
            textAlign: 'center', maxWidth: 780, position: 'relative', zIndex: 1,
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(40px)',
            transition: 'opacity 0.9s ease, transform 0.9s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
            <LotaLogo variant="icon" color="dark" width={80} />
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#00E5FF', fontWeight: 600, marginBottom: 24 }}>
            <span>⚡</span> o sistema que lota seu negócio
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 6vw, 62px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 20, letterSpacing: '-1px' }}>
            Seu box <span style={{ background: 'linear-gradient(135deg, #0070F3, #00E5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>lotado</span>.<br />
            Sem você ficar colado no celular.
          </h1>
          <p style={{ fontSize: 18, color: '#9CA3AF', lineHeight: 1.7, marginBottom: 36, maxWidth: 580, margin: '0 auto 36px' }}>
            Do primeiro "oi" no WhatsApp até a matrícula — e depois para reter o aluno — <strong style={{ color: '#E8E8F0' }}>tudo automático</strong>. Você só cuida da quadra.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noreferrer"
              style={{
                background: 'linear-gradient(135deg, #0070F3, #00E5FF)',
                color: '#000', fontWeight: 800, borderRadius: 12,
                padding: '14px 28px', fontSize: 16, textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 8,
                boxShadow: '0 8px 32px rgba(0,229,255,0.25)',
              }}
            >
              💬 Quero testar grátis
            </a>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#E8E8F0', fontWeight: 600, borderRadius: 12,
                padding: '14px 28px', fontSize: 16, cursor: 'pointer',
              }}
            >
              Ver painel demo →
            </button>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section ref={statsRef} style={{ padding: '0 24px 80px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {[
            { val: `+${conv}%`, label: 'taxa de conversão de leads', icon: '📈' },
            { val: `${horas}h`, label: 'economizadas por dia pelo dono', icon: '⏰' },
            { val: `R$0`, label: 'em leads perdidos por esquecimento', icon: '🎯' },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16, padding: '24px 20px', textAlign: 'center',
                opacity: statsVisible ? 1 : 0,
                transform: statsVisible ? 'translateY(0)' : 'translateY(24px)',
                transition: `opacity 0.6s ease ${i * 0.15}s, transform 0.6s ease ${i * 0.15}s`,
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
              <div style={{ fontSize: 36, fontWeight: 900, background: 'linear-gradient(135deg, #0070F3, #00E5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.val}</div>
              <div style={{ fontSize: 13, color: '#6B7280', marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PROBLEMA ── */}
      <Section style={{ padding: '80px 24px', maxWidth: 960, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 800, marginBottom: 12 }}>O problema que todo dono de box conhece</h2>
          <p style={{ color: '#6B7280', fontSize: 16 }}>Você está na quadra. O celular não para. E ainda assim os leads somem.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {/* Sem LOTA */}
          <div style={{ background: 'rgba(255,68,68,0.04)', border: '1px solid rgba(255,68,68,0.15)', borderRadius: 16, padding: 28 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#FF4444', marginBottom: 20 }}>❌ Sem o LOTA</div>
            {[
              '09h00 — Lead manda "oi" no WhatsApp',
              '09h05 — Você está dando aula, não vê',
              '10h30 — Você lembra, mas está cansado',
              '14h00 — Finalmente responde, lead sumiu',
              '--- Matrícula perdida ---',
              'Se repetirá 10x esse mês',
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, opacity: t.startsWith('---') ? 1 : 0.85 }}>
                <span style={{ color: t.startsWith('---') ? '#FF4444' : '#6B7280', fontSize: 13, fontWeight: t.startsWith('---') ? 700 : 400 }}>{t.startsWith('---') ? '💀' : '→'}</span>
                <span style={{ fontSize: 13, color: t.startsWith('---') ? '#FF4444' : '#9CA3AF', fontWeight: t.startsWith('---') ? 700 : 400 }}>{t.replace('---', '').trim()}</span>
              </div>
            ))}
          </div>
          {/* Com LOTA */}
          <div style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: 16, padding: 28 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#00E5FF', marginBottom: 20 }}>✅ Com o LOTA</div>
            {[
              '09h00 — Lead manda "oi" no WhatsApp',
              '09h00 — LOTA responde em segundos',
              '09h05 — Lead está sendo qualificado',
              '09h30 — Score alto, lead está quente',
              '→ Você recebe: "🔥 Lucas está pronto!"',
              'Você fecha em 2 minutos no horário livre',
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <span style={{ color: t.startsWith('→') ? '#00E5FF' : '#22C55E', fontSize: 13 }}>{t.startsWith('→') ? '⚡' : '✓'}</span>
                <span style={{ fontSize: 13, color: t.startsWith('→') ? '#00E5FF' : '#E8E8F0', fontWeight: t.startsWith('→') ? 700 : 400 }}>{t.replace('→', '').trim()}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── ORIGENS ── */}
      <Section style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, marginBottom: 12 }}>Como o lead entra no sistema</h2>
            <p style={{ color: '#6B7280', fontSize: 16 }}>4 canais, 1 funil. Tudo centralizado automaticamente.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {ORIGENS.map((o, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${o.cor}25`,
                  borderTop: `3px solid ${o.cor}`,
                  borderRadius: 14, padding: '24px 20px',
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{o.icone}</div>
                <div style={{ fontWeight: 700, fontSize: 16, color: o.cor, marginBottom: 10 }}>{o.titulo}</div>
                <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{o.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── JORNADA DO LEAD ── */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <Section style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#00E5FF', fontWeight: 600, marginBottom: 16 }}>
              🎬 Jornada real do lead
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, marginBottom: 12 }}>Do primeiro "oi" ao aluno fiel</h2>
            <p style={{ color: '#6B7280', fontSize: 16 }}>Veja cada etapa acontecendo em tempo real — exatamente como o LOTA vai trabalhar por você.</p>
          </Section>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'start' }}>
            {/* Timeline lateral */}
            <div>
              {JORNADA.map((etapa, i) => (
                <div
                  key={i}
                  onClick={() => setJornadaAtiva(i)}
                  style={{
                    display: 'flex', gap: 16, marginBottom: 8, cursor: 'pointer',
                    background: jornadaAtiva === i ? `${etapa.cor}12` : 'transparent',
                    border: `1px solid ${jornadaAtiva === i ? etapa.cor + '40' : 'transparent'}`,
                    borderRadius: 12, padding: '14px 16px',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: jornadaAtiva === i ? `${etapa.cor}20` : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${jornadaAtiva === i ? etapa.cor : 'rgba(255,255,255,0.1)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, transition: 'all 0.3s ease',
                  }}>
                    {etapa.icone}
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: etapa.cor, fontWeight: 700, marginBottom: 2 }}>{etapa.hora}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: jornadaAtiva === i ? '#E8E8F0' : '#9CA3AF' }}>{etapa.titulo}</div>
                    {jornadaAtiva === i && (
                      <div style={{ fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 1.5 }}>{etapa.desc}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Chat preview */}
            <div style={{
              background: '#111B21',
              borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.06)',
              position: 'sticky', top: 80,
            }}>
              {/* Header WhatsApp */}
              <div style={{ background: '#1F2C34', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #0070F3, #00E5FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>BraveFit</div>
                  <div style={{ fontSize: 11, color: '#00E5FF' }}>online agora via LOTA</div>
                </div>
              </div>
              {/* Mensagens */}
              <div style={{ padding: '16px', minHeight: 280, background: 'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="%23111B21"/></svg>\')' }}>
                {JORNADA[jornadaAtiva].chat.map((msg, i) => (
                  <WaBubble
                    key={`${jornadaAtiva}-${i}`}
                    msg={msg.msg}
                    side={msg.side}
                    time={msg.time}
                    delay={i * 0.3}
                    visible={true}
                  />
                ))}
              </div>
              {/* Rodapé etapa */}
              <div style={{
                background: `${JORNADA[jornadaAtiva].cor}10`,
                borderTop: `2px solid ${JORNADA[jornadaAtiva].cor}30`,
                padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontSize: 16 }}>{JORNADA[jornadaAtiva].icone}</span>
                <span style={{ fontSize: 12, color: JORNADA[jornadaAtiva].cor, fontWeight: 600 }}>{JORNADA[jornadaAtiva].titulo}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── RESUMO DIÁRIO ── */}
      <Section style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: '#00E5FF', fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>TODO DIA ÀS 21H</div>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 800, marginBottom: 16 }}>Resumo direto no seu WhatsApp</h2>
            <p style={{ color: '#6B7280', fontSize: 15, lineHeight: 1.7 }}>
              Sem precisar abrir nenhum app. Todo dia às 21h você recebe um resumo do que aconteceu — leads, matrículas, alunos em risco, renovações. <strong style={{ color: '#E8E8F0' }}>Você só precisa saber o que importa.</strong>
            </p>
          </div>
          {/* Mockup WhatsApp */}
          <div style={{ background: '#111B21', borderRadius: 16, overflow: 'hidden', boxShadow: '0 16px 60px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ background: '#1F2C34', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, #0070F3, #00E5FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>LOTA</div>
                <div style={{ fontSize: 10, color: '#4ADE80' }}>online</div>
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ background: '#1F2C34', borderRadius: '2px 12px 12px 12px', padding: '12px 14px' }}>
                <div style={{ fontSize: 11, color: '#00E5FF', fontWeight: 700, marginBottom: 8 }}>LOTA ⚡ — Resumo de hoje</div>
                {[
                  ['📥 Leads novos', '3'],
                  ['✅ Convertidos hoje', '1 (+R$189)'],
                  ['⚠️ Alunos em risco', '2 com 3+ faltas'],
                  ['💰 Inadimplentes', '1 aluno'],
                  ['📅 Renovações esta semana', '4 alunos'],
                  ['📊 MRR atual', 'R$5.670'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#E8E8F0', marginBottom: 6 }}>
                    <span>{k}</span>
                    <strong style={{ color: '#00E5FF' }}>{v}</strong>
                  </div>
                ))}
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: '#6B7280' }}>21:00 ✓✓</div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* ── MÓDULOS ── */}
      <Section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, marginBottom: 12 }}>Tudo que seu box precisa, em um lugar</h2>
            <p style={{ color: '#6B7280', fontSize: 16 }}>6 módulos integrados que trabalham juntos — sem apps separados, sem planilha.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            {MODULOS.map((m, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.025)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 14, padding: '24px 20px',
                  transition: 'all 0.2s ease',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,229,255,0.05)'
                  e.currentTarget.style.borderColor = 'rgba(0,229,255,0.2)'
                  e.currentTarget.style.transform = 'translateY(-4px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.025)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 12 }}>{m.icone}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{m.nome}</div>
                <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>{m.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── ROI CALCULATOR ── */}
      <Section style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 800, marginBottom: 12 }}>Quanto isso representa no seu bolso?</h2>
          <p style={{ color: '#6B7280', fontSize: 15, marginBottom: 40 }}>Arraste para estimar seu potencial de receita com 30% de conversão média do LOTA.</p>

          <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 32 }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 14, color: '#9CA3AF' }}>Leads por mês</span>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#00E5FF' }}>{roiLeads}</span>
              </div>
              <input
                type="range" min={5} max={200} value={roiLeads}
                onChange={(e) => setRoiLeads(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#00E5FF', cursor: 'pointer', height: 6 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 12, color: '#4B5563' }}>
                <span>5</span><span>200</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {[
                { label: 'Alunos convertidos', val: `${roiAlunos}`, unit: 'por mês', cor: '#A78BFA' },
                { label: 'Receita gerada', val: `R$${roiMrr.toLocaleString('pt-BR')}`, unit: 'MRR novo', cor: '#22C55E' },
                { label: 'Em 12 meses', val: `R$${(roiMrr * 12).toLocaleString('pt-BR')}`, unit: 'acumulado', cor: '#00E5FF' },
              ].map((r, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '16px 12px' }}>
                  <div style={{ fontSize: 11, color: '#6B7280', marginBottom: 6 }}>{r.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: r.cor }}>{r.val}</div>
                  <div style={{ fontSize: 11, color: '#4B5563', marginTop: 2 }}>{r.unit}</div>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 12, color: '#4B5563', marginTop: 20 }}>
              * Baseado em mensalidade de R$189 e 30% de conversão com follow-up automático
            </p>
          </div>
        </div>
      </Section>

      {/* ── CTA FINAL ── */}
      <section style={{ padding: '100px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 50%, rgba(0,112,243,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <Section style={{ position: 'relative', zIndex: 1 }}>
          <LotaLogo variant="icon" color="dark" width={72} />
          <h2 style={{ fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 900, margin: '24px 0 16px', letterSpacing: '-0.5px' }}>
            Pronto para <span style={{ background: 'linear-gradient(135deg, #0070F3, #00E5FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>lotar</span> seu box?
          </h2>
          <p style={{ color: '#6B7280', fontSize: 17, marginBottom: 40, maxWidth: 480, margin: '0 auto 40px' }}>
            Fale com a gente no WhatsApp e configure seu box em menos de 30 minutos.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href={WA_LINK}
              target="_blank"
              rel="noreferrer"
              style={{
                background: 'linear-gradient(135deg, #0070F3, #00E5FF)',
                color: '#000', fontWeight: 800, borderRadius: 14,
                padding: '16px 32px', fontSize: 17, textDecoration: 'none',
                display: 'flex', alignItems: 'center', gap: 10,
                boxShadow: '0 12px 40px rgba(0,229,255,0.3)',
              }}
            >
              💬 Quero testar grátis
            </a>
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#E8E8F0', fontWeight: 600, borderRadius: 14,
                padding: '16px 32px', fontSize: 17, cursor: 'pointer',
              }}
            >
              Acessar o painel demo →
            </button>
          </div>
          <p style={{ fontSize: 13, color: '#4B5563', marginTop: 24 }}>Sem contrato. Sem cartão de crédito. Começa em 30 minutos.</p>
        </Section>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '32px 24px', textAlign: 'center' }}>
        <LotaLogo variant="wordmark" color="dark" width={80} />
        <p style={{ fontSize: 12, color: '#4B5563', marginTop: 12 }}>o sistema que lota seu negócio</p>
        <p style={{ fontSize: 11, color: '#374151', marginTop: 8 }}>© 2026 LOTA. Todos os direitos reservados.</p>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .jornada-grid { grid-template-columns: 1fr !important; }
          .resumo-grid { grid-template-columns: 1fr !important; }
        }
        input[type=range] { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 6px; background: rgba(255,255,255,0.08); outline: none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: linear-gradient(135deg, #0070F3, #00E5FF); cursor: pointer; }
      `}</style>
    </div>
  )
}
