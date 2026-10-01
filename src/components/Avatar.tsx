import { useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

export type Prop = 'laptop' | 'guitar' | 'drums' | 'piano' | 'wave' | 'rest'
export const props: Prop[] = ['laptop', 'guitar', 'drums', 'piano', 'wave', 'rest']

export function propForHour(h: number): Prop {
  if (h >= 8 && h < 17) return 'laptop'
  if (h >= 19 && h < 21) return 'guitar'
  return 'rest'
}

const SKIN = '#d9aa84'
const SKIN_D = '#c99a76'
const NAVY = '#0b1730'

function Note({ x, y, d }: { x: number; y: number; d: number }) {
  return (
    <g className="av-float" style={{ animationDelay: `${d}s` }}>
      <ellipse cx={x} cy={y} rx="3.2" ry="2.4" fill="#d9c7a0" />
      <path d={`M${x + 3} ${y}v-11l5 2`} stroke="#d9c7a0" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </g>
  )
}

function Scene({ prop }: { prop: Prop }) {
  switch (prop) {
    case 'laptop':
      return (
        <g>
          <rect x="52" y="150" width="96" height="8" rx="3" fill="#8fb3d9" />
          <rect x="62" y="122" width="76" height="30" rx="4" fill={NAVY} stroke="#8fb3d9" strokeWidth="2" />
          <path d="M72 132h22M72 139h34M72 146h14" stroke="#d9c7a0" strokeWidth="2.4" strokeLinecap="round" />
          <rect className="av-cursor" x="92" y="143.5" width="5" height="5" fill="#d9c7a0" />
          <circle className="av-hand-a" cx="84" cy="154" r="6" fill={SKIN} />
          <circle className="av-hand-b" cx="116" cy="154" r="6" fill={SKIN} />
        </g>
      )
    case 'guitar':
      return (
        <g>
          <g transform="rotate(-52 100 172)">
            <rect x="96" y="104" width="7" height="62" rx="3" fill="#d9c7a0" />
            <ellipse cx="100" cy="176" rx="30" ry="25" fill="#b58b5a" />
            <circle cx="100" cy="176" r="8" fill={NAVY} />
            {[0, 1, 2].map((i) => (
              <line key={i} className="av-string" x1={97.5 + i * 2.4} y1="106" x2={97.5 + i * 2.4} y2="180" stroke="#f1ebdd" strokeWidth=".7" />
            ))}
          </g>
          <circle cx="50" cy="132" r="6" fill={SKIN} />
          <circle className="av-strum" cx="114" cy="172" r="6.5" fill={SKIN} />
          <Note x={148} y={96} d={0} />
          <Note x={160} y={116} d={1.1} />
          <Note x={140} y={110} d={2.1} />
        </g>
      )
    case 'drums':
      return (
        <g>
          <ellipse className="av-drum" cx="68" cy="166" rx="27" ry="11" fill="#17305a" stroke="#d9c7a0" strokeWidth="2" />
          <ellipse className="av-drum b" cx="134" cy="166" rx="27" ry="11" fill="#17305a" stroke="#8fb3d9" strokeWidth="2" />
          <path d="M44 166v16M92 166v16M110 166v16M158 166v16" stroke="#243e6b" strokeWidth="3" />
          <g className="av-stick-l"><line x1="64" y1="132" x2="76" y2="160" stroke="#f1ebdd" strokeWidth="3" strokeLinecap="round" /></g>
          <g className="av-stick-r"><line x1="136" y1="132" x2="124" y2="160" stroke="#f1ebdd" strokeWidth="3" strokeLinecap="round" /></g>
          <circle cx="64" cy="132" r="5.5" fill={SKIN} />
          <circle cx="136" cy="132" r="5.5" fill={SKIN} />
        </g>
      )
    case 'piano':
      return (
        <g>
          <rect x="40" y="150" width="120" height="32" rx="4" fill="#f1ebdd" />
          {Array.from({ length: 9 }).map((_, i) => (
            <line key={i} x1={53 + i * 12.5} y1="150" x2={53 + i * 12.5} y2="182" stroke="#b9bfce" strokeWidth="1" />
          ))}
          {[0, 1, 3, 4, 5, 7].map((i, n) => (
            <rect key={i} className="av-key" x={49 + i * 12.5} y="150" width="8" height="18" rx="1.5" fill={NAVY} style={{ animationDelay: `${n * 0.17}s` }} />
          ))}
          <circle className="av-hand-a" cx="78" cy="148" r="6" fill={SKIN} />
          <circle className="av-hand-b" cx="122" cy="148" r="6" fill={SKIN} />
          <Note x={150} y={104} d={0.4} />
          <Note x={44} y={110} d={1.6} />
        </g>
      )
    case 'wave':
      return (
        <g>
          <g className="av-wave">
            <path d="M150 150c10-14 12-30 10-44" stroke="#17305a" strokeWidth="14" strokeLinecap="round" fill="none" />
            <circle cx="160" cy="102" r="8" fill={SKIN} />
          </g>
        </g>
      )
    default:
      return (
        <g fontFamily="Fraunces, serif" fill="#8fb3d9">
          <text className="av-float" x="146" y="70" fontSize="15">z</text>
          <text className="av-float" x="156" y="56" fontSize="12" style={{ animationDelay: '1s' }}>z</text>
          <text className="av-float" x="164" y="44" fontSize="10" style={{ animationDelay: '2s' }}>z</text>
        </g>
      )
  }
}

export default function Avatar({ prop = 'laptop', size = 220, hop = false }: { prop?: Prop; size?: number; hop?: boolean }) {
  const reduce = useReducedMotion()
  const ref = useRef<SVGSVGElement>(null)

  // Los ojos y la cabeza siguen el puntero (con límites cortos)
  useEffect(() => {
    if (reduce) return
    const el = ref.current
    if (!el) return
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth
      const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight
      el.style.setProperty('--ex', `${(dx * 8).toFixed(2)}px`)
      el.style.setProperty('--ey', `${(dy * 5).toFixed(2)}px`)
      el.style.setProperty('--tilt', `${(dx * 6).toFixed(2)}deg`)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [reduce])

  const sleeping = prop === 'rest'

  return (
    <svg ref={ref} viewBox="0 0 200 200" width={size} height={size} role="img" aria-label="Avatar de Monterroso" className={hop ? 'av-hop' : undefined} style={{ maxWidth: '100%', height: 'auto' }}>
      <g className="av-body">
        <path d="M30 200c0-38 30-62 70-62s70 24 70 62z" fill="#17305a" />
        <path d="M82 138l18 20 18-20" fill="none" stroke="#d9c7a0" strokeWidth="3" strokeLinecap="round" />
      </g>
      <rect x="88" y="112" width="24" height="28" rx="10" fill={SKIN_D} />
      <g className="av-head">
        <ellipse cx="100" cy="88" rx="34" ry="38" fill={SKIN} />
        <path d="M64 84c-2-30 16-46 38-44 22 2 34 18 32 44-8-14-18-20-34-20s-26 6-36 20z" fill={NAVY} />
        <ellipse cx="66" cy="92" rx="4" ry="7" fill={SKIN_D} />
        <ellipse cx="134" cy="92" rx="4" ry="7" fill={SKIN_D} />
        {sleeping ? (
          <g stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" fill="none">
            <path d="M82 93q6 4 12 0M106 93q6 4 12 0" />
          </g>
        ) : (
          <g className="av-blink">
            <circle cx="88" cy="92" r="4.2" fill="#f1ebdd" />
            <circle cx="112" cy="92" r="4.2" fill="#f1ebdd" />
            <circle className="av-pupil" cx="88" cy="92" r="2.6" fill={NAVY} />
            <circle className="av-pupil" cx="112" cy="92" r="2.6" fill={NAVY} />
          </g>
        )}
        <path d="M80 82q8-4 16 0M104 82q8-4 16 0" stroke={NAVY} strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d={sleeping ? 'M93 108h14' : 'M91 107c5 5 13 5 18 0'} fill="none" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <Scene prop={prop} />
    </svg>
  )
}
