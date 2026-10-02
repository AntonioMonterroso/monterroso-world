import { Coffee, Church, Hamburger, Landmark, MapPin, Mountain, Music, Navigation, PartyPopper, Plane, Shuffle, Store, type LucideIcon } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { mapsSearchUrl, type Place, type Trip } from '../lib/inspire'
import { outingCandidates, type OutingKind } from '../lib/outings'
import { useTable } from '../lib/table'
import { localISO } from '../lib/time'

const ICON: Record<OutingKind, LucideIcon> = { travel: Plane, food: Hamburger, coffee: Coffee, nature: Mountain, church: Church, shop: Store, music: Music, culture: Landmark, other: MapPin }
const HUE: Record<OutingKind, string> = { travel: 'var(--sky)', food: 'var(--clay)', coffee: 'var(--brass)', nature: 'var(--pos)', church: 'var(--brass)', shop: 'var(--teal)', music: 'var(--sky)', culture: 'var(--clay)', other: 'var(--ink-soft)' }

/** Ocho tumbado (∞) que recorre toda la tarjeta: x = A·sen t, y = B·sen 2t. */
function figureEight(w: number, h: number) {
  const cx = w / 2, cy = h / 2 + 4
  const A = w * 0.4, B = h * 0.34
  const pts: string[] = []
  for (let i = 0; i <= 96; i++) {
    const t = (i / 96) * Math.PI * 2
    pts.push(`${i === 0 ? 'M' : 'L'}${(cx + A * Math.sin(t)).toFixed(1)} ${(cy + B * Math.sin(2 * t)).toFixed(1)}`)
  }
  return { d: `${pts.join(' ')} Z`, dest: { x: cx + A, y: cy } }
}

type Phase = 'cruise' | 'landing' | 'parked'
const PIN_AT = 25 // el pin está en el cuarto del recorrido (extremo derecho del ocho)
const LOOP_S = 11

/** El avión da la vuelta en ocho por toda la tarjeta, detrás del texto. Al tocar el pin aterriza a su lado; al tocarlo otra vez, despega. */
function FlightLayer({ w, h, burst, still, phase, onPhase }: { w: number; h: number; burst: number; still: boolean; phase: Phase; onPhase: (p: Phase) => void }) {
  const plane = useRef<SVGGElement>(null)
  const from = useRef(0)
  const { d, dest } = useMemo(() => figureEight(w, h), [w, h])

  // Aterrizaje: desde donde esté el avión, sigue la ruta hasta el pin y se estaciona a su lado.
  useEffect(() => {
    const el = plane.current
    if (phase !== 'landing' || !el) return
    if (still) { onPhase('parked'); return }
    const cur = from.current
    const target = cur <= PIN_AT ? PIN_AT : 100 + PIN_AT
    const duration = Math.max(900, ((target - cur) / 100) * LOOP_S * 1000 * 0.33)
    const anim = el.animate([{ offsetDistance: `${cur}%` }, { offsetDistance: `${target}%` }], { duration, easing: 'cubic-bezier(0.3, 0.7, 0.25, 1)', fill: 'forwards' })
    // El temporizador asegura el estacionado aunque la pestaña no esté dibujando cuadros
    const t = setTimeout(() => onPhase('parked'), duration + 60)
    anim.onfinish = () => { clearTimeout(t); onPhase('parked') }
    return () => { clearTimeout(t); anim.cancel() }
  }, [phase, still, onPhase])

  const toggle = () => {
    if (phase === 'cruise') {
      const el = plane.current
      from.current = el ? (parseFloat(getComputedStyle(el).offsetDistance) || 0) % 100 : 0
      onPhase('landing')
    } else if (phase === 'parked') { resumed.current = true; onPhase('cruise') }
  }

  // Al despegar del pin, el vuelo sigue desde ahí (no desde el inicio del ocho)
  const resumed = useRef(false)
  useEffect(() => { resumed.current = false }, [burst])
  const motion: React.CSSProperties = phase === 'cruise'
    ? { offsetPath: `path("${d}")`, ...(still ? { offsetDistance: '15%', animation: 'none' } : resumed.current ? { animationDelay: `-${(PIN_AT / 100) * LOOP_S}s` } : null) }
    : { offsetPath: `path("${d}")`, animation: 'none', offsetDistance: phase === 'parked' ? `${PIN_AT}%` : `${from.current}%` }

  return (
    <div className="flight" data-phase={phase}>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
        <path d={d} fill="none" stroke="currentColor" strokeOpacity=".28" strokeWidth="1.8" strokeDasharray="2 9" strokeLinecap="round" />
        <g transform={`translate(${dest.x} ${dest.y})`}>
          <ellipse className="pin-ground" cx="0" cy="1" rx="9" ry="3.2" fill="#ea5f52" opacity=".35" />
          <g className="pin">
            <path d="M0 0 C -5 -9, -13 -14, -13 -23 A 13 13 0 1 1 13 -23 C 13 -14, 5 -9, 0 0 Z" fill="#ea5f52" stroke="#fff" strokeOpacity=".85" strokeWidth="1.4" />
            <circle cx="0" cy="-23" r="5" fill="#fff" />
          </g>
        </g>
        <g key={burst} ref={plane} className="plane-fly" style={motion}>
          <g className="plane-body"><g transform="translate(-20 -20) scale(1.67) rotate(45 12 12)"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" fill="currentColor" /></g></g>
        </g>
      </svg>
      <button type="button" className="pin-hit" style={{ left: dest.x - 24, top: dest.y - 52 }} onClick={toggle} disabled={phase === 'landing'}
        aria-label={phase === 'parked' ? 'Hacer despegar el avión' : 'Estacionar el avión junto al destino'} />
    </div>
  )
}

