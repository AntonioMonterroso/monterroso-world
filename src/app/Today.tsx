import { Check, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import Avatar, { propForHour } from '../components/Avatar'

// Horario base provisional (trabajo 8–17). El horario real, editable por día, llega con el módulo Planear.
const base = [{ name: 'Trabajo', from: 8, to: 17 }]

type Task = { id: string; text: string; done: boolean }
const today = () => new Date().toISOString().slice(0, 10)

function useLocal<T>(key: string, init: T) {
  const [v, setV] = useState<T>(() => {
    try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : init } catch { return init }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* sin almacenamiento */ } }, [key, v])
  return [v, setV] as const
}

const greet = (h: number) => (h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches')
const fmt = (n: number) => `${String(Math.floor(n)).padStart(2, '0')}:${String(Math.round((n % 1) * 60)).padStart(2, '0')}`

export default function Today() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t) }, [])
  const h = now.getHours() + now.getMinutes() / 60

  const current = base.find((b) => h >= b.from && h < b.to)
  const next = base.find((b) => b.from > h)
  const left = current ? Math.round((current.to - h) * 60) : null

  const [tasks, setTasks] = useLocal<Task[]>(`mw_tasks_${today()}`, [])
  const [draft, setDraft] = useState('')
  const [inbox, setInbox] = useLocal<string[]>('mw_inbox', [])
  const [cap, setCap] = useState('')

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || tasks.length >= 3) return
    setTasks([...tasks, { id: crypto.randomUUID(), text: draft.trim(), done: false }])
    setDraft('')
  }
  const capture = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cap.trim()) return
    setInbox([cap.trim(), ...inbox])
    setCap('')
  }

  return (
    <div className="grid gap-10">
      <section className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">{now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1 className="mt-2 font-display text-4xl">{greet(now.getHours())}</h1>
          <p className="mt-3 text-lg" style={{ color: 'var(--ink-soft)' }}>
            {current ? <>Ahora: <strong style={{ color: 'var(--ink)' }}>{current.name}</strong> · quedan {Math.floor((left ?? 0) / 60)} h {(left ?? 0) % 60} min</> : next ? <>Sigue: <strong style={{ color: 'var(--ink)' }}>{next.name}</strong> a las {fmt(next.from)}</> : 'No hay bloques activos. Es tu tiempo.'}
          </p>
        </div>
        <div className="w-28 shrink-0 sm:w-36"><Avatar prop={propForHour(now.getHours())} size={150} /></div>
      </section>

      <section aria-labelledby="prio">
        <h2 id="prio" className="font-display text-2xl">Tres prioridades</h2>
        <ul className="mt-4 grid gap-2">
          {tasks.map((t) => (
            <li key={t.id}>
              <button className="flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 text-left" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }} onClick={() => setTasks(tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))} aria-pressed={t.done}>
                <span className="grid size-6 shrink-0 place-items-center rounded-full border" style={{ borderColor: 'var(--accent)', background: t.done ? 'var(--accent)' : 'transparent', color: 'var(--bg)' }}>{t.done && <Check size={14} aria-hidden />}</span>
                <span style={{ textDecoration: t.done ? 'line-through' : 'none', color: t.done ? 'var(--ink-faint)' : 'var(--ink)' }}>{t.text}</span>
              </button>
            </li>
          ))}
        </ul>
        {tasks.length < 3 && (
          <form onSubmit={add} className="mt-3 flex gap-2">
            <label className="sr-only" htmlFor="prio-in">Nueva prioridad</label>
            <input id="prio-in" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={tasks.length ? 'Otra prioridad' : '¿Qué es lo más importante hoy?'} className="field" />
            <button className="btn btn-primary shrink-0" aria-label="Agregar prioridad"><Plus size={18} aria-hidden /></button>
          </form>
        )}
      </section>

      <section aria-labelledby="cap">
        <h2 id="cap" className="font-display text-2xl">Captura rápida</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>Anota lo que se te ocurra. Después decides dónde va.</p>
        <form onSubmit={capture} className="mt-3 flex gap-2">
          <label className="sr-only" htmlFor="cap-in">Captura rápida</label>
          <input id="cap-in" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="Una idea, un link, una tarea…" className="field" />
          <button className="btn btn-ghost shrink-0" aria-label="Guardar captura"><Plus size={18} aria-hidden /></button>
        </form>
        {inbox.length > 0 && (
          <ul className="mt-3 grid gap-2 text-sm">
            {inbox.slice(0, 5).map((x, i) => (
              <li key={i} className="rounded-xl px-3 py-2" style={{ background: 'var(--surface)', color: 'var(--ink-soft)' }}>{x}</li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs" style={{ color: 'var(--ink-faint)' }}>Por ahora se guarda solo en este dispositivo; se sincroniza cuando conectemos la base de datos.</p>
      </section>
    </div>
  )
}
