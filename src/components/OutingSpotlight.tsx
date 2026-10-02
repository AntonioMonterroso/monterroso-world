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

/** El avión cruza la tarjeta entera, de la esquina de abajo a la de arriba, dejando una estela punteada. */
function FlightLayer({ w, h, burst, still }: { w: number; h: number; burst: number; still: boolean }) {
  if (w < 50 || h < 50) return null
  const x0 = 22, y0 = h - 26, x1 = w - 30, y1 = 34
  const d = `M${x0} ${y0} C ${w * 0.25} ${h * 0.05}, ${w * 0.65} ${h * -0.1}, ${x1} ${y1}`
  return (
    <svg className="flight" viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeOpacity=".3" strokeWidth="1.6" strokeDasharray="2 8" strokeLinecap="round" />
      <circle cx={x0} cy={y0} r="4" fill="currentColor" opacity=".5" />
      <circle cx={x1} cy={y1} r="6" fill="none" stroke="currentColor" strokeWidth="1.6" opacity=".75" className="flight-dest" />
      <g key={burst} className="plane-fly" style={{ offsetPath: `path("${d}")`, ...(still ? { offsetDistance: '60%', animation: 'none', opacity: 1 } : null) }}>
        <g transform="translate(-14 -14) scale(1.17) rotate(45 12 12)"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" fill="currentColor" /></g>
      </g>
    </svg>
  )
}

export default function OutingSpotlight() {
  const places = useTable<Place>('places', { col: 'created_at', asc: false })
  const trips = useTable<Trip>('trips', { col: 'created_at', asc: false })
  const today = localISO()
  const calm = useReducedMotion()
  const [idx, setIdx] = useState(0)
  const [burst, setBurst] = useState(0)
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
  const play = () => { setBurst((b) => b + 1) }

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
      {o.kind === 'travel' && <FlightLayer w={size.w} h={size.h} burst={burst} still={Boolean(calm)} />}
      <div className="outing-body">
        <p className="eyebrow">{o.type === 'trip' ? 'Tu próximo viaje' : o.kind === 'travel' ? 'Un destino por conocer' : o.kind === 'food' ? 'Antojo pendiente' : 'Por visitar'}</p>
        <h2 id="salida-hoy" className="mt-0.5 truncate text-lg font-semibold tracking-tight">{o.title}</h2>
        <p className="text-sm" style={{ color: o.urgent ? 'var(--accent)' : 'var(--ink-soft)' }}>
          {o.type === 'trip' ? o.when : <>{o.when}{o.place.address ? ` · ${o.place.address}` : ''}</>}
        </p>
        <p className="mt-1 text-sm" role="status" style={{ color: 'var(--pos)' }}>{cheer}</p>
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
