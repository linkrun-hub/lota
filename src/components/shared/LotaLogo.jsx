/**
 * LotaLogo.jsx — Logo oficial da LOTA em SVG inline
 * Extraída diretamente dos arquivos de marca fornecidos pelo usuário.
 *
 * Props:
 *   variant: 'wordmark' | 'icon' | 'icon-sm'
 *   color:   'dark' (fundo escuro, letras #E8E8F0) | 'light' (letras #0B1F33) | 'mono' (branco puro)
 *   width:   número de pixels de largura (altura ajustada automaticamente)
 */
export default function LotaLogo({ variant = 'icon', color = 'dark', width = 32 }) {
  // ── Ícone app (símbolo isolado: o "o" lotando) ──────────────────────────────
  if (variant === 'icon' || variant === 'icon-sm') {
    const stroke = color === 'light' ? '#0B1F33' : color === 'mono' ? '#FFFFFF' : '#E8E8F0'
    const fillWave = color === 'mono' ? '#FFFFFF' : 'url(#lotaIconGrad)'
    const circleFill = color === 'mono' ? '#FFFFFF' : 'url(#lotaIconGrad)'
    const sw = variant === 'icon-sm' ? 14 : 22
    const r = variant === 'icon-sm' ? 9 : 16

    return (
      <svg
        viewBox="0 0 240 240"
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={width}
        aria-label="LOTA"
        role="img"
      >
        <defs>
          <linearGradient id="lotaIconGrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#0070F3" />
            <stop offset="1" stopColor="#00E5FF" />
          </linearGradient>
          <clipPath id="lotaIconClip">
            <circle cx="120" cy="126" r="52" />
          </clipPath>
        </defs>

        {/* nível de lotação (onda 75% cheio) */}
        <g clipPath="url(#lotaIconClip)">
          <path
            d="M 64 102 Q 82 90 100 102 T 136 102 T 172 102 V 184 H 64 Z"
            fill={fillWave}
          />
        </g>

        {/* anel aberto no topo direito (porta do box) */}
        <path
          d="M 187.7 108.4 A 70 70 0 1 1 138.1 58.4"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinecap="round"
          fill="none"
        />

        {/* próximo aluno entrando */}
        <circle cx="187" cy="56" r={r} fill={circleFill} />
      </svg>
    )
  }

  // ── Wordmark: l o t a ────────────────────────────────────────────────────────
  // variant === 'wordmark'
  const stroke = color === 'light' ? '#0B1F33' : color === 'mono' ? '#FFFFFF' : '#E8E8F0'
  const fillWave = color === 'mono' ? '#FFFFFF' : 'url(#lotaWordGrad)'
  const circleFill = color === 'mono' ? '#FFFFFF' : 'url(#lotaWordGrad)'
  const h = Math.round(width * (160 / 560))

  return (
    <svg
      viewBox="0 0 560 160"
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={h}
      aria-label="LOTA"
      role="img"
    >
      <defs>
        <linearGradient id="lotaWordGrad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0070F3" />
          <stop offset="1" stopColor="#00E5FF" />
        </linearGradient>
        <clipPath id="lotaWordClip">
          <circle cx="232" cy="80" r="20.5" />
        </clipPath>
      </defs>

      {/* l */}
      <path d="M 170 32 V 108" stroke={stroke} strokeWidth="13" strokeLinecap="round" fill="none" />

      {/* o — nível de lotação */}
      <g clipPath="url(#lotaWordClip)">
        <path
          d="M 208 71 Q 216 65.5 224 71 T 240 71 T 256 71 V 104 H 208 Z"
          fill={fillWave}
        />
      </g>
      {/* anel com abertura */}
      <path
        d="M 259 72.7 A 28 28 0 1 1 239.3 53"
        stroke={stroke}
        strokeWidth="13"
        strokeLinecap="round"
        fill="none"
      />
      {/* ponto entrando */}
      <circle cx="258.5" cy="50" r="7.5" fill={circleFill} />

      {/* t */}
      <path d="M 296 40 V 88 Q 296 108 314 108" stroke={stroke} strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M 278 58 H 314" stroke={stroke} strokeWidth="13" strokeLinecap="round" fill="none" />

      {/* a */}
      <circle cx="372" cy="80" r="26" stroke={stroke} strokeWidth="13" fill="none" />
      <path d="M 398 54 V 108" stroke={stroke} strokeWidth="13" strokeLinecap="round" fill="none" />
    </svg>
  )
}
