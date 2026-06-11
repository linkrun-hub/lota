/**
 * Captacao.jsx — Formulário público + canais de captação
 */
import { useState } from 'react'
import { Megaphone, Globe, Copy, Check, ExternalLink, BarChart2, Zap, CheckCircle2, XCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { ORIGEM_LEAD } from '../lib/constants'

const CANAIS = [
  {
    key: 'lead_ads_meta',
    nome: 'Meta Lead Ads',
    descricao: 'Anúncios no Facebook e Instagram com formulário nativo. Leads chegam já com dados preenchidos.',
    icon: '📣',
    cor: '#1877F2',
    ativo: true,
    leads: 6,
    convertidos: 1,
    cta: 'Configurar integração',
  },
  {
    key: 'lead_ads_google',
    nome: 'Google Lead Ads',
    descricao: 'Anúncios no Google com formulário integrado. Alta intenção de compra.',
    icon: '🔍',
    cor: '#EA4335',
    ativo: true,
    leads: 3,
    convertidos: 1,
    cta: 'Configurar integração',
  },
  {
    key: 'indicacao',
    nome: 'Programa de Indicação',
    descricao: 'Alunos indicam amigos com link único. Custo de aquisição mais baixo e melhor retenção.',
    icon: '🎁',
    cor: '#FFB800',
    ativo: true,
    leads: 3,
    convertidos: 2,
    cta: 'Ver programa',
  },
  {
    key: 'landing_page',
    nome: 'Landing Page / Formulário',
    descricao: 'Formulário público no link /f/bravefit. Compartilhe em bio do Instagram, WhatsApp e stories.',
    icon: '🌐',
    cor: '#A78BFA',
    ativo: true,
    leads: 2,
    convertidos: 1,
    cta: 'Ver formulário',
  },
  {
    key: 'whatsapp',
    nome: 'WhatsApp Direto',
    descricao: 'Leads que entram diretamente pelo WhatsApp do box. Cadastro manual ou via link wa.me.',
    icon: '💬',
    cor: '#25D366',
    ativo: true,
    leads: 5,
    convertidos: 1,
    cta: 'Ver configuração',
  },
  {
    key: 'manual',
    nome: 'Cadastro Manual',
    descricao: 'Leads cadastrados diretamente no painel. Indicados pessoalmente, eventos, parcerias.',
    icon: '✏️',
    cor: '#6B7280',
    ativo: true,
    leads: 1,
    convertidos: 0,
    cta: 'Adicionar lead',
  },
]

function FormularioPublicPreview({ slug }) {
  const [copied, setCopied] = useState(false)
  const link = `https://lota.app/f/${slug}`

  const handleCopy = () => {
    navigator.clipboard.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      {/* Link público */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
          Link público do seu formulário
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: '10px 14px',
            fontSize: 13,
            color: '#00E5FF',
            fontFamily: 'monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {link}
          </div>
          <button
            id="btn-copiar-link"
            onClick={handleCopy}
            className={copied ? 'btn-primary' : 'btn-ghost'}
            style={{ padding: '10px 16px', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar link</>}
          </button>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
            style={{ padding: '10px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
          >
            <ExternalLink size={14} />
          </a>
        </div>
      </div>

      {/* Preview do formulário no celular */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Mobile frame */}
        <div style={{
          width: 280,
          background: '#111',
          borderRadius: 36,
          padding: '20px 12px',
          border: '2px solid rgba(255,255,255,0.12)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          flexShrink: 0,
        }}>
          {/* Status bar simulada */}
          <div style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px', marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>9:41</span>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', display: 'flex', gap: 4 }}>
              <span>●●●</span><span>WiFi</span><span>🔋</span>
            </div>
          </div>

          {/* Formulário */}
          <div style={{
            background: '#0A0A0F',
            borderRadius: 20,
            overflow: 'hidden',
            minHeight: 480,
          }}>
            {/* Header do form */}
            <div style={{
              background: 'linear-gradient(135deg, #00E5FF22, #0070F322)',
              borderBottom: '1px solid rgba(0,229,255,0.15)',
              padding: '20px 16px',
              textAlign: 'center',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'linear-gradient(135deg, #00E5FF, #0070F3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 10px', fontSize: 20,
              }}>⚡</div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>BraveFit</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>Solicite informações</p>
            </div>

            <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Nome completo *', placeholder: 'Seu nome' },
                { label: 'WhatsApp *', placeholder: '(31) 99999-9999' },
                { label: 'E-mail', placeholder: 'email@exemplo.com' },
              ].map(({ label, placeholder }) => (
                <div key={label}>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label}</p>
                  <div style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, padding: '8px 10px',
                    fontSize: 11, color: 'rgba(255,255,255,0.3)',
                  }}>
                    {placeholder}
                  </div>
                </div>
              ))}

              {/* Interesse */}
              <div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Interesse</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {['CrossFit', 'Funcional', 'Emagrecimento'].map((i) => (
                    <span key={i} style={{
                      fontSize: 9, padding: '3px 8px', borderRadius: 20,
                      background: i === 'CrossFit' ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${i === 'CrossFit' ? 'rgba(0,229,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                      color: i === 'CrossFit' ? '#00E5FF' : 'rgba(255,255,255,0.4)',
                    }}>{i}</span>
                  ))}
                </div>
              </div>

              {/* LGPD */}
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
                ☑ Aceito receber mensagens via WhatsApp.
              </p>

              {/* Botão */}
              <div style={{
                background: 'linear-gradient(135deg, #00E5FF, #0070F3)',
                borderRadius: 8, padding: '10px',
                textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#000',
                marginTop: 4,
              }}>
                Quero saber mais!
              </div>

              <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 4 }}>
                Powered by LOTA
              </p>
            </div>
          </div>
        </div>

        {/* Info ao lado */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Como funciona</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { num: '1', texto: 'Compartilhe o link no Instagram, WhatsApp ou stories', cor: '#00E5FF' },
              { num: '2', texto: 'Lead preenche o formulário no celular', cor: '#A78BFA' },
              { num: '3', texto: 'Lead entra automaticamente no funil do LOTA', cor: '#FFB800' },
              { num: '4', texto: 'Follow-up automático começa em 1 hora', cor: '#22C55E' },
            ].map(({ num, texto, cor }) => (
              <div key={num} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8, background: `${cor}18`,
                  border: `1px solid ${cor}30`, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 12, fontWeight: 700, color: cor, flexShrink: 0,
                }}>
                  {num}
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, paddingTop: 2 }}>{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CanalCard({ canal, leads }) {
  const totalLeadsByOrigem = leads.filter((l) => l.origem === canal.key).length
  const convertidosByOrigem = leads.filter((l) => l.origem === canal.key && l.status === 'convertido').length
  const taxa = totalLeadsByOrigem > 0 ? Math.round((convertidosByOrigem / totalLeadsByOrigem) * 100) : 0

  return (
    <div className="glass" style={{
      borderRadius: 12, padding: 20,
      borderColor: canal.ativo ? `${canal.cor}20` : 'var(--border-subtle)',
      transition: 'all 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `${canal.cor}15`,
          border: `1px solid ${canal.cor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20,
        }}>
          {canal.icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>{canal.nome}</h3>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 10, fontWeight: 600,
              color: canal.ativo ? '#22C55E' : '#6B7280',
              background: canal.ativo ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
              borderRadius: 20, padding: '2px 8px',
            }}>
              {canal.ativo ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
              {canal.ativo ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
            {canal.descricao}
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 20, fontWeight: 700, color: canal.cor }}>{totalLeadsByOrigem}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>leads captados</p>
            </div>
            <div>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#22C55E' }}>{convertidosByOrigem}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>convertidos</p>
            </div>
            <div>
              <p style={{ fontSize: 20, fontWeight: 700, color: taxa > 20 ? '#22C55E' : '#FFB800' }}>{taxa}%</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>conversão</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Captacao() {
  const { box, leads } = useApp()
  const [aba, setAba] = useState('formulario')

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }} className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Megaphone size={22} color="#00E5FF" /> Captação
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Formulário público e canais de captação de leads
        </p>
      </div>

      {/* Info */}
      <div style={{
        background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.12)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 8, alignItems: 'flex-start',
      }}>
        <Zap size={14} color="#00E5FF" style={{ marginTop: 1, flexShrink: 0 }} />
        <span>
          <strong style={{ color: '#00E5FF' }}>Captação:</strong> Gerencie como leads chegam ao LOTA.
          O <strong>formulário público</strong> tem URL própria para compartilhar no Instagram e WhatsApp.
          Os <strong>canais</strong> mostram performance de cada origem de lead.
        </span>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { key: 'formulario', label: 'Formulário Público', icon: <Globe size={14} /> },
          { key: 'canais', label: 'Canais de Captação', icon: <BarChart2 size={14} /> },
        ].map((t) => (
          <button key={t.key} id={`captacao-tab-${t.key}`} onClick={() => setAba(t.key)}
            className={`tab-btn ${aba === t.key ? 'active' : ''}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {aba === 'formulario' && (
        <div className="glass" style={{ borderRadius: 12, padding: 24 }}>
          <FormularioPublicPreview slug={box?.slug || 'bravefit'} />
        </div>
      )}

      {aba === 'canais' && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))',
            gap: 14,
          }}>
            {CANAIS.map((canal) => (
              <CanalCard key={canal.key} canal={canal} leads={leads} />
            ))}
          </div>

          {/* Tabela de conversão por origem */}
          <div className="glass" style={{ borderRadius: 12, padding: 20, marginTop: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
              📊 Conversão por canal
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Canal', 'Leads', 'Conversões', 'Taxa', 'Tendência'].map((h) => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {CANAIS.map((c) => {
                    const total = leads.filter((l) => l.origem === c.key).length
                    const conv = leads.filter((l) => l.origem === c.key && l.status === 'convertido').length
                    const taxa = total > 0 ? Math.round((conv / total) * 100) : 0
                    return (
                      <tr key={c.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>{c.icon}</span>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{c.nome}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 600 }}>{total}</td>
                        <td style={{ padding: '12px 14px', fontSize: 14, fontWeight: 600, color: '#22C55E' }}>{conv}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              height: 6, borderRadius: 3, flex: 1, maxWidth: 80,
                              background: 'rgba(255,255,255,0.05)',
                            }}>
                              <div style={{
                                height: '100%', borderRadius: 3,
                                width: `${taxa}%`,
                                background: taxa > 30 ? '#22C55E' : taxa > 10 ? '#FFB800' : '#6B7280',
                              }} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: taxa > 30 ? '#22C55E' : taxa > 10 ? '#FFB800' : 'var(--text-muted)' }}>
                              {taxa}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#22C55E' }}>↑</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
