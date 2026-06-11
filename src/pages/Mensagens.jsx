import { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare, ChevronRight, Save, Eye, ToggleLeft, ToggleRight,
  Smartphone, Info, CheckCircle, AlertTriangle, RefreshCw,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

// ─── Dados das categorias ──────────────────────────────────────────────────────
const CATEGORIAS = [
  { key: 'boas_vindas', label: '👋 Boas-vindas',   cor: '#00E5FF' },
  { key: 'follow_up',   label: '⚡ Follow-up',      cor: '#7C3AED' },
  { key: 'retencao',    label: '🔄 Retenção',       cor: '#F59E0B' },
  { key: 'renovacao',   label: '📅 Renovação',      cor: '#10B981' },
  { key: 'indicacao',   label: '🎁 Indicação',      cor: '#EC4899' },
  { key: 'alertas',     label: '🔔 Alertas (Dono)', cor: '#EF4444' },
]

// ─── Templates padrão (fallback se banco vazio) ────────────────────────────────
const TEMPLATES_PADRAO = [
  { key: 'lead_boas_vindas',       nome: 'Boas-vindas (WhatsApp)',             categoria: 'boas_vindas', variaveis: ['{nome}', '{box_nome}'], texto: 'Oi {nome}! 😊\n\nQue bom que entrou em contato com o *{box_nome}*! 💪\n\nMe conta: você está buscando começar do zero ou tem algum objetivo específico?\n\nAssim consigo te indicar o melhor plano! 🏋️' },
  { key: 'followup_agora_1',       nome: 'Follow-up Agora — Msg 1 (1h)',       categoria: 'follow_up',  variaveis: ['{nome}', '{box_nome}'], texto: '{nome}, oi! 👋\n\nAinda temos horários disponíveis essa semana no *{box_nome}*!\n\nQual seria o melhor horário pra você vir conhecer? Sem compromisso! 😊' },
  { key: 'followup_agora_2',       nome: 'Follow-up Agora — Msg 2 (3h)',       categoria: 'follow_up',  variaveis: ['{nome}', '{box_nome}'], texto: '{nome}! 🔥\n\nVocê sabia que quem começa esse mês no *{box_nome}* garante condições especiais?\n\nManda uma mensagem que te conto os detalhes! 😉' },
  { key: 'followup_agora_3',       nome: 'Follow-up Agora — Msg 3 (24h)',      categoria: 'follow_up',  variaveis: ['{nome}', '{box_nome}'], texto: '{nome}, última chamada! ⏰\n\nTemos apenas algumas vagas essa semana no *{box_nome}*.\n\nPosso reservar uma pra você? É só confirmar! 💪' },
  { key: 'followup_em_breve_1',    nome: 'Follow-up Em Breve — Msg 1 (3h)',    categoria: 'follow_up',  variaveis: ['{nome}', '{box_nome}'], texto: 'Oi {nome}! 😊\n\nEntendo que você quer se planejar. No *{box_nome}* temos opções pra todo tipo de agenda e orçamento.\n\nPosso te mandar informações sobre os planos?' },
  { key: 'followup_em_breve_2',    nome: 'Follow-up Em Breve — Msg 2 (1 dia)', categoria: 'follow_up',  variaveis: ['{nome}', '{box_nome}'], texto: '{nome}, tudo bem? 👋\n\nSó passando pra lembrar que no *{box_nome}* temos aulas em vários horários.\n\nQuando você se sentir pronto(a), estamos aqui! 💪' },
  { key: 'followup_em_breve_3',    nome: 'Follow-up Em Breve — Msg 3 (3 dias)',categoria: 'follow_up',  variaveis: ['{nome}', '{box_nome}'], texto: '{nome}! 🏋️\n\nPassei pra ver se consigo te ajudar com alguma dúvida sobre o *{box_nome}*.\n\nQualquer coisa é só chamar! 😊' },
  { key: 'followup_comparando_1',  nome: 'Follow-up Comparando — Msg 1 (1d)',  categoria: 'follow_up',  variaveis: ['{nome}', '{box_nome}'], texto: '{nome}, boa tarde! ☀️\n\nAinda avaliando opções de treino?\n\nO *{box_nome}* tem estrutura completa. Que tal uma aula experimental sem compromisso? 💪' },
  { key: 'followup_comparando_2',  nome: 'Follow-up Comparando — Msg 2 (7d)',  categoria: 'follow_up',  variaveis: ['{nome}', '{box_nome}'], texto: 'Oi {nome}! 😊\n\nSempre que precisar tirar dúvidas sobre o *{box_nome}*, estou aqui!\n\nTemos planos flexíveis e você pode começar a qualquer momento. 🏋️' },
  { key: 'followup_comparando_3',  nome: 'Follow-up Comparando — Msg 3 (14d)', categoria: 'follow_up',  variaveis: ['{nome}', '{box_nome}'], texto: '{nome}! 👋\n\nÚltima mensagem, prometo! 😄\n\nSe um dia decidir começar, o *{box_nome}* estará sempre de portas abertas! 💪\n\nBoa semana!' },
  { key: 'retencao_3_faltas',      nome: 'Retenção — 3 Faltas',                categoria: 'retencao',   variaveis: ['{nome}', '{box_nome}', '{faltas}'], texto: '{nome}, sumiu! 😮\n\nFaz {faltas} dias que você não aparece no *{box_nome}*...\n\nEstá tudo bem? Nossa equipe está sentindo sua falta! 💪' },
  { key: 'retencao_5_faltas',      nome: 'Retenção — 5 Faltas (Crítico)',       categoria: 'retencao',   variaveis: ['{nome}', '{box_nome}', '{faltas}'], texto: '{nome}! ⚠️\n\nEstamos preocupados! Faz {faltas} dias sem aparecer no *{box_nome}*.\n\nSe estiver passando por alguma dificuldade, vamos encontrar uma solução juntos. Não some! 🙏' },
  { key: 'renovacao_7_dias',       nome: 'Renovação — 7 Dias Antes',           categoria: 'renovacao',  variaveis: ['{nome}', '{box_nome}', '{dias_vencimento}', '{data_vencimento}'], texto: 'Oi {nome}! 📅\n\nSeu plano no *{box_nome}* vence em *{dias_vencimento} dias* (dia {data_vencimento}).\n\nPara renovar é super simples — me chama aqui! 😊' },
  { key: 'renovacao_1_dia',        nome: 'Renovação — 1 Dia Antes',            categoria: 'renovacao',  variaveis: ['{nome}', '{box_nome}', '{data_vencimento}'], texto: '{nome}! ⏰\n\nSeu plano vence *amanhã* ({data_vencimento}) no *{box_nome}*.\n\nRenova agora pra não perder o ritmo! Me chama! 💪' },
  { key: 'renovacao_inadimplente', nome: 'Cobrança Amigável',                  categoria: 'renovacao',  variaveis: ['{nome}', '{box_nome}'], texto: 'Oi {nome}! 😊\n\nPassando pra lembrar que seu plano no *{box_nome}* está em aberto.\n\nPode contar com a gente pra encontrar uma solução! Me chama. 🙏' },
  { key: 'indicacao_convertida',   nome: 'Indicação Convertida',               categoria: 'indicacao',  variaveis: ['{nome}', '{box_nome}'], texto: '{nome}! 🎉\n\nSua indicação funcionou! A pessoa que você indicou para o *{box_nome}* acabou de se matricular!\n\nMuito obrigado por confiar em nós. Você é incrível! 💪\n\nSeu benefício de indicação será aplicado na próxima renovação! 🎁' },
  { key: 'alerta_lead_novo',       nome: 'Alerta de Novo Lead (Dono)',         categoria: 'alertas',    variaveis: ['{nome}', '{box_nome}', '{mensagem_original}'], texto: '🔥 *Novo lead no {box_nome}!*\n\n👤 *{nome}*\n💬 "{mensagem_original}"\n\nAcesse o painel LOTA!\n_www.lota.app.br_' },
]

// ─── Renderiza preview com negrito (*texto*) e quebras de linha ───────────────
function renderWhatsAppText(texto) {
  return texto
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/\n/g, '<br/>')
    .replace(/\{(\w+)\}/g, '<span style="background:rgba(0,229,255,0.15);color:#00E5FF;border-radius:3px;padding:0 3px;font-size:12px">{$1}</span>')
}

