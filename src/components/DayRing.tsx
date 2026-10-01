import { useEffect, useState } from 'react'
import Avatar, { propForHour } from './Avatar'

const R = 118
const C = 2 * Math.PI * R

// fracción del día (0–1) para un arco horario
const seg = (from: number, to: number) => ({ dash: ((to - from) / 24) * C, offset: C - (from / 24) * C })

const blocks = [
  { from: 8, to: 17, color: '#d9c7a0', label: 'Código' },
  { from: 19, to: 21, color: '#8fb3d9', label: 'Ensayo' },
]

export default function DayRing() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])
  const h = now.getHours() + now.getMinutes() / 60
  const angle = (h / 24) * 360
  const active = blocks.find((b) => h >= b.from && h < b.to)

  return (
    <figure className="relative mx-auto w-full max-w-[320px]" aria-label="Reloj del día con bloques de código y ensayo">
      <svg viewBox="0 0 280 280" className="w-full">
        <g transform="rotate(-90 140 140)">
          <circle cx="140" cy="140" r={R} fill="none" stroke="#17305a" strokeWidth="10" />
          {blocks.map((b) => {
            const s = seg(b.from, b.to)
            return (
              <circle
                key={b.label}
                cx="140"
                cy="140"
                r={R}
                fill="none"
                stroke={b.color}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${s.dash} ${C - s.dash}`}
                strokeDashoffset={s.offset}
              />
            )
          })}
        </g>
        <g transform={`rotate(${angle} 140 140)`}>
          <circle cx="140" cy="22" r="7" fill="#f1ebdd" /><circle cx="140" cy="22" r="7" fill="none" stroke="#f1ebdd" strokeWidth="2" className="ping" />
        </g>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <Avatar prop={propForHour(now.getHours())} size={190} />
      </div>
      <figcaption className="mt-2 text-center text-sm" style={{ color: 'var(--ink-soft)' }}>
        {active ? `Ahora: ${active.label}` : 'Ahora: descanso'}
      </figcaption>
    </figure>
  )
}
