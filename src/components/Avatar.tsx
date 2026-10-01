import { useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

export type Prop = 'laptop' | 'guitar' | 'drums' | 'piano' | 'wave' | 'rest'
export const props: Prop[] = ['laptop', 'guitar', 'drums', 'piano', 'wave', 'rest']

export function propForHour(h: number): Prop {
  if (h >= 8 && h < 17) return 'laptop'
  if (h >= 19 && h < 21) return 'guitar'
  return 'rest'
}

const SKIN = '#f0c39b'
const SLEEVE = '#2a5089'
const SLEEVE_EDGE = '#14294f'
const BRASS = '#d9c7a0'

function Arm({ d }: { d: string }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={SLEEVE_EDGE} strokeWidth="13" />
      <path d={d} stroke={SLEEVE} strokeWidth="10" />
    </g>
  )
}

function Hand({ x, y, cls, style }: { x: number; y: number; cls?: string; style?: React.CSSProperties }) {
  return (
    <g className={cls} style={style}>
      <ellipse cx={x} cy={y} rx="5.4" ry="5.8" fill={SKIN} />
      <ellipse cx={x + 4.4} cy={y - 2} rx="2" ry="3.1" fill={SKIN} transform={`rotate(25 ${x + 4.4} ${y - 2})`} />
    </g>
  )
}

function Note({ x, y, d }: { x: number; y: number; d: number }) {
  return (
    <g className="av-float" style={{ animationDelay: `${d}s` }}>
      <ellipse cx={x} cy={y} rx="3.2" ry="2.4" fill={BRASS} />
      <path d={`M${x + 3} ${y}v-11l5 2`} stroke={BRASS} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </g>
  )
}

function Scene({ prop }: { prop: Prop }) {
  switch (prop) {
    case 'laptop':
      return (
        <g>
          <rect x="52" y="130" width="96" height="36" rx="5" fill="#0f2347" stroke="#3a5a8f" strokeWidth="1.5" />
          <circle cx="100" cy="148" r="7" fill="none" stroke={BRASS} strokeWidth="1.4" />
          <ellipse cx="100" cy="148" rx="3" ry="7" fill="none" stroke={BRASS} strokeWidth="1" />
          <path d="M93 148h14" stroke={BRASS} strokeWidth="1" />
          <path d="M42 167h116l-7 7H49z" fill="#8fb3d9" />
          <Arm d="M72 152C52 162 54 172 62 177" />
          <Arm d="M128 152C148 162 146 172 138 177" />
          <Hand x={63} y={178} cls="av-hand-a" />
          <Hand x={131} y={178} cls="av-hand-b" />
        </g>
      )
    case 'guitar':
      return (
        <g>
          <g transform="rotate(-40 110 186)">
            <rect x="106" y="90" width="8" height="12" rx="2" fill="#5a3b25" />
            <rect x="106.5" y="100" width="7" height="62" fill="#3a2a22" />
            <ellipse cx="110" cy="158" rx="20" ry="15" fill="#b58b5a" stroke="#8a6238" strokeWidth="1.5" />
            <ellipse cx="110" cy="186" rx="29" ry="23" fill="#b58b5a" stroke="#8a6238" strokeWidth="1.5" />
            <circle cx="110" cy="182" r="7.5" fill="#1a110c" />
            <rect x="102" y="197" width="16" height="3" rx="1.5" fill="#3a2a22" />
            {[108.2, 110, 111.8].map((x) => (
              <line key={x} className="av-string" x1={x} y1="100" x2={x} y2="198" stroke="#f1ebdd" strokeWidth=".7" opacity=".85" />
            ))}
          </g>
          <Arm d="M72 152C56 146 60 140 67 135" />
          <Hand x={69} y={133} />
          <Arm d="M128 152C142 166 134 172 126 178" />
          <Hand x={124} y={180} cls="av-strum" />
          <Note x={150} y={100} d={0} />
          <Note x={164} y={122} d={1.1} />
          <Note x={142} y={116} d={2.1} />
        </g>
      )
    case 'drums':
      return (
        <g>
          <ellipse cx="156" cy="112" rx="21" ry="4" fill={BRASS} opacity=".9" />
          <path d="M156 114v62" stroke="#3a5a8f" strokeWidth="2" />
          <path d="M44 174v12M96 174v12" stroke="#2b4776" strokeWidth="3" />
          <rect x="44" y="172" width="52" height="14" rx="3" fill="#17305a" />
          <ellipse className="av-drum" cx="70" cy="172" rx="26" ry="9" fill="#f1ebdd" stroke={BRASS} strokeWidth="2" />
          <path d="M110 168v14M154 168v14" stroke="#2b4776" strokeWidth="3" />
          <rect x="110" y="166" width="44" height="14" rx="3" fill="#17305a" />
          <ellipse className="av-drum b" cx="132" cy="166" rx="22" ry="8" fill="#f1ebdd" stroke="#8fb3d9" strokeWidth="2" />
          <Arm d="M72 152C54 142 56 132 62 124" />
          <Arm d="M128 152C146 142 144 132 138 124" />
          <g className="av-stick-l"><line x1="62" y1="124" x2="72" y2="164" stroke="#f1ebdd" strokeWidth="3" strokeLinecap="round" /></g>
          <g className="av-stick-r"><line x1="138" y1="124" x2="130" y2="160" stroke="#f1ebdd" strokeWidth="3" strokeLinecap="round" /></g>
          <Hand x={61} y={123} />
          <Hand x={133} y={123} />
        </g>
      )
    case 'piano':
      return (
        <g>
          <rect x="32" y="160" width="136" height="34" rx="4" fill="#f1ebdd" />
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={i} x1={45.6 + i * 13.6} y1="160" x2={45.6 + i * 13.6} y2="194" stroke="#b9bfce" strokeWidth="1" />
          ))}
          {[0, 1, 3, 4, 5, 7, 8].map((i, n) => (
            <rect key={i} className="av-key" x={40 + i * 13.6} y="160" width="9" height="20" rx="1.5" fill="#0b1730" style={{ animationDelay: `${n * 0.17}s` }} />
          ))}
          <Arm d="M72 152C60 160 70 160 76 156" />
          <Arm d="M128 152C140 160 130 160 124 156" />
          <Hand x={77} y={156} cls="av-hand-a" />
          <Hand x={121} y={156} cls="av-hand-b" />
          <Note x={152} y={110} d={0.4} />
          <Note x={42} y={116} d={1.6} />
        </g>
      )
    case 'wave':
      return (
        <g>
          <Arm d="M72 152C68 172 66 190 68 204" />
          <Arm d="M128 152C140 152 150 146 152 136" />
          <g className="av-wave">
            <path d="M152 136L156 108" fill="none" stroke={SLEEVE_EDGE} strokeWidth="13" strokeLinecap="round" />
            <path d="M152 136L156 108" fill="none" stroke={SLEEVE} strokeWidth="10" strokeLinecap="round" />
            <Hand x={156} y={99} />
          </g>
        </g>
      )
    default:
      return (
        <g>
          <Arm d="M72 152C68 172 66 190 68 204" />
          <Arm d="M128 152C132 172 134 190 132 204" />
          <g fontFamily="Fraunces, serif" fill="#8fb3d9">
            <text className="av-float" x="146" y="64" fontSize="15">z</text>
            <text className="av-float" x="156" y="50" fontSize="12" style={{ animationDelay: '1s' }}>z</text>
            <text className="av-float" x="164" y="38" fontSize="10" style={{ animationDelay: '2s' }}>z</text>
          </g>
        </g>
      )
  }
}

