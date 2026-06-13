/**
 * src/pages/AgendarPublico.jsx
 * Página pública de agendamento — Bloco AGENDA (Fase 2)
 * Rota: /agendar/:slug
 *
 * Fluxo: serviço → dia → horário → nome+WhatsApp → confirmado.
 * Lead entra no funil como "agendado"; lembretes saem pela fila.
 */
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  getAgendaPublica, getSlotsPublicos, agendarPublico, entrarListaEspera,
} from '../lib/publicoApi'
import LotaLogo from '../components/shared/LotaLogo'

const DIAS_VISIVEIS = 14

function proximosDias() {
  const dias = []
  const hoje = new Date()
  for (let i = 0; i < DIAS_VISIVEIS; i++) {
    const d = new Date(hoje.getTime() + i * 86400000)
    dias.push({
      iso: d.toISOString().slice(0, 10),
      diaSemana: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][d.getDay()],
      diaMes: d.getDate(),
      mes: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][d.getMonth()],
    })
  }
  return dias
}

const inputStyle = {
  width: '100%', padding: '12px 14px', fontSize: 14,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 10, color: '#fff', outline: 'none',
}

// Wrapper visual — DEFINIDO FORA do componente da página.
// Se ficasse dentro, o React o recriaria a cada render e remontaria a árvore
// inteira (incluindo os inputs), fazendo o campo perder o foco a cada tecla.
function Tela({ children }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'linear-gradient(135deg, #0A0A1A 0%, #0D1830 60%, #0A0A1A 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px',
      fontFamily: 'inherit', color: '#fff',
    }}>
      <div style={{ marginBottom: 24 }}><LotaLogo variant="icon" color="dark" width={48} /></div>
      <div style={{ width: '100%', maxWidth: 560 }}>{children}</div>
      <p style={{ marginTop: 32, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
        Agendamento por LOTA — lota.app.br
      </p>
    </div>
  )
}