// ─── Componente de Preview WhatsApp ──────────────────────────────────────────
function WhatsAppPreview({ texto, nomeBox }) {
  const previewTexto = texto
    .replace(/\{nome\}/g, 'João Silva')
    .replace(/\{box_nome\}/g, nomeBox || 'BraveFit')
    .replace(/\{faltas\}/g, '3')
    .replace(/\{dias_vencimento\}/g, '7')
    .replace(/\{data_vencimento\}/g, '18/06')
    .replace(/\{mensagem_original\}/g, 'Quero saber sobre o box!')

  const htmlTexto = previewTexto
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em style="color:rgba(255,255,255,0.7)">$1</em>')
    .replace(/\n/g, '<br/>')

  const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{
      background: '#0B141A',
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.08)',
      minWidth: 280,
      maxWidth: 340,
    }}>
      {/* Header WhatsApp */}
      <div style={{
        background: '#1F2C34',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, #00E5FF, #0070F3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 700, color: '#fff',
          flexShrink: 0,
        }}>
          {(nomeBox || 'BraveFit')[0].toUpperCase()}
        </div>
        <div>
          <div style={{ color: '#E9EDEF', fontSize: 14, fontWeight: 600 }}>
            {nomeBox || 'BraveFit'}
          </div>
          <div style={{ color: '#8696A0', fontSize: 12 }}>online</div>
        </div>
      </div>

      {/* Background chat */}
      <div style={{
        background: '#0B141A',
        backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(0,229,255,0.03) 0%, transparent 50%)',
        padding: '16px 12px 24px',
        minHeight: 160,
        display: 'flex',
        alignItems: 'flex-start',
      }}>
        {/* Bolha da mensagem */}
        <div style={{
          background: '#005C4B',
          borderRadius: '0 8px 8px 8px',
          padding: '8px 12px 20px',
          maxWidth: '85%',
          position: 'relative',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }}>
          {/* Triângulo */}
          <div style={{
            position: 'absolute',
            top: 0, left: -8,
            width: 0, height: 0,
            borderTop: '8px solid #005C4B',
            borderLeft: '8px solid transparent',
          }} />
          <div
            style={{
              color: '#E9EDEF',
              fontSize: 13.5,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
            dangerouslySetInnerHTML={{ __html: htmlTexto }}
          />
          <div style={{
            position: 'absolute',
            bottom: 5, right: 10,
            color: 'rgba(233,237,239,0.5)',
            fontSize: 11,
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            {now}
            <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
              <path d="M1 5L5 9L15 1" stroke="#53BDEB" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M5 5L9 9L15 1" stroke="#53BDEB" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Mensagens() {
  const { currentBox } = useApp()
  const [categoriaAtiva, setCategoriaAtiva] = useState('boas_vindas')
  const [templates, setTemplates] = useState([])
  const [templateAtivo, setTemplateAtivo] = useState(null)
  const [textoEdit, setTextoEdit] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [feedback, setFeedback] = useState(null) // { tipo: 'ok'|'erro', msg }
  const [loading, setLoading] = useState(true)

  const boxId = currentBox?.id
  const nomeBox = currentBox?.nome || 'BraveFit'

  // Carrega templates do Supabase ou usa padrão
  const carregarTemplates = useCallback(async () => {
    setLoading(true)
    try {
      if (boxId) {
        const { data, error } = await supabase
          .from('templates')
          .select('*')
          .eq('box_id', boxId)
          .order('categoria')

        if (!error && data?.length > 0) {
          setTemplates(data)
        } else {
          // Usa padrão local se banco não tem templates
          setTemplates(TEMPLATES_PADRAO.map(t => ({ ...t, id: t.key, box_id: boxId, ativo: true })))
        }
      } else {
        setTemplates(TEMPLATES_PADRAO.map(t => ({ ...t, id: t.key, ativo: true })))
      }
    } catch {
      setTemplates(TEMPLATES_PADRAO.map(t => ({ ...t, id: t.key, ativo: true })))
    } finally {
      setLoading(false)
    }
  }, [boxId])

  useEffect(() => { carregarTemplates() }, [carregarTemplates])

  // Seleciona o primeiro template da categoria ao mudar
  useEffect(() => {
    const lista = templates.filter(t => t.categoria === categoriaAtiva)
    if (lista.length > 0 && (!templateAtivo || templateAtivo.categoria !== categoriaAtiva)) {
      setTemplateAtivo(lista[0])
      setTextoEdit(lista[0].texto)
    }
  }, [categoriaAtiva, templates])

  const handleSelectTemplate = (t) => {
    setTemplateAtivo(t)
    setTextoEdit(t.texto)
    setFeedback(null)
  }

  const handleSalvar = async () => {
    if (!templateAtivo) return
    setSalvando(true)
    setFeedback(null)
    try {
      if (boxId) {
        const { error } = await supabase
          .from('templates')
          .upsert({
            box_id:    boxId,
            key:       templateAtivo.key,
            nome:      templateAtivo.nome,
            categoria: templateAtivo.categoria,
            canal:     templateAtivo.canal || 'whatsapp',
            ativo:     templateAtivo.ativo,
            texto:     textoEdit,
            variaveis: templateAtivo.variaveis || [],
          }, { onConflict: 'box_id,key' })

        if (error) throw error
      }
      // Atualiza localmente
      setTemplates(prev => prev.map(t =>
        t.key === templateAtivo.key ? { ...t, texto: textoEdit } : t
      ))
      setTemplateAtivo(prev => ({ ...prev, texto: textoEdit }))
      setFeedback({ tipo: 'ok', msg: 'Mensagem salva com sucesso!' })
    } catch (err) {
      setFeedback({ tipo: 'erro', msg: 'Erro ao salvar: ' + err.message })
    } finally {
      setSalvando(false)
    }
  }

  const handleToggleAtivo = async (t) => {
    try {
      const novoAtivo = !t.ativo
      if (boxId) {
        await supabase.from('templates').upsert({
          box_id: boxId, key: t.key, nome: t.nome, categoria: t.categoria,
          canal: t.canal || 'whatsapp', ativo: novoAtivo, texto: t.texto,
          variaveis: t.variaveis || [],
        }, { onConflict: 'box_id,key' })
      }
      setTemplates(prev => prev.map(x => x.key === t.key ? { ...x, ativo: novoAtivo } : x))
      if (templateAtivo?.key === t.key) setTemplateAtivo(prev => ({ ...prev, ativo: novoAtivo }))
    } catch (err) {
      console.error(err)
    }
  }

  const inserirVariavel = (v) => {
    setTextoEdit(prev => prev + v)
  }

  const templatesDaCategoria = templates.filter(t => t.categoria === categoriaAtiva)

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: 'linear-gradient(135deg, #00E5FF22, #0070F322)',
            border: '1px solid rgba(0,229,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageSquare size={20} color="#00E5FF" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Mensagens Automáticas
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
              Personalize todas as mensagens enviadas pelo LOTA para leads e alunos
            </p>
          </div>
        </div>

        {/* Caixa de instruções */}
        <div style={{
          background: 'rgba(0,229,255,0.05)',
          border: '1px solid rgba(0,229,255,0.15)',
          borderRadius: 10,
          padding: '12px 16px',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          marginTop: 16,
        }}>
          <Info size={16} color="#00E5FF" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-primary)' }}>Como usar:</strong>{' '}
            Selecione uma mensagem na lista, edite o texto e veja o preview ao vivo no formato WhatsApp.
            Use variáveis como <code style={{ color: '#00E5FF', background: 'rgba(0,229,255,0.1)', borderRadius: 3, padding: '0 4px' }}>{'{nome}'}</code> e{' '}
            <code style={{ color: '#00E5FF', background: 'rgba(0,229,255,0.1)', borderRadius: 3, padding: '0 4px' }}>{'{box_nome}'}</code>{' '}
            para personalizar. O toggle ativa ou desativa cada mensagem.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>

        {/* ── Menu de categorias ── */}
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: 8,
          height: 'fit-content',
          position: 'sticky',
          top: 80,
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, padding: '8px 8px 4px' }}>
            Categorias
          </p>
          {CATEGORIAS.map(cat => {
            const count = templates.filter(t => t.categoria === cat.key && t.ativo).length
            const total = templates.filter(t => t.categoria === cat.key).length
            return (
              <button
                key={cat.key}
                onClick={() => setCategoriaAtiva(cat.key)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '10px 10px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  background: categoriaAtiva === cat.key
                    ? `linear-gradient(135deg, ${cat.cor}18, ${cat.cor}08)`
                    : 'transparent',
                  borderLeft: categoriaAtiva === cat.key ? `2px solid ${cat.cor}` : '2px solid transparent',
                  color: categoriaAtiva === cat.key ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: 13,
                  fontWeight: categoriaAtiva === cat.key ? 600 : 400,
                  transition: 'all 0.15s ease',
                  marginBottom: 2,
                }}
              >
                <span>{cat.label}</span>
                {total > 0 && (
                  <span style={{
                    fontSize: 10, background: categoriaAtiva === cat.key ? cat.cor : 'var(--bg-card-hover)',
                    color: categoriaAtiva === cat.key ? '#000' : 'var(--text-muted)',
                    borderRadius: 20, padding: '1px 6px', fontWeight: 600,
                  }}>
                    {count}/{total}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Área principal ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Lista de templates da categoria */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 12,
            overflow: 'hidden',
          }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                {CATEGORIAS.find(c => c.key === categoriaAtiva)?.label}
              </h3>
            </div>
            {loading ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
                <p>Carregando...</p>
              </div>
            ) : templatesDaCategoria.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                Nenhuma mensagem nesta categoria.
              </div>
            ) : (
              templatesDaCategoria.map(t => (
                <div
                  key={t.key}
                  onClick={() => handleSelectTemplate(t)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 20px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: templateAtivo?.key === t.key
                      ? 'rgba(0,229,255,0.06)'
                      : 'transparent',
                    borderLeft: templateAtivo?.key === t.key
                      ? '3px solid #00E5FF'
                      : '3px solid transparent',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* Toggle ativo */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggleAtivo(t) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, padding: 0 }}
                    title={t.ativo ? 'Desativar mensagem' : 'Ativar mensagem'}
                  >
                    {t.ativo
                      ? <ToggleRight size={24} color="#00E5FF" />
                      : <ToggleLeft size={24} color="var(--text-muted)" />
                    }
                  </button>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 500,
                      color: t.ativo ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}>
                      {t.nome}
                    </div>
                    <div style={{
                      fontSize: 12, color: 'var(--text-muted)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      marginTop: 2, opacity: 0.7,
                    }}>
                      {t.texto.substring(0, 60).replace(/\n/g, ' ')}...
                    </div>
                  </div>

                  <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                </div>
              ))
            )}
          </div>

          {/* Editor + Preview */}
          {templateAtivo && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

              {/* ── Editor ── */}
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 12,
                overflow: 'hidden',
              }}>
                <div style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                    ✏️ {templateAtivo.nome}
                  </h3>
                  <button
                    onClick={handleSalvar}
                    disabled={salvando}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '7px 16px', borderRadius: 8,
                      background: 'linear-gradient(135deg, #00E5FF, #0070F3)',
                      border: 'none', color: '#000', fontWeight: 600, fontSize: 13,
                      cursor: salvando ? 'not-allowed' : 'pointer',
                      opacity: salvando ? 0.7 : 1,
                    }}
                  >
                    <Save size={14} />
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>

                <div style={{ padding: 20 }}>
                  {/* Variáveis disponíveis */}
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 8px' }}>
                      Clique para inserir variáveis:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {(templateAtivo.variaveis || []).map(v => (
                        <button
                          key={v}
                          onClick={() => inserirVariavel(v)}
                          style={{
                            padding: '3px 10px', borderRadius: 4,
                            background: 'rgba(0,229,255,0.1)',
                            border: '1px solid rgba(0,229,255,0.2)',
                            color: '#00E5FF', fontSize: 12, cursor: 'pointer',
                            fontFamily: 'monospace',
                          }}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dicas de formatação */}
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginBottom: 12,
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    display: 'flex',
                    gap: 16,
                  }}>
                    <span><strong style={{ color: 'var(--text-primary)' }}>*texto*</strong> = <strong>negrito</strong></span>
                    <span><strong style={{ color: 'var(--text-primary)' }}>_texto_</strong> = <em>itálico</em></span>
                    <span>Enter = nova linha</span>
                  </div>

                  {/* Textarea */}
                  <textarea
                    value={textoEdit}
                    onChange={e => setTextoEdit(e.target.value)}
                    style={{
                      width: '100%',
                      minHeight: 200,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      lineHeight: 1.6,
                      padding: 14,
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                    placeholder="Escreva a mensagem aqui..."
                    onFocus={e => { e.target.style.borderColor = '#00E5FF' }}
                    onBlur={e => { e.target.style.borderColor = 'var(--border-subtle)' }}
                  />

                  {/* Contagem de caracteres */}
                  <div style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {textoEdit.length} caracteres
                  </div>

                  {/* Feedback */}
                  {feedback && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 14px', borderRadius: 8, marginTop: 12,
                      background: feedback.tipo === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      border: `1px solid ${feedback.tipo === 'ok' ? '#10B98140' : '#EF444440'}`,
                      color: feedback.tipo === 'ok' ? '#10B981' : '#EF4444',
                      fontSize: 13,
                    }}>
                      {feedback.tipo === 'ok'
                        ? <CheckCircle size={16} />
                        : <AlertTriangle size={16} />
                      }
                      {feedback.msg}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Preview ao vivo ── */}
              <div>
                <div style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <Smartphone size={16} color="#00E5FF" />
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      Preview ao vivo
                    </h3>
                  </div>
                  <div style={{ padding: 20 }}>
                    <WhatsAppPreview texto={textoEdit} nomeBox={nomeBox} />
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>
                      Variáveis substituídas por valores de exemplo
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        textarea:focus { outline: none; }
      `}</style>
    </div>
  )
}