export default function OutingSpotlight() {
  const places = useTable<Place>('places', { col: 'created_at', asc: false })
  const trips = useTable<Trip>('trips', { col: 'created_at', asc: false })
  const today = localISO()
  const calm = useReducedMotion()
  const [idx, setIdx] = useState(0)
  const [burst, setBurst] = useState(0)
  const [phase, setPhase] = useState<'cruise' | 'landing' | 'parked'>('cruise')
  const [cheer, setCheer] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const card = useRef<HTMLElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const list = useMemo(() => outingCandidates(places.rows, trips.rows, today), [places.rows, trips.rows, today])
  useEffect(() => () => clearTimeout(timer.current), [])
  const isTravel = list.length > 0 && list[idx % list.length].kind === 'travel'
  useEffect(() => {
    const el = card.current
    if (!el || !isTravel) return
    const measure = () => setSize({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isTravel, idx, places.loading, trips.loading])
  if (places.loading || trips.loading || list.length === 0) return null

  const o = list[idx % list.length]
  const Icon = ICON[o.kind]
  const hue = HUE[o.kind]
  const play = () => { setPhase('cruise'); setBurst((b) => b + 1) }

  const visited = async () => {
    if (o.type !== 'place') return
    play()
    await places.update(o.id, { status: 'visited', visited_on: today })
    setCheer(`${o.kind === 'food' || o.kind === 'coffee' ? '¡Provecho!' : '¡Qué bueno!'} ${o.title} quedó como visitado.`)
    clearTimeout(timer.current); timer.current = setTimeout(() => setCheer(''), 4000)
  }

  return (
    <section ref={card} aria-labelledby="salida-hoy" className="outing" data-kind={o.kind} style={{ ['--hue' as string]: hue }}>
      <button type="button" className="outing-stage" onClick={play} aria-label={o.kind === 'travel' ? 'Hacer despegar el avión' : 'Animar'} >
        {o.kind === 'travel' ? <span className="outing-sky" aria-hidden /> : (
          <span key={burst} className={`outing-icon ${burst ? 'hop' : ''}`}><Icon size={44} strokeWidth={1.6} aria-hidden /></span>
        )}
      </button>
      {o.kind === 'travel' && <FlightLayer w={size.w} h={size.h} burst={burst} still={Boolean(calm)} phase={phase} onPhase={setPhase} />}
      <div className="outing-body">
        <p className="eyebrow">{o.type === 'trip' ? 'Tu próximo viaje' : o.kind === 'travel' ? 'Un destino por conocer' : o.kind === 'food' ? 'Antojo pendiente' : 'Por visitar'}</p>
        <h2 id="salida-hoy" className="mt-0.5 truncate text-lg font-semibold tracking-tight">{o.title}</h2>
        <p className="text-sm" style={{ color: o.urgent ? 'var(--accent)' : 'var(--ink-soft)' }}>
          {o.type === 'trip' ? o.when : <>{o.when}{o.place.address ? ` · ${o.place.address}` : ''}</>}
        </p>
        <p className="mt-1 text-sm" role="status" style={{ color: 'var(--pos)' }}>{cheer || (o.kind === 'travel' && phase === 'parked' ? 'Aterrizó. Toca el pin para que despegue.' : '')}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {o.type === 'place' && <button className="btn btn-tint !min-h-10" onClick={visited}><PartyPopper size={15} aria-hidden /> Ya fui</button>}
          {o.type === 'place' && <a className="btn btn-ghost !min-h-10" href={o.place.url ?? mapsSearchUrl(`${o.title} ${o.place.address ?? ''}`)} target="_blank" rel="noreferrer"><Navigation size={15} aria-hidden /> Cómo llegar</a>}
          {o.type === 'trip' && <Link to="/app/lugares" className="btn btn-tint !min-h-10">Ver el viaje</Link>}
          {list.length > 1 && <button className="btn btn-ghost !min-h-10" onClick={() => { setCheer(''); setIdx((i) => i + 1); play() }} aria-label="Ver otra idea"><Shuffle size={15} aria-hidden /> Otra idea</button>}
        </div>
      </div>
    </section>
  )
}