export default function Avatar({ prop = 'laptop', size = 220, hop = false }: { prop?: Prop; size?: number; hop?: boolean }) {
  const reduce = useReducedMotion()
  const ref = useRef<SVGSVGElement>(null)

  // Ojos y cabeza siguen el puntero, con límites cortos
  useEffect(() => {
    if (reduce) return
    const el = ref.current
    if (!el) return
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      const dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth
      const dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight
      el.style.setProperty('--ex', `${(dx * 7).toFixed(2)}px`)
      el.style.setProperty('--ey', `${(dy * 4).toFixed(2)}px`)
      el.style.setProperty('--tilt', `${(dx * 5).toFixed(2)}deg`)
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [reduce])

  const sleeping = prop === 'rest'

  return (
    <svg ref={ref} viewBox="0 0 200 200" width={size} height={size} role="img" aria-label="Avatar de Monterroso" className={hop ? 'av-hop' : undefined} style={{ maxWidth: '100%', height: 'auto' }}>
      {/* Torso y cuello (delgado, color plano) */}
      <g className="av-body">
        <path d="M44 204C46 172 62 150 84 144h32c22 6 38 28 40 60z" fill="#1f4073" />
        <path d="M60 170c4-12 12-20 24-24" fill="none" stroke="#ffffff" strokeOpacity=".12" strokeWidth="3" strokeLinecap="round" />
        <rect x="92" y="112" width="16" height="34" rx="8" fill="#e2a97f" />
        <path d="M84 143l16 22 16-22-6-2-10 12-10-12z" fill="#e9dfc8" />
      </g>

      {/* Cabeza: estilo animado, colores planos */}
      <g className="av-head">
        <circle cx="71" cy="84" r="6" fill="#e2a97f" />
        <circle cx="129" cy="84" r="6" fill="#e2a97f" />
        <path d="M70 76C70 52 84 44 100 44s30 8 30 32c0 22-12 42-30 42S70 98 70 76z" fill="#f0c39b" />
        <path d="M67 76C62 50 80 36 102 36c20 0 38 12 33 40-4-12-10-18-18-20-10 4-26 4-36 2-6 2-10 8-14 18z" fill="#1c1612" />
        <path d="M84 46c8-5 18-6 28-3" fill="none" stroke="#ffffff" strokeOpacity=".18" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="81" cy="96" rx="6" ry="4" fill="#f08f86" opacity=".45" />
        <ellipse cx="119" cy="96" rx="6" ry="4" fill="#f08f86" opacity=".45" />
        <path d="M81 72q7-3 13-1M106 71q6-2 13 1" stroke="#1c1612" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        {sleeping ? (
          <g stroke="#1c1612" strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M82 83q6 4 12 0M106 83q6 4 12 0" />
          </g>
        ) : (
          <g className="av-blink">
            <g className="av-pupil">
              <ellipse cx="88" cy="83" rx="3.6" ry="4.6" fill="#1c1612" />
              <ellipse cx="112" cy="83" rx="3.6" ry="4.6" fill="#1c1612" />
              <circle cx="89.3" cy="81.4" r="1.4" fill="#fff" />
              <circle cx="113.3" cy="81.4" r="1.4" fill="#fff" />
            </g>
          </g>
        )}
        <path d="M98 92q2 2.4 4 0" fill="none" stroke="#c98d68" strokeWidth="1.8" strokeLinecap="round" />
        <path d={sleeping ? 'M93 104h14' : 'M90 100q10 9 20 0'} fill="none" stroke="#9a3f35" strokeWidth="2.6" strokeLinecap="round" />
      </g>

      <Scene prop={prop} />
    </svg>
  )
}
