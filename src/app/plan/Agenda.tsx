import { Check, ChevronDown, ExternalLink, Loader2, MapPin, Plus, Repeat as RepeatIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { eventKinds, mapsUrl, reminderMeta, useEvents, type Occurrence } from '../../lib/events'
import { isoFromNum, dayNum } from '../../lib/recur'
import { fmtMin, localISO } from '../../lib/time'
import EventEditor, { type EditorTarget } from './EventEditor'

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
  return (
    <li className="rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)', opacity: o.state.done ? 0.6 : 1 }}>
      <div className="flex items-center gap-3 px-3 py-2">
        <button onClick={onToggleDone} aria-pressed={o.state.done} aria-label={o.state.done ? 'Marcar como pendiente' : 'Marcar como hecho'} className="grid size-11 shrink-0 place-items-center rounded-full">
          <span className="grid size-6 place-items-center rounded-full border" style={{ borderColor: M.color, background: o.state.done ? M.color : 'transparent', color: 'var(--bg)' }}>{o.state.done && <Check size={14} aria-hidden />}</span>
        </button>
        <button onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 py-1 text-left" aria-expanded={open}>
          <span className="flex items-center gap-2 text-xs" style={{ color: M.color }}>
            <M.icon size={13} aria-hidden /> {fmtMin(e.start_min)}{e.end_min ? ` – ${fmtMin(e.end_min % 1440)}` : ''}
            {e.repeat !== 'none' && <RepeatIcon size={12} aria-label="Se repite" />}
            {total > 0 && <span style={{ color: 'var(--ink-faint)' }}>· {got}/{total}</span>}
          </span>
          <span className="block truncate font-semibold" style={{ textDecoration: o.state.done ? 'line-through' : 'none' }}>{e.title}</span>
          {e.action && <span className="block truncate text-sm" style={{ color: 'var(--ink-soft)' }}>{e.action}</span>}
        </button>
        <ChevronDown size={18} aria-hidden style={{ color: 'var(--ink-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms var(--ease-out)' }} />
      </div>
      {open && (
        <div className="grid gap-3 border-t px-4 py-3 text-sm" style={{ borderColor: 'var(--line-soft)' }}>
          {total > 0 && (
            <ul className="grid gap-1">
              {e.checklist.map((c) => {
                const on = o.state.checked.includes(c.id)
                return (
                  <li key={c.id}>
                    <label className="flex min-h-11 items-center gap-3">
                      <input type="checkbox" checked={on} onChange={() => onToggleCheck(c.id)} className="size-5" />
                      <span style={{ textDecoration: on ? 'line-through' : 'none', color: on ? 'var(--ink-faint)' : 'var(--ink)' }}>{c.text}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
          {e.location && <a href={mapsUrl(e.location)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 underline" style={{ color: 'var(--sky)' }}><MapPin size={14} aria-hidden /> {e.location}</a>}
          {e.contact && <p style={{ color: 'var(--ink-soft)' }}>Contacto: {e.contact}</p>}
          {e.link && <a href={e.link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 underline" style={{ color: 'var(--sky)' }}><ExternalLink size={14} aria-hidden /> Abrir enlace</a>}
          {e.notes && <p style={{ color: 'var(--ink-soft)' }}>{e.notes}</p>}
          <button onClick={onEdit} className="btn btn-ghost w-fit">Editar</button>
        </div>
      )}
    </li>
  )
}

export default function Agenda() {
  const ev = useEvents()
  const [filter, setFilter] = useState<'all' | 'event' | 'reminder'>('all')
  const [target, setTarget] = useState<EditorTarget | null>(null)

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
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Planear</p>
          <h1 className="mt-2 font-display text-4xl">Agenda</h1>
        </div>
        <button className="btn btn-primary" onClick={() => setTarget({ type: 'event' })}><Plus size={18} aria-hidden /> Nuevo</button>
      </div>

      <div role="group" aria-label="Filtro" className="mt-6 flex gap-2">
        {([['all', 'Todo'], ['event', 'Eventos'], ['reminder', 'Recordatorios']] as const).map(([v, l]) => (
          <button key={v} aria-pressed={filter === v} onClick={() => setFilter(v)} className="min-h-11 rounded-full border px-4 text-sm" style={{ borderColor: filter === v ? 'var(--accent)' : 'var(--line)', background: filter === v ? 'var(--accent)' : 'transparent', color: filter === v ? 'var(--bg)' : 'var(--ink-soft)' }}>{l}</button>
        ))}
      </div>

      {ev.error && <p role="alert" className="mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, #e8a393 15%, transparent)', color: '#e8a393' }}>{ev.error} <button className="underline" onClick={ev.clearError}>Cerrar</button></p>}

      {ev.loading ? (
        <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>
      ) : groups.length === 0 ? (
        <div className="mt-10 rounded-2xl border px-6 py-10 text-center" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
          <p className="font-display text-2xl">Nada en los próximos 30 días</p>
          <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: 'var(--ink-soft)' }}>Agrega la iglesia, tus ensayos o una cita. Si se repite, dime cada cuánto y yo la pongo sola.</p>
          <button className="btn btn-primary mt-5" onClick={() => setTarget({ type: 'event' })}>Crear el primero</button>
        </div>
      ) : (
        <div className="mt-6 grid gap-7">
          {groups.map(([date, items]) => (
            <section key={date} aria-label={dayLabel(date)}>
              <h2 className="mb-3 text-sm font-semibold first-letter:uppercase" style={{ color: date === today ? 'var(--accent)' : 'var(--ink-soft)' }}>{dayLabel(date)}</h2>
              <ul className="grid gap-2">
                {items.map((o) => (
                  <OccurrenceCard key={o.event.id + o.date} o={o}
                    onEdit={() => setTarget({ event: o.event, date: o.date })}
                    onToggleDone={() => ev.setState(o.event.id, o.date, { done: !o.state.done })}
                    onToggleCheck={(id) => ev.setState(o.event.id, o.date, { checked: o.state.checked.includes(id) ? o.state.checked.filter((x) => x !== id) : [...o.state.checked, id] })} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <EventEditor target={target} onClose={() => setTarget(null)}
        onSave={async (id, v) => { if (id) await ev.update(id, v); else await ev.add(v); setTarget(null) }}
        onDelete={(id) => { ev.remove(id); setTarget(null) }}
        onSkip={(e, d) => { ev.skip(e, d); setTarget(null) }} />
    </div>
  )
}
