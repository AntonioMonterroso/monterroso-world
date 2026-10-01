import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { eventKinds, reminderMeta, useEvents, type Occurrence } from '../../lib/events'
import { weekStart } from '../../lib/habits'
import { currentMonth, monthLabel, shiftMonth } from '../../lib/projects'
import { dayNum, isoFromNum } from '../../lib/recur'
import { DAYS, fmtMin, localISO } from '../../lib/time'

const colorOf = (o: Occurrence) => (o.event.type === 'reminder' ? reminderMeta.color : eventKinds[o.event.kind].color)

/** Calendario mensual: ve de un vistazo varias semanas y salta al horario de cualquier día. */
export default function Calendar() {
  const ev = useEvents()
  const today = localISO()
  const [month, setMonth] = useState(currentMonth())
  const [sel, setSel] = useState(today)

  // Rejilla de semanas completas (lunes a domingo) que cubre el mes
  const cells = useMemo(() => {
    const first = `${month}-01`
    const start = dayNum(weekStart(first))
    const [y, m] = month.split('-').map(Number)
    const last = dayNum(`${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`)
    const weeks = Math.ceil((last - start + 1) / 7)
    return Array.from({ length: weeks * 7 }, (_, i) => isoFromNum(start + i))
  }, [month])

  const byDay = useMemo(() => {
    const map = new Map<string, Occurrence[]>()
    for (const o of ev.between(cells[0], cells[cells.length - 1])) map.set(o.date, [...(map.get(o.date) ?? []), o])
    return map
  }, [ev, cells])

  const selItems = byDay.get(sel) ?? []
  const selLabel = (() => { const [y, m, d] = sel.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }) })()

  const go = (n: number) => { const next = shiftMonth(month, n); setMonth(next); if (!sel.startsWith(next)) setSel(next === currentMonth() ? today : `${next}-01`) }

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div><p className="eyebrow">Planear</p><h1 className="mt-2 font-display text-4xl">Calendario</h1></div>
        {month !== currentMonth() && <button className="min-h-11 rounded-full border px-4 text-sm" style={{ borderColor: 'var(--line)' }} onClick={() => { setMonth(currentMonth()); setSel(today) }}>Hoy</button>}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => go(-1)} aria-label="Mes anterior"><ChevronLeft size={18} aria-hidden /></button>
        <h2 className="min-w-44 text-center font-display text-2xl first-letter:uppercase" aria-live="polite">{monthLabel(month)}</h2>
        <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => go(1)} aria-label="Mes siguiente"><ChevronRight size={18} aria-hidden /></button>
      </div>
      {ev.error && <p role="alert" className="mt-3 rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, #e8a393 15%, transparent)', color: '#e8a393' }}>{ev.error}</p>}

      {ev.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : (
        <div className="mt-4" role="grid" aria-label={`Calendario de ${monthLabel(month)}`}>
          <div className="grid grid-cols-7 gap-1 text-center text-xs" role="row" style={{ color: 'var(--ink-faint)' }}>{DAYS.map((d) => <span key={d.n} role="columnheader" aria-label={d.long} className="py-1">{d.short}</span>)}</div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((iso) => {
              const items = byDay.get(iso) ?? []
              const inMonth = iso.startsWith(month)
              const on = iso === sel
              const isToday = iso === today
              return (
                <button key={iso} role="gridcell" aria-selected={on} aria-label={`${Number(iso.slice(8))}${items.length ? `, ${items.length} ${items.length === 1 ? 'evento' : 'eventos'}` : ''}${isToday ? ', hoy' : ''}`} onClick={() => setSel(iso)}
                  className="relative grid min-h-14 place-items-center rounded-xl border py-1.5 text-sm"
                  style={{ borderColor: isToday ? 'var(--accent)' : on ? 'var(--line)' : 'var(--line-soft)', background: on ? 'var(--accent)' : 'var(--surface)', color: on ? 'var(--bg)' : inMonth ? 'var(--ink)' : 'var(--ink-faint)', opacity: inMonth ? 1 : 0.5 }}>
                  <span className="font-semibold">{Number(iso.slice(8))}</span>
                  <span className="flex h-2 items-center gap-0.5" aria-hidden>
                    {items.slice(0, 3).map((o, i) => <span key={i} className="size-1.5 rounded-full" style={{ background: on ? 'var(--bg)' : colorOf(o) }} />)}
                    {items.length > 3 && <span className="text-[9px] leading-none">+</span>}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <section className="mt-8" aria-labelledby="dia-sel">
        <div className="flex items-center justify-between gap-3">
          <h2 id="dia-sel" className="font-display text-2xl first-letter:uppercase">{selLabel}</h2>
          <Link to={`/app/planear?fecha=${sel}`} className="btn btn-ghost shrink-0">Ver horario</Link>
        </div>
        {selItems.length === 0 ? <p className="mt-3 text-sm" style={{ color: 'var(--ink-soft)' }}>Sin eventos ni recordatorios este día.</p> : (
          <ul className="mt-3 grid gap-2">
            {selItems.map((o) => (
              <li key={o.event.id + o.date} className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)', opacity: o.state.done ? 0.6 : 1 }}>
                <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(o) }} aria-hidden />
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold" style={{ textDecoration: o.state.done ? 'line-through' : 'none' }}>{o.event.title}</span>{o.event.action && <span className="block truncate text-sm" style={{ color: 'var(--ink-soft)' }}>{o.event.action}</span>}</span>
                <span className="shrink-0 text-sm" style={{ color: 'var(--ink-soft)' }}>{fmtMin(o.event.start_min)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
