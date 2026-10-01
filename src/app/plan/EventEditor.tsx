import { AnimatePresence, motion } from 'motion/react'
import { ExternalLink, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ALERT_OPTIONS, eventKinds, mapsUrl, type CheckItem, type EventKind, type EventRow, type NewEvent } from '../../lib/events'
import { DAYS, fmtMin, localISO, toMin } from '../../lib/time'
import type { Repeat } from '../../lib/recur'

export type EditorTarget = { event?: EventRow; date?: string; type?: 'event' | 'reminder' }

const ease = [0.23, 1, 0.32, 1] as const
const uid = () => crypto.randomUUID().slice(0, 8)

type Props = {
  target: EditorTarget | null
  onClose: () => void
  onSave: (id: string | null, v: NewEvent) => void
  onDelete: (id: string) => void
  onSkip: (ev: EventRow, date: string) => void
}

export default function EventEditor({ target, onClose, onSave, onDelete, onSkip }: Props) {
  const [type, setType] = useState<'event' | 'reminder'>('event')
  const [title, setTitle] = useState('')
  const [action, setAction] = useState('')
  const [kind, setKind] = useState<EventKind>('other')
  const [date, setDate] = useState(localISO())
  const [start, setStart] = useState('19:00')
  const [end, setEnd] = useState('')
  const [repeat, setRepeat] = useState<Repeat>('none')
  const [interval, setIntervalN] = useState(1)
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [until, setUntil] = useState('')
  const [alerts, setAlerts] = useState<number[]>([10])
  const [persistent, setPersistent] = useState(false)
  const [location, setLocation] = useState('')
  const [contact, setContact] = useState('')
  const [link, setLink] = useState('')
  const [notes, setNotes] = useState('')
  const [checklist, setChecklist] = useState<CheckItem[]>([])
  const [newItem, setNewItem] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!target) return
    const e = target.event
    setType(e?.type ?? target.type ?? 'event')
    setTitle(e?.title ?? ''); setAction(e?.action ?? ''); setKind(e?.kind ?? 'other')
    setDate(e?.start_date ?? target.date ?? localISO())
    setStart(e ? fmtMin(e.start_min) : '19:00'); setEnd(e?.end_min ? fmtMin(e.end_min % 1440) : '')
    setRepeat(e?.repeat ?? 'none'); setIntervalN(e?.interval_n ?? 1); setWeekdays(e?.weekdays ?? []); setUntil(e?.until ?? '')
    setAlerts(e?.alerts ?? [10]); setPersistent(e?.persistent ?? false)
    setLocation(e?.location ?? ''); setContact(e?.contact ?? ''); setLink(e?.link ?? ''); setNotes(e?.notes ?? '')
    setChecklist(e?.checklist ?? []); setNewItem(''); setConfirm(false); setErr('')
  }, [target])

  useEffect(() => {
    const h = (ev: KeyboardEvent) => { if (ev.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    const s = toMin(start)
    const e = end ? toMin(end) : null
    if (!title.trim()) return setErr('Ponle un nombre.')
    if (!date) return setErr('Elige una fecha.')
    if (e !== null && e <= s) return setErr('La hora de fin debe ser después del inicio.')
    if (until && until < date) return setErr('La fecha límite no puede ser anterior al inicio.')
    onSave(target?.event?.id ?? null, {
      type, title: title.trim(), action: action.trim() || null, kind, start_date: date, start_min: s, end_min: type === 'reminder' ? null : e,
      repeat, interval_n: Math.max(1, interval), weekdays: repeat === 'weekly' ? weekdays : [], until: repeat === 'none' ? null : until || null,
      exceptions: target?.event?.exceptions ?? [], location: location.trim() || null, contact: contact.trim() || null, link: link.trim() || null,
      notes: notes.trim() || null, alerts: [...alerts].sort((a, b) => b - a), persistent, checklist,
    })
  }

  const addItem = () => {
    const t = newItem.trim()
    if (!t) return
    setChecklist([...checklist, { id: uid(), text: t }]); setNewItem('')
  }
  const ev = target?.event

  return (
    <AnimatePresence>
      {target && (
        <motion.div className="fixed inset-0 z-40 grid items-end justify-items-center md:items-center" style={{ background: 'rgba(5,10,24,.6)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onMouseDown={onClose}>
          <motion.form role="dialog" aria-modal="true" aria-label="Evento o recordatorio" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}
            className="max-h-[94dvh] w-full max-w-lg overflow-auto rounded-t-3xl border p-5 md:rounded-3xl"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
            initial={{ transform: 'translateY(40px)', opacity: 0 }} animate={{ transform: 'translateY(0px)', opacity: 1 }} exit={{ transform: 'translateY(40px)', opacity: 0 }} transition={{ duration: 0.28, ease }}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">{ev ? 'Editar' : 'Nuevo'}</h2>
              <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full" aria-label="Cerrar"><X size={20} aria-hidden /></button>
            </div>

            <div className="mt-3 inline-flex rounded-full p-1" style={{ background: 'var(--bg)' }} role="group" aria-label="Tipo">
              {(['event', 'reminder'] as const).map((t) => (
                <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)} className="min-h-11 rounded-full px-4 text-sm font-semibold" style={{ background: type === t ? 'var(--accent)' : 'transparent', color: type === t ? 'var(--bg)' : 'var(--ink-soft)' }}>
                  {t === 'event' ? 'Evento' : 'Recordatorio'}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm">Nombre<input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder={type === 'event' ? 'Iglesia, ensayo, cita…' : 'Llamar al cliente'} /></label>
              <label className="grid gap-2 text-sm">¿Qué debo hacer?<input className="field" value={action} onChange={(e) => setAction(e.target.value)} maxLength={500} placeholder="Afinar la guitarra y llevar cables" /></label>

              {type === 'event' && (
                <fieldset>
                  <legend className="mb-2 text-sm">Categoría</legend>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(eventKinds) as EventKind[]).map((k) => {
                      const M = eventKinds[k]; const on = kind === k
                      return (
                        <button key={k} type="button" aria-pressed={on} onClick={() => setKind(k)} className="inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm"
                          style={{ borderColor: on ? M.color : 'var(--line)', color: on ? M.color : 'var(--ink-soft)', background: on ? `color-mix(in oklab, ${M.color} 14%, transparent)` : 'transparent' }}>
                          <M.icon size={16} aria-hidden /> {M.label}
                        </button>
                      )
                    })}
                  </div>
                </fieldset>
              )}

              <div className="grid grid-cols-2 gap-3">
                <label className="col-span-2 grid gap-2 text-sm">Fecha{repeat !== 'none' ? ' de inicio' : ''}<input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} /></label>
                <label className="grid gap-2 text-sm">{type === 'event' ? 'Inicio' : 'Hora'}<input type="time" step={300} className="field" value={start} onChange={(e) => setStart(e.target.value)} /></label>
                {type === 'event' && <label className="grid gap-2 text-sm">Fin (opcional)<input type="time" step={300} className="field" value={end} onChange={(e) => setEnd(e.target.value)} /></label>}
              </div>

              <fieldset>
                <legend className="mb-2 text-sm">Se repite</legend>
                <div className="flex flex-wrap gap-2">
                  {([['none', 'No'], ['daily', 'Diario'], ['weekly', 'Semanal'], ['monthly', 'Mensual']] as const).map(([v, l]) => (
                    <button key={v} type="button" aria-pressed={repeat === v} onClick={() => setRepeat(v)} className="min-h-11 rounded-full border px-4 text-sm" style={{ borderColor: repeat === v ? 'var(--accent)' : 'var(--line)', background: repeat === v ? 'var(--accent)' : 'transparent', color: repeat === v ? 'var(--bg)' : 'var(--ink-soft)' }}>{l}</button>
                  ))}
                </div>
                {repeat !== 'none' && (
                  <div className="mt-3 grid gap-3">
                    <label className="flex items-center gap-3 text-sm">Cada
                      <input type="number" min={1} max={52} className="field !w-20" value={interval} onChange={(e) => setIntervalN(Number(e.target.value) || 1)} />
                      {repeat === 'daily' ? 'día(s)' : repeat === 'weekly' ? 'semana(s)' : 'mes(es)'}
                    </label>
                    {repeat === 'weekly' && (
                      <div className="flex gap-2" role="group" aria-label="Días">
                        {DAYS.map((d) => {
                          const on = weekdays.includes(d.n)
                          return <button key={d.n} type="button" aria-pressed={on} aria-label={d.long} onClick={() => setWeekdays(on ? weekdays.filter((x) => x !== d.n) : [...weekdays, d.n])} className="grid size-11 place-items-center rounded-full border text-sm font-semibold" style={{ borderColor: on ? 'var(--accent)' : 'var(--line)', background: on ? 'var(--accent)' : 'transparent', color: on ? 'var(--bg)' : 'var(--ink-soft)' }}>{d.short}</button>
                        })}
                      </div>
                    )}
                    <label className="grid gap-2 text-sm">Hasta (opcional)<input type="date" className="field" value={until} onChange={(e) => setUntil(e.target.value)} /></label>
                  </div>
                )}
              </fieldset>

              <fieldset>
                <legend className="mb-2 text-sm">Avisarme antes</legend>
                <div className="flex flex-wrap gap-2">
                  {ALERT_OPTIONS.map((a) => {
                    const on = alerts.includes(a.min)
                    return <button key={a.min} type="button" aria-pressed={on} onClick={() => setAlerts(on ? alerts.filter((x) => x !== a.min) : [...alerts, a.min])} className="min-h-11 rounded-full border px-3 text-sm" style={{ borderColor: on ? 'var(--sky)' : 'var(--line)', color: on ? 'var(--sky)' : 'var(--ink-soft)', background: on ? 'color-mix(in oklab, var(--sky) 14%, transparent)' : 'transparent' }}>{a.label}</button>
                  })}
                </div>
                <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
                  <input type="checkbox" checked={persistent} onChange={(e) => setPersistent(e.target.checked)} className="size-5" /> Insistir hasta que lo confirme
                </label>
              </fieldset>

              <div className="grid gap-4">
                <label className="grid gap-2 text-sm">Dirección o lugar<input className="field" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={300} placeholder="Calle, colonia o enlace de Mapas" /></label>
                {location.trim() && <a href={mapsUrl(location.trim())} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm underline" style={{ color: 'var(--sky)' }}><ExternalLink size={14} aria-hidden /> Abrir en Mapas</a>}
                <label className="grid gap-2 text-sm">Contacto<input className="field" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={200} placeholder="Nombre o teléfono" /></label>
                <label className="grid gap-2 text-sm">Enlace<input className="field" value={link} onChange={(e) => setLink(e.target.value)} maxLength={500} inputMode="url" placeholder="https://" /></label>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm">Cosas por llevar (opcional)</legend>
                <ul className="grid gap-2">
                  {checklist.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 rounded-xl px-3" style={{ background: 'var(--bg)' }}>
                      <span className="flex-1 py-3 text-sm">{c.text}</span>
                      <button type="button" className="grid size-11 place-items-center" aria-label={`Quitar ${c.text}`} onClick={() => setChecklist(checklist.filter((x) => x.id !== c.id))}><X size={16} aria-hidden /></button>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex gap-2">
                  <input className="field" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }} maxLength={120} placeholder="Cables, cargador, Biblia…" aria-label="Nueva cosa por llevar" />
                  <button type="button" className="btn btn-ghost shrink-0" onClick={addItem} aria-label="Agregar"><Plus size={18} aria-hidden /></button>
                </div>
              </fieldset>

              <label className="grid gap-2 text-sm">Notas<textarea className="field py-3" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} /></label>
            </div>

            {err && <p role="alert" className="mt-3 text-sm" style={{ color: '#e8a393' }}>{err}</p>}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              {ev && ev.repeat !== 'none' && target?.date && <button type="button" className="btn btn-ghost" onClick={() => onSkip(ev, target.date!)}>Omitir esta fecha</button>}
              {ev && <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? '#e8a393' : undefined }} onClick={() => (confirm ? onDelete(ev.id) : setConfirm(true))}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro?' : ev.repeat !== 'none' ? 'Eliminar serie' : 'Eliminar'}</button>}
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
