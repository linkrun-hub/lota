/**
 * NovoLeadModal — Modal para criar lead manualmente
 */
import { useState } from 'react'
import { X, UserPlus, Zap } from 'lucide-react'
import { MOMENTO_COMPRA, ORIGEM_LEAD } from '../../lib/constants'

const INTERESSES = ['CrossFit', 'Musculação', 'Funcional', 'Emagrecimento', 'Hipertrofia', 'Condicionamento', 'Pilates']

const INPUT_STYLE = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 13,
  borderRadius: 8,
}

export default function NovoLeadModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    nome: '',
    whatsapp: '',
    email: '',
    interesse: [],
    momento_compra: '',
    origem: 'manual',
  })
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState({})

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErros((prev) => ({ ...prev, [field]: undefined }))
  }

  const toggleInteresse = (item) => {
    setForm((prev) => ({
      ...prev,
      interesse: prev.interesse.includes(item)
        ? prev.interesse.filter((i) => i !== item)
        : [...prev.interesse, item],
    }))
  }

  const validar = () => {
    const e = {}
    if (!form.nome.trim()) e.nome = 'Nome obrigatório'
    if (!form.whatsapp.trim()) e.whatsapp = 'WhatsApp obrigatório'
    else if (form.whatsapp.replace(/\D/g, '').length < 10) e.whatsapp = 'Número inválido'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errosVal = validar()
    if (Object.keys(errosVal).length > 0) {
      setErros(errosVal)
      return
    }

    setSalvando(true)
    try {
      // Formata whatsapp para E.164
      const digits = form.whatsapp.replace(/\D/g, '')
      const wpp = digits.startsWith('55') ? `+${digits}` : `+55${digits}`

      await onSave({
        ...form,
        whatsapp: wpp,
        status: 'novo',
        lgpd_consent: true,
        lgpd_consent_at: new Date().toISOString(),
        interesse: form.interesse.map((i) => i.toLowerCase()),
        momento_compra: form.momento_compra || null,
      })
      onClose()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <>
      {/* Overlay */}
      <div className="overlay" onClick={onClose} style={{ zIndex: 65 }} />

      {/* Modal */}
      <div
        id="novo-lead-modal"
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100%',
          maxWidth: 480,
          maxHeight: '90vh',
          background: '#0F0F1A',
          border: '1px solid var(--border-medium)',
          borderRadius: 16,
          zIndex: 70,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          animation: 'fadeIn 0.2s ease',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(0,229,255,0.1)',
              border: '1px solid rgba(0,229,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UserPlus size={18} color="#00E5FF" />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Novo Lead</h2>
          </div>
          <button
            id="modal-fechar"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form scrollável */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Nome */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Nome *
              </label>
              <input
                id="modal-lead-nome"
                type="text"
                value={form.nome}
                onChange={(e) => set('nome', e.target.value)}
                placeholder="Nome completo do lead"
                style={{ ...INPUT_STYLE, borderColor: erros.nome ? 'rgba(255,68,68,0.5)' : undefined }}
              />
              {erros.nome && <p style={{ fontSize: 11, color: '#FF4444', marginTop: 4 }}>{erros.nome}</p>}
            </div>

            {/* WhatsApp */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                WhatsApp * (com DDD)
              </label>
              <input
                id="modal-lead-whatsapp"
                type="tel"
                value={form.whatsapp}
                onChange={(e) => set('whatsapp', e.target.value)}
                placeholder="(31) 99999-9999"
                style={{ ...INPUT_STYLE, borderColor: erros.whatsapp ? 'rgba(255,68,68,0.5)' : undefined }}
              />
              {erros.whatsapp && <p style={{ fontSize: 11, color: '#FF4444', marginTop: 4 }}>{erros.whatsapp}</p>}
            </div>

            {/* E-mail */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                E-mail (opcional)
              </label>
              <input
                id="modal-lead-email"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@exemplo.com.br"
                style={INPUT_STYLE}
              />
            </div>

            {/* Interesse */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                Interesse
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {INTERESSES.map((item) => {
                  const sel = form.interesse.includes(item.toLowerCase())
                  return (
                    <button
                      key={item}
                      type="button"
                      id={`modal-interesse-${item.toLowerCase()}`}
                      onClick={() => toggleInteresse(item.toLowerCase())}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                        background: sel ? 'rgba(0,229,255,0.12)' : 'transparent',
                        color: sel ? '#00E5FF' : 'var(--text-muted)',
                        border: `1px solid ${sel ? 'rgba(0,229,255,0.3)' : 'var(--border-subtle)'}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      {item}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Momento de compra */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                Momento de compra
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(MOMENTO_COMPRA).map(([k, v]) => {
                  const sel = form.momento_compra === k
                  return (
                    <button
                      key={k}
                      type="button"
                      id={`modal-momento-${k}`}
                      onClick={() => set('momento_compra', sel ? '' : k)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: sel ? v.bg : 'transparent',
                        color: sel ? v.color : 'var(--text-muted)',
                        border: `1px solid ${sel ? v.color + '40' : 'var(--border-subtle)'}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      {v.emoji} {v.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Origem */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Origem
              </label>
              <select
                id="modal-lead-origem"
                value={form.origem}
                onChange={(e) => set('origem', e.target.value)}
                style={{ ...INPUT_STYLE, cursor: 'pointer' }}
              >
                {Object.entries(ORIGEM_LEAD).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>

            {/* Consentimento LGPD */}
            <div style={{
              background: 'rgba(0,229,255,0.05)',
              border: '1px solid rgba(0,229,255,0.12)',
              borderRadius: 8,
              padding: '10px 12px',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
            }}>
              <Zap size={13} color="#00E5FF" style={{ marginTop: 1, flexShrink: 0 }} />
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Ao cadastrar manualmente, você confirma que este contato autorizou receber comunicações.
                O consentimento LGPD será registrado automaticamente.
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          gap: 10,
          justifyContent: 'flex-end',
        }}>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            style={{ padding: '10px 20px' }}
          >
            Cancelar
          </button>
          <button
            id="modal-btn-salvar-lead"
            onClick={handleSubmit}
            disabled={salvando}
            className="btn-primary"
            style={{ padding: '10px 20px', opacity: salvando ? 0.7 : 1 }}
          >
            <UserPlus size={14} />
            {salvando ? 'Salvando...' : 'Criar lead'}
          </button>
        </div>
      </div>
    </>
  )
}
