import { Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../../components/ui'
import { blockApplies, kindMeta, useBlocks } from '../../lib/data'
import { eventKinds, reminderMeta, useEvents } from '../../lib/events'
import { fmtMin, localISO, nowMin } from '../../lib/time'

const PX = 60 // píxeles por hora

/** Día: una línea de tiempo de hoy. Los bloques son franjas con el color de su tipo y los eventos van encima, con una raya de «ahora». */
export default function AgendaDia() {
  const { blocks, loading } = useBlocks()
  const ev = useEvents()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t) }, [])
  const today = localISO(now)
  const m = nowMin(now)

  const bl = useMemo(() => blocks.filter((b) => blockApplies(b, today)), [blocks, today])
  const occ = useMemo(() => ev.between(today, today), [ev, today])
  const from = Math.max(0, Math.floor((Math.min(m - 60, ...bl.map((b) => b.start_min), ...occ.map((o) => o.event.start_min), 8 * 60)) / 60)) * 60
  const to = Math.min(24 * 60, Math.ceil((Math.max(m + 60, ...bl.map((b) => b.end_min), ...occ.map((o) => (o.event as { end_min?: number | null }).end_min ?? o.event.start_min + 45), 20 * 60)) / 60) * 60)
  const hours = Array.from({ length: (to - from) / 60 + 1 }, (_, i) => from + i * 60)
  const y = (min: number) => ((min - from) / 60) * PX

  return (
    <div>
      <PageHeader eyebrow="Agenda" title="Hoy" sub={now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })} />
      {loading || ev.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : (
        <div className="relative ml-12" style={{ height: (to - from) / 60 * PX }} role="list" aria-label="Línea de tiempo de hoy">
          {hours.map((h) => (
            <div key={h} className="absolute right-0 left-0 border-t" style={{ top: y(h), borderColor: 'var(--borde)' }} aria-hidden>
              <span className="absolute -top-3 -left-12 w-10 text-right text-xs" style={{ color: 'var(--ink-faint)' }}>{fmtMin(h)}</span>
            </div>
          ))}
          {bl.map((b) => (
            <div key={b.id} role="listitem" className="absolute left-0 w-[38%] overflow-hidden rounded-xl px-3 py-1.5 text-sm" style={{ top: y(b.start_min), height: Math.max(28, y(b.end_min) - y(b.start_min) - 2), background: `color-mix(in oklab, ${kindMeta[b.kind].color} 22%, var(--superficie))`, boxShadow: `inset 3px 0 0 ${kindMeta[b.kind].color}` }}>
              <p className="truncate font-semibold">{b.title}</p><p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{fmtMin(b.start_min)} – {fmtMin(b.end_min)}</p>
            </div>
          ))}
          {occ.map((o) => {
            const end = (o.event as { end_min?: number | null }).end_min ?? o.event.start_min + 45
            const c = o.event.type === 'reminder' ? reminderMeta.color : eventKinds[o.event.kind].color
            return (
              <div key={o.event.id + o.date} role="listitem" className="absolute right-0 w-[58%] overflow-hidden rounded-xl px-3 py-1.5 text-sm" style={{ top: y(o.event.start_min), height: Math.max(32, y(end) - y(o.event.start_min) - 2), background: 'var(--superficie-2)', boxShadow: `inset 3px 0 0 ${c}`, opacity: o.state.done ? 0.55 : 1 }}>
                <p className={`truncate font-semibold ${o.state.done ? 'line-through' : ''}`}>{o.event.title}</p><p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{fmtMin(o.event.start_min)}{o.event.location ? ` · ${o.event.location}` : ''}</p>
              </div>
            )
          })}
          {m >= from && m <= to && (
            <div className="pointer-events-none absolute right-0 left-0 z-10 flex items-center" style={{ top: y(m) }} aria-label={`Ahora, ${fmtMin(m)}`}>
              <span className="-ml-1.5 size-3 rounded-full" style={{ background: 'var(--marca)' }} /><span className="h-0.5 flex-1" style={{ background: 'var(--marca)' }} />
            </div>
          )}
          {bl.length === 0 && occ.length === 0 && <p className="absolute top-6 left-0 text-sm" style={{ color: 'var(--ink-soft)' }}>Nada programado hoy. Crea un bloque en Semana o un evento con ＋ Anotar.</p>}
        </div>
      )}
    </div>
  )
}
