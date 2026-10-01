import { Check, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar, { propForHour, type Prop } from '../components/Avatar'
import { kindMeta, useBlocks, useInbox, usePriorities } from '../lib/data'
import { fmtMin, nowMin } from '../lib/time'

const greet = (h: number) => (h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches')
const propFor = (kind: string | undefined, hour: number): Prop => {
  if (kind === 'code' || kind === 'work') return 'laptop'
  if (kind === 'rehearsal') return 'guitar'
  if (kind === 'rest') return 'rest'
  return kind ? 'wave' : propForHour(hour)
}
const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim() : `${m} min`)

export default function Today() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t) }, [])
  const m = nowMin(now)

  const { blocks } = useBlocks()
  const todays = useMemo(() => blocks.filter((b) => b.days.includes(now.getDay())), [blocks, now])
  const current = todays.find((b) => m >= b.start_min && m < b.end_min)
  const next = todays.find((b) => b.start_min > m)

  const pr = usePriorities()
  const inbox = useInbox()
  const [draft, setDraft] = useState('')
  const [cap, setCap] = useState('')
  const error = pr.error || inbox.error

  const addPriority = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || pr.tasks.length >= 3) return
    pr.add(draft.trim()); setDraft('')
  }
  const capture = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cap.trim()) return
    inbox.add(cap.trim()); setCap('')
  }

  return (
    <div className="grid gap-10">
      <section className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-2 font-display text-4xl">{greet(now.getHours())}</h1>
          <p className="mt-3 text-lg" style={{ color: 'var(--ink-soft)' }}>
            {current ? (
              <>Ahora: <strong style={{ color: kindMeta[current.kind].color }}>{current.title}</strong> · quedan {dur(current.end_min - m)}</>
            ) : next ? (
              <>Sigue: <strong style={{ color: 'var(--ink)' }}>{next.title}</strong> a las {fmtMin(next.start_min)}</>
            ) : (
              'No hay más bloques hoy. Es tu tiempo.'
            )}
          </p>
          <Link to="/app/planear" className="mt-3 inline-flex min-h-11 items-center text-sm underline" style={{ color: 'var(--ink-soft)' }}>Ver mi horario</Link>
        </div>
        <div className="w-28 shrink-0 sm:w-36"><Avatar prop={propFor(current?.kind, now.getHours())} size={150} /></div>
      </section>

      {error && <p role="alert" className="rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, #e8a393 15%, transparent)', color: '#e8a393' }}>{error}</p>}

      <section aria-labelledby="prio">
        <h2 id="prio" className="font-display text-2xl">Tres prioridades</h2>
        <ul className="mt-4 grid gap-2">
          {pr.tasks.map((t) => (
            <li key={t.id}>
              <button className="flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }} onClick={() => pr.toggle(t.id)} aria-pressed={t.done}>
                <span className="grid size-6 shrink-0 place-items-center rounded-full border" style={{ borderColor: 'var(--accent)', background: t.done ? 'var(--accent)' : 'transparent', color: 'var(--bg)' }}>{t.done && <Check size={14} aria-hidden />}</span>
                <span style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--ink-faint)' : 'var(--ink)' }}>{t.title}</span>
              </button>
            </li>
          ))}
        </ul>
        {pr.tasks.length < 3 && (
          <form onSubmit={addPriority} className="mt-3 flex gap-2">
            <label className="sr-only" htmlFor="prio-in">Nueva prioridad</label>
            <input id="prio-in" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} placeholder={pr.tasks.length ? 'Otra prioridad' : '¿Qué es lo más importante hoy?'} className="field" />
            <button className="btn btn-primary shrink-0" aria-label="Agregar prioridad"><Plus size={18} aria-hidden /></button>
          </form>
        )}
      </section>

      <section aria-labelledby="cap">
        <h2 id="cap" className="font-display text-2xl">Captura rápida</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>Anota lo que se te ocurra. Después decides dónde va.</p>
        <form onSubmit={capture} className="mt-3 flex gap-2">
          <label className="sr-only" htmlFor="cap-in">Captura rápida</label>
          <input id="cap-in" value={cap} onChange={(e) => setCap(e.target.value)} maxLength={2000} placeholder="Una idea, un link, una tarea…" className="field" />
          <button className="btn btn-ghost shrink-0" aria-label="Guardar captura"><Plus size={18} aria-hidden /></button>
        </form>
        {inbox.items.length > 0 && (
          <ul className="mt-3 grid gap-2 text-sm">
            {inbox.items.map((x) => <li key={x.id} className="rounded-xl px-3 py-2" style={{ background: 'var(--surface)', color: 'var(--ink-soft)' }}>{x.text}</li>)}
          </ul>
        )}
      </section>
    </div>
  )
}
