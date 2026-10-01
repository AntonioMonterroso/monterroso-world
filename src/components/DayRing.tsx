import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import Avatar, { propForHour, props, type Prop } from './Avatar'

const R = 118
const C = 2 * Math.PI * R
const seg = (from: number, to: number) => ({ dash: ((to - from) / 24) * C, offset: C - (from / 24) * C })

const blocks = [
  { from: 8, to: 17, color: 'var(--brass)', label: 'Código' },
  { from: 19, to: 21, color: 'var(--sky)', label: 'Ensayo' },
]

const labels: Record<Prop, string> = {
  laptop: 'Programando', guitar: 'Tocando guitarra', drums: 'En la batería', piano: 'Al piano', wave: 'Saludando', rest: 'Descansando',
}

export default function DayRing() {
  const [now, setNow] = useState(() => new Date())
  const [override, setOverride] = useState<Prop | null>(null)
  const [hop, setHop] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const h = now.getHours() + now.getMinutes() / 60
  const angle = (h / 24) * 360
  const active = blocks.find((b) => h >= b.from && h < b.to)
  const current = override ?? propForHour(now.getHours())

  const cycle = () => {
    const next = props[(props.indexOf(current) + 1) % props.length]
    setOverride(next)
    setHop((n) => n + 1)
  }

  return (
    <figure className="relative mx-auto w-full max-w-[340px]">
      <svg viewBox="0 0 280 280" className="w-full" aria-label="Reloj de 24 horas con bloques de código y ensayo" role="img">
        <g transform="rotate(-90 140 140)">
          <circle cx="140" cy="140" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="10" />
          {blocks.map((b, i) => {
            const s = seg(b.from, b.to)
            return (
              <motion.circle
                key={b.label}
                cx="140" cy="140" r={R} fill="none" stroke={b.color} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${s.dash} ${C - s.dash}`}
                initial={{ strokeDashoffset: s.offset + s.dash, opacity: 0 }}
                animate={{ strokeDashoffset: s.offset, opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.3 + i * 0.25, ease: [0.23, 1, 0.32, 1] }}
              />
            )
          })}
        </g>
        {[0, 6, 12, 18].map((hh) => (
          <text key={hh} x={140 + 98 * Math.sin((hh / 24) * 2 * Math.PI)} y={144 - 98 * Math.cos((hh / 24) * 2 * Math.PI)} textAnchor="middle" fontSize="9" fill="var(--ink-faint)">
            {hh}h
          </text>
        ))}
        <g transform={`rotate(${angle} 140 140)`}>
          <circle cx="140" cy="22" r="7" fill="var(--ink)" />
          <circle cx="140" cy="22" r="7" fill="none" stroke="var(--ink)" strokeWidth="2" className="ping" />
        </g>
      </svg>

      <button onClick={cycle} className="absolute inset-0 m-auto grid h-[62%] w-[62%] cursor-pointer place-items-center rounded-full" aria-label={`Avatar: ${labels[current]}. Toca para cambiar de actividad`}>
        <AnimatePresence mode="wait">
          <motion.div key={current + hop} initial={{ opacity: 0, transform: 'translateY(8px) scale(0.95)' }} animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }} exit={{ opacity: 0 }} transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}>
            <Avatar prop={current} size={200} hop={hop > 0} />
          </motion.div>
        </AnimatePresence>
      </button>

      <figcaption className="mt-3 text-center text-sm" style={{ color: 'var(--ink-soft)' }} aria-live="polite">
        {override ? labels[current] : active ? `Ahora: ${active.label}` : 'Ahora: descanso'}
        <span className="block text-xs" style={{ color: 'var(--ink-faint)' }}>Toca al avatar</span>
      </figcaption>
    </figure>
  )
}
