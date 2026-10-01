import { useReducedMotion } from 'motion/react'

export type Prop = 'laptop' | 'guitar' | 'rest'

export function propForHour(h: number): Prop {
  if (h >= 8 && h < 17) return 'laptop'
  if (h >= 19 && h < 21) return 'guitar'
  return 'rest'
}

export default function Avatar({ prop = 'laptop', size = 220 }: { prop?: Prop; size?: number }) {
  const reduce = useReducedMotion()
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label="Avatar de Monterroso"
      className={reduce ? undefined : 'avatar-bob'}
    >
      <path d="M30 200c0-38 30-62 70-62s70 24 70 62z" fill="#17305a" />
      <path d="M82 138l18 20 18-20" fill="none" stroke="#d9c7a0" strokeWidth="3" strokeLinecap="round" />
      <rect x="88" y="112" width="24" height="28" rx="10" fill="#c99a76" />
      <ellipse cx="100" cy="88" rx="34" ry="38" fill="#d9aa84" />
      <path d="M64 84c-2-30 16-46 38-44 22 2 34 18 32 44-8-14-18-20-34-20s-26 6-36 20z" fill="#0b1730" />
      <g className={reduce ? undefined : 'avatar-blink'} style={{ transformOrigin: '100px 92px' }}>
        <circle cx="88" cy="92" r="3.2" fill="#0b1730" />
        <circle cx="112" cy="92" r="3.2" fill="#0b1730" />
      </g>
      <path d="M92 108c5 4 11 4 16 0" fill="none" stroke="#0b1730" strokeWidth="2.5" strokeLinecap="round" />
      {prop === 'laptop' && (
        <g>
          <rect x="52" y="150" width="96" height="8" rx="3" fill="#8fb3d9" />
          <rect x="62" y="124" width="76" height="28" rx="4" fill="#0b1730" stroke="#8fb3d9" strokeWidth="2" />
          <path d="M72 134h18M72 141h30" stroke="#d9c7a0" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}
      {prop === 'guitar' && (
        <g transform="rotate(-28 100 160)">
          <rect x="150" y="104" width="6" height="70" rx="3" fill="#d9c7a0" transform="rotate(28 150 140)" />
          <ellipse cx="96" cy="170" rx="30" ry="24" fill="#b58b5a" />
          <circle cx="96" cy="170" r="7" fill="#0b1730" />
        </g>
      )}
      {prop === 'rest' && (
        <text x="150" y="60" fill="#8fb3d9" fontSize="16" fontFamily="Fraunces, serif">
          z z
        </text>
      )}
    </svg>
  )
}
