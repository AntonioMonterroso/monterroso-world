import { Check, ChevronDown, ExternalLink, Loader2, MapPin, Plus, Repeat as RepeatIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { eventKinds, mapsUrl, reminderMeta, useEvents, type Occurrence } from '../../lib/events'
import { isoFromNum, dayNum } from '../../lib/recur'
import { fmtMin, localISO } from '../../lib/time'
import EventEditor, { type EditorTarget } from './EventEditor'
import { Group, PageHeader, Segmented } from '../../components/ui'
import { Empty } from '../money/shared'

const metaOf = (o: Occurrence) => (o.event.type === 'reminder' ? reminderMeta : eventKinds[o.event.kind])

function dayLabel(iso: string) {
  const today = localISO()
  if (iso === today) return 'Hoy'
  if (dayNum(iso) - dayNum(today) === 1) return 'Mañana'
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function OccurrenceCard({ o, onEdit, onToggleDone, onToggleCheck }: { o: Occurrence; onEdit: () => void; onToggleDone: () => void; onToggleCheck: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const M = metaOf(o)
  const e = o.event
  const total = e.checklist.length
  const got = e.checklist.filter((c) => o.state.checked.includes(c.id)).length
  const hasMore = total > 0 || e.location || e.contact || e.link || e.notes
  return (
    <li className="row" style={{ opacity: o.state.done ? 0.55 : 1, transition: 'opacity 200ms var(--ease-out)' }}>
      <div className="flex items-center">
        <button onClick={onToggleDone} aria-pressed={o.state.done} aria-label={o.state.done ? 'Marcar como pendiente' : 'Marcar como hecho'} className="grid size-14 shrink-0 place-items-center">
          <span className="chk" data-on={o.state.done} style={{ ['--chk' as string]: M.color }}><Check size={13} strokeWidth={3} aria-hidden /></span>
        </button>
        <button onClick={() => (hasMore ? setOpen((v) => !v) : onEdit())} className="row-hit !pl-0" aria-expanded={hasMore ? open : undefined}>
          <span className="row-main">
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: M.color }}>
              <M.icon size={12} aria-hidden /> {fmtMin(e.start_min)}{e.end_min ? ` – ${fmtMin(e.end_min % 1440)}` : ''}
              {e.repeat !== 'none' && <RepeatIcon size={11} aria-label="Se repite" />}
              {total > 0 && <span style={{ color: 'var(--ink-faint)', fontWeight: 500 }}>· {got}/{total}</span>}
            </span>
            <span className="row-title" style={{ textDecoration: o.state.done ? 'line-through' : 'none' }}>{e.title}</span>
            {e.action && <span className="row-sub">{e.action}</span>}
          </span>
          <ChevronDown size={16} aria-hidden className="row-chev" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 240ms var(--ease-out)' }} />
        </button>
      </div>
      <div className="expand" data-open={open}>
        <div>
          <div className="grid gap-1 px-4 pb-3 pl-14 text-sm">
            {total > 0 && e.checklist.map((c) => {
              const on = o.state.checked.includes(c.id)
              return (
                <label key={c.id} className="flex min-h-11 items-center gap-3">
                  <input type="checkbox" checked={on} onChange={() => onToggleCheck(c.id)} className="size-5" />
                  <span style={{ textDecoration: on ? 'line-through' : 'none', color: on ? 'var(--ink-faint)' : 'var(--ink)' }}>{c.text}</span>
                </label>
              )
            })}
            {e.location && <a href={mapsUrl(e.location)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 underline" style={{ color: 'var(--sky)' }}><MapPin size={14} aria-hidden /> {e.location}</a>}
            {e.contact && <p style={{ color: 'var(--ink-soft)' }}>Contacto: {e.contact}</p>}
            {e.link && <a href={e.link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 underline" style={{ color: 'var(--sky)' }}><ExternalLink size={14} aria-hidden /> Abrir enlace</a>}
            {e.notes && <p style={{ color: 'var(--ink-soft)' }}>{e.notes}</p>}
            <button onClick={onEdit} className="btn btn-tint mt-1 w-fit">Editar</button>
          </div>
        </div>
      </div>
    </li>
  )
}

export default function Agenda() {
  const ev = useEvents()
  const [filter, setFilter] = useState<'all' | 'event' | 'reminder'>('all')
  const [target, setTarget] = useState<EditorTarget | null>(null)
  const [sp, setSp] = useSearchParams()

  // Viene del buscador: abre ese evento
  useEffect(() => {
    const id = sp.get('e')
    if (!id || ev.loading) return
    const found = ev.events.find((x) => x.id === id)
    if (found) setTarget({ event: found, date: found.start_date })
    setSp({}, { replace: true })
  }, [sp, ev.loading, ev.events, setSp])

  const today = localISO()
  const list = useMemo(() => {
    const to = isoFromNum(dayNum(today) + 30)
    return ev.between(today, to).filter((o) => filter === 'all' || o.event.type === filter)
  }, [ev, today, filter])

  const groups = useMemo(() => {
    const m = new Map<string, Occurrence[]>()
    for (const o of list) m.set(o.date, [...(m.get(o.date) ?? []), o])
    return [...m.entries()]
  }, [list])

  return (
    <div>
      <PageHeader eyebrow="Planear" title="Agenda" sub="Lo que viene en los próximos 30 días." action={<button className="btn btn-primary" onClick={() => setTarget({ type: 'event' })}><Plus size={18} aria-hidden /> Nuevo</button>} />
      <Segmented label="Filtro" value={filter} onChange={setFilter} options={[{ id: 'all', label: 'Todo' }, { id: 'event', label: 'Eventos' }, { id: 'reminder', label: 'Recordatorios' }]} />

      {ev.error && <p role="alert" className="mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, #e8a393 15%, transparent)', color: '#e8a393' }}>{ev.error} <button className="underline" onClick={ev.clearError}>Cerrar</button></p>}

      {ev.loading ? (
        <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>
      ) : groups.length === 0 ? (
        <Empty title="Nada en los próximos 30 días" text="Agrega la iglesia, tus ensayos o una cita. Si se repite, dime cada cuánto y yo la pongo sola." action="Crear el primero" onAction={() => setTarget({ type: 'event' })} />
      ) : (
        groups.map(([date, items]) => (
          <Group key={date} title={<span className="first-letter:uppercase" style={date === today ? { color: 'var(--accent)' } : undefined}>{dayLabel(date)}</span>}>
            {items.map((o) => (
              <OccurrenceCard key={o.event.id + o.date} o={o}
                onEdit={() => setTarget({ event: o.event, date: o.date })}
                onToggleDone={() => ev.setState(o.event.id, o.date, { done: !o.state.done })}
                onToggleCheck={(id) => ev.setState(o.event.id, o.date, { checked: o.state.checked.includes(id) ? o.state.checked.filter((x) => x !== id) : [...o.state.checked, id] })} />
            ))}
          </Group>
        ))
      )}

      <EventEditor target={target} onClose={() => setTarget(null)}
        onSave={async (id, v) => { if (id) await ev.update(id, v); else await ev.add(v); setTarget(null) }}
        onDelete={(id) => { ev.remove(id); setTarget(null) }}
        onSkip={(e, d) => { ev.skip(e, d); setTarget(null) }} />
    </div>
  )
}
