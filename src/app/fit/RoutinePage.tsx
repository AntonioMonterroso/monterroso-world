import { ArrowDown, ArrowLeft, ArrowUp, Play, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Field from '../../components/Field'
import { useTable } from '../../lib/table'
import { DAYS } from '../../lib/time'
import type { Workout, WorkoutItem } from '../../lib/fitness'
import { chip, toNum } from '../money/shared'

const SUGGESTIONS = ['Sentadilla', 'Peso muerto', 'Press de banca', 'Press militar', 'Remo con barra', 'Dominadas', 'Fondos', 'Zancadas', 'Curl de bíceps', 'Extensión de tríceps', 'Plancha', 'Abdominales', 'Hip thrust', 'Jalón al pecho', 'Elevaciones laterales']

export default function RoutinePage() {
  const { id } = useParams()
  const nav = useNavigate()
  const ws = useTable<Workout>('workouts', { col: 'created_at', asc: true })
  const its = useTable<WorkoutItem>('workout_items', { col: 'position', asc: true })
  const [confirm, setConfirm] = useState(false)
  const w = ws.rows.find((x) => x.id === id)
  const items = its.rows.filter((i) => i.workout_id === id).sort((a, b) => a.position - b.position)

  if (ws.loading) return <p style={{ color: 'var(--ink-soft)' }}>Cargando…</p>
  if (!w) return <div><Link to="/app/ejercicio" className="underline">Volver a rutinas</Link><p className="mt-4">No encontré esta rutina.</p></div>

  const addItem = () => its.add({ workout_id: w.id, position: (items.at(-1)?.position ?? 0) + 1, name: 'Ejercicio', sets: 3, reps: '10', weight: null, rest_sec: 60, notes: null })
  const swap = async (i: number, d: number) => {
    const a = items[i], b = items[i + d]
    if (!a || !b) return
    await Promise.all([its.update(a.id, { position: b.position }), its.update(b.id, { position: a.position })])
  }

  return (
    <div>
      <Link to="/app/ejercicio" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm" style={{ color: 'var(--ink-soft)' }}><ArrowLeft size={16} aria-hidden /> Rutinas</Link>
      <Field value={w.title} onCommit={(v) => v.trim() && ws.update(w.id, { title: v.trim() })} maxLength={200} aria-label="Nombre de la rutina" />
      <div className="mt-3 flex gap-2" role="group" aria-label="Días sugeridos">
        {DAYS.map((d) => { const on = w.days.includes(d.n); return <button key={d.n} aria-pressed={on} aria-label={d.long} onClick={() => ws.update(w.id, { days: on ? w.days.filter((x) => x !== d.n) : [...w.days, d.n] })} className="grid size-11 place-items-center rounded-full border text-sm font-semibold" style={chip(on)}>{d.short}</button> })}
      </div>
      <div className="mt-5"><Link to={`/app/ejercicio/entrenar/${w.id}`} className="btn btn-primary"><Play size={16} aria-hidden /> Entrenar ahora</Link></div>

      <h2 className="mt-8 font-display text-2xl">Ejercicios</h2>
      <datalist id="ex">{SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
      <ol className="mt-3 grid gap-3">
        {items.map((it, i) => (
          <li key={it.id} className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
            <div className="flex items-center gap-2">
              <span className="font-display text-xl" style={{ color: 'var(--accent)' }}>{i + 1}</span>
              <Field value={it.name} onCommit={(v) => v.trim() && its.update(it.id, { name: v.trim() })} list="ex" maxLength={120} aria-label="Nombre del ejercicio" />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
              <label className="grid gap-1">Series<Field value={String(it.sets)} onCommit={(v) => its.update(it.id, { sets: Math.min(20, Math.max(1, Math.round(toNum(v)) || 1)) })} inputMode="numeric" /></label>
              <label className="grid gap-1">Reps<Field value={it.reps} onCommit={(v) => its.update(it.id, { reps: v.trim().slice(0, 20) || '10' })} maxLength={20} /></label>
              <label className="grid gap-1">Peso<Field value={it.weight == null ? '' : String(it.weight)} onCommit={(v) => { const n = toNum(v); its.update(it.id, { weight: v.trim() && n >= 0 ? n : null }) }} inputMode="decimal" /></label>
              <label className="grid gap-1">Descanso (s)<Field value={it.rest_sec == null ? '' : String(it.rest_sec)} onCommit={(v) => { const n = Math.round(toNum(v)); its.update(it.id, { rest_sec: n >= 0 && v.trim() ? Math.min(900, n) : null }) }} inputMode="numeric" /></label>
            </div>
            <div className="mt-2 flex justify-end">
              <button className="grid size-11 place-items-center" disabled={i === 0} onClick={() => swap(i, -1)} aria-label="Subir"><ArrowUp size={16} aria-hidden /></button>
              <button className="grid size-11 place-items-center" disabled={i === items.length - 1} onClick={() => swap(i, 1)} aria-label="Bajar"><ArrowDown size={16} aria-hidden /></button>
              <button className="grid size-11 place-items-center" onClick={() => its.remove(it.id)} aria-label="Quitar ejercicio"><Trash2 size={16} aria-hidden /></button>
            </div>
          </li>
        ))}
      </ol>
      <button className="btn btn-ghost mt-3" onClick={addItem}><Plus size={16} aria-hidden /> Agregar ejercicio</button>

      <h2 className="mt-8 font-display text-2xl">Notas</h2>
      <div className="mt-3"><Field multiline rows={3} value={w.notes ?? ''} onCommit={(v) => ws.update(w.id, { notes: v.trim() || null })} maxLength={2000} aria-label="Notas de la rutina" /></div>

      <div className="mt-10">
        <button className="btn btn-ghost" style={{ color: confirm ? '#e8a393' : undefined }} onClick={async () => { if (confirm) { await ws.remove(w.id); nav('/app/ejercicio') } else setConfirm(true) }}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro? Se borra la rutina y sus ejercicios' : 'Eliminar rutina'}</button>
      </div>
    </div>
  )
}
