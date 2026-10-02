import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { eventKinds, reminderMeta, useEvents, type Occurrence } from '../../lib/events'
import { weekStart } from '../../lib/habits'
import { currentMonth, monthLabel } from '../../lib/projects'
import { Group, MonthStepper, PageHeader, Row } from '../../components/ui'
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


  const pick = (m: string) => { setMonth(m); if (!sel.startsWith(m)) setSel(m === currentMonth() ? today : `${m}-01`) }

  return (
    <div>
      <PageHeader eyebrow="Planear" title="Calendario" />
      <MonthStepper month={month} onChange={pick} />
      {ev.error && <p role="alert" className="mb-3 rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, var(--neg) 15%, transparent)', color: 'var(--neg)' }}>{ev.error}</p>}

      {ev.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : (
        <div role="grid" aria-label={`Calendario de ${monthLabel(month)}`} className="cal">
          <div className="cal-head" role="row">{DAYS.map((d) => <span key={d.n} role="columnheader" aria-label={d.long}>{d.short}</span>)}</div>
          <div className="cal-grid">
            {cells.map((iso) => {
              const items = byDay.get(iso) ?? []
              const inMonth = iso.startsWith(month)
              return (
                <button key={iso} role="gridcell" aria-selected={iso === sel} aria-label={`${Number(iso.slice(8))}${items.length ? `, ${items.length} ${items.length === 1 ? 'evento' : 'eventos'}` : ''}${iso === today ? ', hoy' : ''}`} onClick={() => setSel(iso)} className="cal-day" data-out={!inMonth} data-today={iso === today} data-on={iso === sel}>
                  <span className="cal-num">{Number(iso.slice(8))}</span>
                  <span className="cal-dots" aria-hidden>
                    {items.slice(0, 3).map((o, i) => <i key={i} style={{ background: colorOf(o) }} />)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <Group title={<span className="first-letter:uppercase">{selLabel}</span>} aside={<Link to={`/app/planear?fecha=${sel}`} className="underline">Ver horario</Link>}>
        {selItems.length === 0 ? <li className="row"><p className="row-hit text-sm" style={{ color: 'var(--ink-faint)' }}>Sin eventos ni recordatorios este día.</p></li> : selItems.map((o) => (
          <Row key={o.event.id + o.date} tone={colorOf(o)} title={o.event.title} muted={o.state.done} sub={o.event.action ?? undefined} value={fmtMin(o.event.start_min)} valueTone="soft" />
        ))}
      </Group>
    </div>
  )
}
