import { useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

export type Prop = 'laptop' | 'guitar' | 'drums' | 'piano' | 'wave' | 'rest'
export const props: Prop[] = ['laptop', 'guitar', 'drums', 'piano', 'wave', 'rest']

export function propForHour(h: number): Prop {
  if (h >= 8 && h < 17) return 'laptop'
  if (h >= 19 && h < 21) return 'guitar'
  return 'rest'
}

const HAIR = 'url(#av-hair)'
const SKIN = 'url(#av-skin)'
const SLEEVE = '#244879'
const SLEEVE_EDGE = '#14294f'
const BRASS = '#d9c7a0'

function Arm({ d }: { d: string }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={SLEEVE_EDGE} strokeWidth="17" />
      <path d={d} stroke={SLEEVE} strokeWidth="14" />
    </g>
  )
}

function Hand({ x, y, cls, style }: { x: number; y: number; cls?: string; style?: React.CSSProperties }) {
  return (
    <g className={cls} style={style}>
      <ellipse cx={x} cy={y} rx="6.4" ry="6.8" fill={SKIN} stroke="#b98660" strokeWidth=".6" />
      <ellipse cx={x + 5} cy={y - 2} rx="2.3" ry="3.6" fill={SKIN} transform={`rotate(25 ${x + 5} ${y - 2})`} />
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
          <Arm d="M60 152C52 162 54 172 62 177" />
          <Arm d="M140 152C148 162 146 172 138 177" />
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
          <Arm d="M60 152C56 146 60 140 67 135" />
          <Hand x={69} y={133} />
          <Arm d="M140 152C142 166 134 172 126 178" />
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
          <Arm d="M60 152C54 142 56 132 62 124" />
          <Arm d="M140 152C146 142 144 132 138 124" />
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
          <Arm d="M60 152C60 160 70 160 76 156" />
          <Arm d="M140 152C140 160 130 160 124 156" />
          <Hand x={77} y={156} cls="av-hand-a" />
          <Hand x={121} y={156} cls="av-hand-b" />
          <Note x={152} y={110} d={0.4} />
          <Note x={42} y={116} d={1.6} />
        </g>
      )
    case 'wave':
      return (
        <g>
          <Arm d="M58 152C52 172 50 190 52 204" />
          <Arm d="M140 152C150 150 156 146 158 138" />
          <g className="av-wave">
            <path d="M158 138L160 108" fill="none" stroke={SLEEVE_EDGE} strokeWidth="17" strokeLinecap="round" />
            <path d="M158 138L160 108" fill="none" stroke={SLEEVE} strokeWidth="14" strokeLinecap="round" />
            <Hand x={160} y={99} />
          </g>
        </g>
      )
    default:
      return (
        <g>
          <Arm d="M58 152C52 172 50 190 52 204" />
          <Arm d="M142 152C148 172 150 190 148 204" />
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
      <defs>
        <linearGradient id="av-skin" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#eec6a0" />
          <stop offset="1" stopColor="#dcae86" />
        </linearGradient>
        <linearGradient id="av-hair" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#33271f" />
          <stop offset="1" stopColor="#120d0a" />
        </linearGradient>
        <linearGradient id="av-shirt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#274b80" />
          <stop offset="1" stopColor="#14294f" />
        </linearGradient>
        <linearGradient id="av-neck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a9774f" />
          <stop offset="0.5" stopColor="#cf9f78" />
          <stop offset="1" stopColor="#d8aa84" />
        </linearGradient>
      </defs>

      {/* Torso y cuello */}
      <g className="av-body">
        <path d="M14 204C16 168 44 146 80 140h40c36 6 64 28 66 64z" fill="url(#av-shirt)" />
        <path d="M44 162c12-12 26-18 38-21" fill="none" stroke="#ffffff" strokeOpacity=".12" strokeWidth="3" strokeLinecap="round" />
        <path d="M70 172c8 8 16 12 30 12M130 172c-8 8-16 12-30 12" fill="none" stroke="#0b1730" strokeOpacity=".25" strokeWidth="2" strokeLinecap="round" />
        <rect x="87" y="112" width="26" height="30" rx="12" fill="url(#av-neck)" />
        <path d="M78 139l22 27 22-27-8-3-14 16-14-16z" fill="#e9dfc8" />
        <path d="M100 152v40" stroke="#14294f" strokeOpacity=".5" strokeWidth="1.5" />
      </g>

      {/* Cabeza: estilo ilustrado, redondeado y amable */}
      <g className="av-head">
        <ellipse cx="65" cy="88" rx="6" ry="8.5" fill={SKIN} />
        <ellipse cx="135" cy="88" rx="6" ry="8.5" fill={SKIN} />
        <ellipse cx="100" cy="84" rx="36" ry="37" fill={SKIN} />
        <path d="M64 76C60 48 80 34 102 34c24 0 40 16 36 42-4-12-10-18-20-20-12 4-30 4-40 2-8 2-12 10-14 18z" fill={HAIR} />
        <path d="M80 48c10-6 22-7 34-3" fill="none" stroke="#ffffff" strokeOpacity=".16" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="78" cy="98" rx="9" ry="6" fill="#ee9a8a" opacity=".38" />
        <ellipse cx="122" cy="98" rx="9" ry="6" fill="#ee9a8a" opacity=".38" />
        <path d="M78 72q8-4 15-1M107 71q7-3 15 1" stroke="#2a1d16" strokeWidth="3" strokeLinecap="round" fill="none" />
        {sleeping ? (
          <g stroke="#2a1d16" strokeWidth="2.6" strokeLinecap="round" fill="none">
            <path d="M80 86q7 5 14 0M106 86q7 5 14 0" />
          </g>
        ) : (
          <g className="av-blink">
            <g className="av-pupil">
              <ellipse cx="87" cy="86" rx="4.6" ry="5.4" fill="#2a1d16" />
              <ellipse cx="113" cy="86" rx="4.6" ry="5.4" fill="#2a1d16" />
              <circle cx="88.8" cy="84" r="1.7" fill="#fff" />
              <circle cx="114.8" cy="84" r="1.7" fill="#fff" />
            </g>
          </g>
        )}
        <path d="M97 93q3 3 6 0" fill="none" stroke="#b7805a" strokeWidth="2" strokeLinecap="round" />
        <path d={sleeping ? 'M92 108h16' : 'M88 106q12 11 24 0'} fill="none" stroke="#8a3f33" strokeWidth="2.8" strokeLinecap="round" />
      </g>

      <Scene prop={prop} />
    </svg>
  )
}