export default function AgendarPublico() {
  const { slug } = useParams()
  const [box, setBox] = useState(null)
  const [servicos, setServicos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [naoEncontrado, setNaoEncontrado] = useState(false)

  const [servico, setServico] = useState(null)
  const [dia, setDia] = useState(null)
  const [slots, setSlots] = useState(null)
  const [slot, setSlot] = useState(null)

  const [form, setForm] = useState({ nome: '', whatsapp: '', email: '', lgpd: false })
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(null)
  const [modoEspera, setModoEspera] = useState(false)

  useEffect(() => {
    async function carregar() {
      try {
        const data = await getAgendaPublica(slug)
        setBox(data.box)
        setServicos(data.servicos)
      } catch {
        setNaoEncontrado(true)
      } finally {
        setCarregando(false)
      }
    }
    if (slug) carregar()
  }, [slug])

  useEffect(() => {
    async function carregarSlots() {
      if (!servico || !dia) return
      setSlots(null)
      setSlot(null)
      try {
        const { slots } = await getSlotsPublicos(slug, servico.id, dia)
        setSlots(slots)
      } catch {
        setSlots([])
      }
    }
    carregarSlots()
  }, [servico, dia, slug])

  const formatWhatsapp = (val) => {
    const num = val.replace(/\D/g, '').slice(0, 11)
    if (num.length <= 2) return `(${num}`
    if (num.length <= 7) return `(${num.slice(0, 2)}) ${num.slice(2)}`
    return `(${num.slice(0, 2)}) ${num.slice(2, 7)}-${num.slice(7)}`
  }

  const confirmar = async (e) => {
    e.preventDefault()
    setErro('')
    if (form.nome.trim().length < 2) { setErro('Digite seu nome completo'); return }
    if (form.whatsapp.replace(/\D/g, '').length < 10) { setErro('Digite um WhatsApp válido'); return }
    if (!form.lgpd) { setErro('Você precisa aceitar para continuar'); return }

    setEnviando(true)
    try {
      if (modoEspera) {
        await entrarListaEspera({
          slug, service_id: servico.id,
          nome: form.nome.trim(), whatsapp: form.whatsapp, data_desejada: dia,
        })
        setSucesso({ espera: true })
      } else {
        const r = await agendarPublico({
          slug, service_id: servico.id, data_hora: slot.inicio,
          nome: form.nome.trim(), whatsapp: form.whatsapp,
          email: form.email.trim(), lgpd_consent: true,
        })
        setSucesso(r)
      }
    } catch (err) {
      if (String(err.message).includes('indisponível')) {
        setErro('Esse horário acabou de ser preenchido. Escolha outro!')
        setSlot(null)
        const { slots } = await getSlotsPublicos(slug, servico.id, dia).catch(() => ({ slots: [] }))
        setSlots(slots)
      } else {
        setErro('Erro ao agendar. Tente novamente.')
      }
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) return <Tela><p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Carregando…</p></Tela>
  if (naoEncontrado) return <Tela><p style={{ textAlign: 'center' }}>😕 Página não encontrada.</p></Tela>

  if (sucesso) {
    return (
      <Tela>
        <div style={{
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 16, padding: 32, textAlign: 'center',
        }}>
          <p style={{ fontSize: 44, marginBottom: 12 }}>{sucesso.espera ? '⏳' : '🎉'}</p>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
            {sucesso.espera ? 'Você está na lista de espera!' : 'Agendamento confirmado!'}
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            {sucesso.espera
              ? `Assim que abrir uma vaga em ${servico?.nome}, o ${box?.nome} te chama no WhatsApp.`
              : `${sucesso.servico} — ${sucesso.data} às ${sucesso.hora} no ${box?.nome}. Você vai receber a confirmação e lembretes no seu WhatsApp. 💪`}
          </p>
        </div>
      </Tela>
    )
  }

  return (
    <Tela>
      <h1 style={{ fontSize: 24, fontWeight: 800, textAlign: 'center' }}>{box?.nome}</h1>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginBottom: 28 }}>
        Escolha o serviço e o melhor horário pra você
      </p>

      {/* Passo 1 — serviço */}
      <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#00E5FF' }}>1. Serviço</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        {servicos.length === 0 && (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Nenhum serviço disponível no momento.</p>
        )}
        {servicos.map((s) => (
          <button key={s.id} onClick={() => { setServico(s); setDia(null); setSlot(null) }} style={{
            textAlign: 'left', padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
            background: servico?.id === s.id ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${servico?.id === s.id ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
            color: '#fff',
          }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>{s.nome}</span>
            <span style={{ float: 'right', fontSize: 13, color: '#00E5FF', fontWeight: 700 }}>
              {Number(s.preco) > 0 ? `R$ ${Number(s.preco).toFixed(0)}` : 'Grátis'}
            </span>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              {s.duracao_min} min{s.descricao ? ` · ${s.descricao}` : ''}
            </p>
          </button>
        ))}
      </div>

      {/* Passo 2 — dia */}
      {servico && (
        <>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#00E5FF' }}>2. Dia</p>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 24 }}>
            {proximosDias().map((d) => (
              <button key={d.iso} onClick={() => setDia(d.iso)} style={{
                minWidth: 64, padding: '10px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                background: dia === d.iso ? 'rgba(0,229,255,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${dia === d.iso ? 'rgba(0,229,255,0.5)' : 'rgba(255,255,255,0.1)'}`,
                color: '#fff',
              }}>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{d.diaSemana}</p>
                <p style={{ fontSize: 18, fontWeight: 800 }}>{d.diaMes}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{d.mes}</p>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Passo 3 — horário */}
      {servico && dia && (
        <>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#00E5FF' }}>3. Horário</p>
          {slots === null && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>Buscando horários…</p>}
          {slots !== null && slots.length === 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 10 }}>
                Nenhum horário livre nesse dia. 😕
              </p>
              <button onClick={() => { setModoEspera(true); setSlot({ inicio: null }) }} style={{
                padding: '10px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                background: 'rgba(255,184,0,0.12)', border: '1px solid rgba(255,184,0,0.4)', color: '#FFB800',
              }}>
                ⏳ Entrar na lista de espera
              </button>
            </div>
          )}
          {slots !== null && slots.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
              {slots.map((s) => (
                <button key={s.inicio} onClick={() => { setSlot(s); setModoEspera(false) }} style={{
                  padding: '10px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14,
                  background: slot?.inicio === s.inicio ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${slot?.inicio === s.inicio ? 'rgba(0,229,255,0.6)' : 'rgba(255,255,255,0.1)'}`,
                  color: '#fff',
                }}>
                  {s.hora_local}
                  {s.vagas_restantes <= 3 && (
                    <span style={{ fontSize: 10, color: '#FFB800', display: 'block' }}>
                      {s.vagas_restantes} vaga{s.vagas_restantes > 1 ? 's' : ''}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Passo 4 — dados */}
      {servico && dia && slot && (
        <form onSubmit={confirmar} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#00E5FF' }}>
            4. Seus dados {modoEspera && '(lista de espera)'}
          </p>
          <input style={inputStyle} placeholder="Seu nome completo" value={form.nome}
            onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} />
          <input style={inputStyle} placeholder="(00) 00000-0000" value={form.whatsapp}
            onChange={(e) => setForm((f) => ({ ...f, whatsapp: formatWhatsapp(e.target.value) }))} />
          {!modoEspera && (
            <input style={inputStyle} placeholder="E-mail (opcional)" type="email" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          )}
          <label style={{ display: 'flex', gap: 10, fontSize: 12, color: 'rgba(255,255,255,0.6)', alignItems: 'flex-start', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.lgpd}
              onChange={(e) => setForm((f) => ({ ...f, lgpd: e.target.checked }))} style={{ marginTop: 2 }} />
            Autorizo o {box?.nome} a entrar em contato comigo pelo WhatsApp sobre este agendamento (LGPD).
          </label>
          {erro && (
            <p style={{ fontSize: 13, color: '#FF4444', background: 'rgba(255,68,68,0.08)', padding: '10px 14px', borderRadius: 8 }}>
              {erro}
            </p>
          )}
          <button type="submit" disabled={enviando} style={{
            padding: 14, borderRadius: 12, border: 'none', cursor: enviando ? 'wait' : 'pointer',
            background: 'linear-gradient(135deg, #00E5FF, #0070F3)', color: '#000',
            fontWeight: 800, fontSize: 15,
          }}>
            {enviando ? 'Enviando…' : modoEspera ? 'Entrar na lista de espera' : 'Confirmar agendamento ✅'}
          </button>
        </form>
      )}
    </Tela>
  )
}
