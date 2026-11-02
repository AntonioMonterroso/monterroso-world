import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { eventKinds, reminderMeta, useEvents, type Occurrence } from '../../lib/events'
import { weekStart } from '../../lib/habits'
import { currentMonth, monthLabel } from '../../lib/projects'
import { Group, MonthStepper, PageHeader, Row } from '../../components/ui'
import { addPeriod, type Sub } from '../../lib/finance'
import { clientKey, clientName } from '../../lib/clients'
import { activeIn, money, useProjects } from '../../lib/projects'
import type { Promise_ } from '../../lib/loose'
import type { Plan } from '../../lib/savings'
import { useTable } from '../../lib/table'
import { dayNum, isoFromNum } from '../../lib/recur'
import { DAYS, fmtMin, localISO } from '../../lib/time'

const colorOf = (o: Occurrence) => (o.event.type === 'reminder' ? reminderMeta.color : eventKinds[o.event.kind].color)

/** Calendario mensual: ve de un vistazo varias semanas y salta al horario de cualquier día. */
export default function Calendar() {
  const ev = useEvents()
  const today = localISO()
  const [month, setMonth] = useState(currentMonth())
  const [sel, setSel] = useState(today)
  const [marksOn, setMarksOn] = useState(true)
  const work = useProjects()
  const subs = useTable<Sub>('subscriptions', { col: 'next_due', asc: true })
  const promises = useTable<Promise_>('promises', { col: 'created_at', asc: false })
  const plans = useTable<Plan>('savings_plans', { col: 'planned_for', asc: true })

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

  // Lo que tiene fecha en otras secciones: cobros, pagos fijos, promesas y retiros de ahorro planeados
  type Mark = { label: string; color: string; to: string; value?: string }
  const marks = useMemo(() => {
    const map = new Map<string, Mark[]>()
    const add = (iso: string, m: Mark) => map.set(iso, [...(map.get(iso) ?? []), m])
    const first = cells[0], last = cells[cells.length - 1]
    for (const iso of cells) {
      for (const p of work.projects) {
        if (p.status !== 'closed' && Number(p.monthly_fee ?? 0) > 0 && p.billing_day && Number(iso.slice(8)) === p.billing_day && activeIn(p, iso.slice(0, 7))) add(iso, { label: `Cobrar a ${clientName(p)}`, color: 'var(--web)', to: `/app/trabajo/cliente/${encodeURIComponent(clientKey(clientName(p)))}`, value: money(Number(p.monthly_fee)) })
      }
    }
    for (const s of subs.rows) {
      if (!s.active) continue
      let d = s.next_due
      for (let i = 0; i < 60 && d <= last; i++) { if (d >= first) add(d, { label: s.name, color: 'var(--aviso)', to: '/app/dinero/suscripciones', value: money(Number(s.amount)) }); d = addPeriod(d, s.period) }
    }
    for (const p of promises.rows) if (!p.done && p.due_date && p.due_date >= first && p.due_date <= last) add(p.due_date, { label: p.person ? `Promesa a ${p.person}` : p.text, color: 'var(--personal)', to: '/app/mente/cosas' })
    for (const pl of plans.rows) if (pl.status === 'pending' && pl.planned_for >= first && pl.planned_for <= last) add(pl.planned_for, { label: 'Retiro de ahorro planeado', color: 'var(--aviso)', to: `/app/dinero/metas?plan=${pl.id}`, value: money(Number(pl.amount)) })
    return map
  }, [cells, work.projects, subs.rows, promises.rows, plans.rows])
  const selMarks = marksOn ? marks.get(sel) ?? [] : []
  const selItems = byDay.get(sel) ?? []
  const selLabel = (() => { const [y, m, d] = sel.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }) })()


  const pick = (m: string) => { setMonth(m); if (!sel.startsWith(m)) setSel(m === currentMonth() ? today : `${m}-01`) }

  return (
    <div>
      <PageHeader eyebrow="Agenda" title="Mes" action={<button type="button" className="chip-btn" aria-pressed={marksOn} onClick={() => setMarksOn((v) => !v)}>Cobros y pagos</button>} />
      <MonthStepper month={month} onChange={pick} />
      {ev.error && <p role="alert" className="mb-3 rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--aviso-suave)', color: 'var(--aviso-texto)' }}>{ev.error}</p>}

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
                    {marksOn && (marks.get(iso) ?? []).slice(0, 2).map((mk, i) => <i key={`m${i}`} style={{ background: mk.color, borderRadius: 2 }} />)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <Group title={<span className="first-letter:uppercase">{selLabel}</span>} aside={<Link to={`/app/planear?fecha=${sel}`} className="underline">Ver horario</Link>}>
        {selMarks.map((mk, i) => <Row key={`mk${i}`} to={mk.to} tone={mk.color} title={mk.label} value={mk.value} valueTone="soft" />)}
        {selItems.length === 0 && selMarks.length === 0 ? <li className="row"><p className="row-hit text-sm" style={{ color: 'var(--ink-faint)' }}>Sin eventos ni recordatorios este día.</p></li> : selItems.map((o) => (
          <Row key={o.event.id + o.date} tone={colorOf(o)} title={o.event.title} muted={o.state.done} sub={o.event.action ?? undefined} value={fmtMin(o.event.start_min)} valueTone="soft" />
        ))}
      </Group>
    </div>
  )
}
