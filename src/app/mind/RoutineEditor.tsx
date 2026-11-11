import { ArrowDown, ArrowLeft, ArrowUp, BellOff, BellPlus, GripVertical, Play, Plus, Trash2 } from 'lucide-react'
import { Reorder, useDragControls } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Field from '../../components/Field'
import { supabase } from '../../lib/supabase'
import { useTable } from '../../lib/table'
import { DAYS, localISO, toMin } from '../../lib/time'
import { KIND_LABEL, fmtStart, totalMinutes, type Routine, type RoutineKind, type Step } from '../../lib/routines'
import { chip } from '../money/shared'

export default function RoutineEditor() {
  const { id } = useParams()
  const nav = useNavigate()
  const routines = useTable<Routine>('routines', { col: 'position', asc: true })
  const stepsDb = useTable<Step>('routine_steps', { col: 'position', asc: true })
  const [confirm, setConfirm] = useState(false)
  const [msg, setMsg] = useState('')

  const r = routines.rows.find((x) => x.id === id)
  const steps = stepsDb.rows.filter((s) => s.routine_id === id).sort((a, b) => a.position - b.position)
  // Orden mientras arrastras; al soltar se guarda
  const [order, setOrder] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)
  const key = steps.map((s) => `${s.id}:${s.position}`).join(',')
  useEffect(() => { if (!dragging) setOrder(steps.map((s) => s.id)) }, [key, dragging]) // eslint-disable-line react-hooks/exhaustive-deps
  const persistOrder = async () => {
    setDragging(false)
    await Promise.all(order.map((sid, i) => { const st = steps.find((x) => x.id === sid); return st && st.position !== i + 1 ? stepsDb.update(sid, { position: i + 1 }) : Promise.resolve() }))
  }

  if (routines.loading) return <p style={{ color: 'var(--ink-soft)' }}>Cargando…</p>
  if (!r) return <div><Link to="/app/mente/rutinas" className="underline">Volver a rutinas</Link><p className="mt-4">No encontré esta rutina.</p></div>

  const swap = async (i: number, d: number) => {
    const a = steps[i], b = steps[i + d]
    if (!a || !b) return
    await Promise.all([stepsDb.update(a.id, { position: b.position }), stepsDb.update(b.id, { position: a.position })])
  }

  // El recordatorio diario es un evento repetitivo: usa los avisos push que ya tienes
  const eventFields = (x: Pick<Routine, 'name' | 'start_min' | 'days'>) => ({
    title: x.name, action: `Empieza ${x.name}`, start_min: x.start_min ?? 0,
    repeat: x.days.length === 7 ? 'daily' : 'weekly', weekdays: x.days.length === 7 ? [] : x.days, alerts: [10, 0],
  })
  const patch = async (p: Partial<Omit<Routine, 'id'>>) => {
    await routines.update(r.id, p)
    if (r.event_id) await supabase.from('events').update(eventFields({ ...r, ...p })).eq('id', r.event_id)
  }
  const addReminder = async () => {
    if (r.start_min == null) return setMsg('Primero elige la hora a la que empiezas.')
    const { data, error } = await supabase.from('events').insert({ type: 'reminder', kind: 'other', start_date: localISO(), interval_n: 1, exceptions: [], checklist: [], persistent: false, ...eventFields(r) }).select('id').single()
    if (error || !data) return setMsg('No pude crear el recordatorio.')
    await routines.update(r.id, { event_id: data.id as string })
    setMsg('Listo: te aviso a la hora y 10 minutos antes.')
  }
  const removeReminder = async () => {
    if (r.event_id) await supabase.from('events').delete().eq('id', r.event_id)
    await routines.update(r.id, { event_id: null }); setMsg('Recordatorio quitado.')
  }
  const del = async () => {
    if (r.event_id) await supabase.from('events').delete().eq('id', r.event_id)
    await routines.remove(r.id); nav('/app/mente/rutinas')
  }

  return (
    <div>
      <Link to="/app/mente/rutinas" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm" style={{ color: 'var(--ink-soft)' }}><ArrowLeft size={16} aria-hidden /> Rutinas</Link>
      <Field value={r.name} onCommit={(v) => v.trim() && patch({ name: v.trim() })} maxLength={120} aria-label="Nombre de la rutina" />

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Tipo">
        {(Object.keys(KIND_LABEL) as RoutineKind[]).map((k) => <button key={k} aria-pressed={r.kind === k} onClick={() => patch({ kind: k })} className="min-h-11 rounded-full border px-4 text-sm" style={chip(r.kind === k)}>{KIND_LABEL[k]}</button>)}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm">Hora a la que empiezo
          <input type="time" className="field" value={fmtStart(r.start_min)} onChange={(e) => patch({ start_min: e.target.value ? toMin(e.target.value) : null })} />
        </label>
        <fieldset>
          <legend className="mb-2 text-sm">Días</legend>
          <div className="flex gap-1.5">{DAYS.map((d) => { const on = r.days.includes(d.n); return <button key={d.n} aria-pressed={on} aria-label={d.long} onClick={() => { const next = on ? r.days.filter((x) => x !== d.n) : [...r.days, d.n]; if (next.length) patch({ days: next }) }} className="grid size-11 place-items-center rounded-full border text-sm font-semibold" style={chip(on)}>{d.short}</button> })}</div>
        </fieldset>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link to={`/app/mente/rutinas/${r.id}/hacer`} className="btn btn-primary"><Play size={16} aria-hidden /> Hacerla ahora</Link>
        {r.event_id ? <button className="btn btn-ghost" onClick={removeReminder}><BellOff size={16} aria-hidden /> Quitar recordatorio diario</button> : <button className="btn btn-ghost" onClick={addReminder}><BellPlus size={16} aria-hidden /> Recordarme todos los días</button>}
      </div>
      {msg && <p role="status" className="mt-3 text-sm" style={{ color: 'var(--sky)' }}>{msg}</p>}
      {(routines.error || stepsDb.error) && <p role="alert" className="mt-3 text-sm" style={{ color: 'var(--aviso-texto)' }}>{routines.error || stepsDb.error}</p>}

      <h2 className="mt-8 font-display text-2xl">Pasos <span className="text-base" style={{ color: 'var(--ink-faint)' }}>{totalMinutes(steps) > 0 && `· ${totalMinutes(steps)} min`}</span></h2>
      <p className="mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>Arrastra desde la manija para cambiar el orden.</p>
      <Reorder.Group as="ol" axis="y" values={order} onReorder={setOrder} className="mt-3 grid gap-3">
        {order.map((sid, i) => { const s = steps.find((x) => x.id === sid); return s ? (
          <StepRow key={s.id} s={s} i={i} n={order.length} onDragStart={() => setDragging(true)} onDragEnd={() => void persistOrder()}
            onUpdate={(p) => stepsDb.update(s.id, p)} onRemove={() => stepsDb.remove(s.id)} onSwap={(d) => swap(steps.findIndex((x) => x.id === s.id), d)} />
        ) : null })}
      </Reorder.Group>
      <button className="btn btn-ghost mt-3" onClick={() => stepsDb.add({ routine_id: r.id, position: (steps.at(-1)?.position ?? 0) + 1, title: 'Nuevo paso', minutes: 5, note: null })}><Plus size={16} aria-hidden /> Agregar paso</button>

      <div className="mt-10">
        <button className="btn btn-ghost" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={() => (confirm ? del() : setConfirm(true))}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro? Se borra con su historial' : 'Eliminar rutina'}</button>
      </div>
    </div>
  )
}

function StepRow({ s, i, n, onDragStart, onDragEnd, onUpdate, onRemove, onSwap }: { s: Step; i: number; n: number; onDragStart: () => void; onDragEnd: () => void; onUpdate: (p: Partial<Omit<Step, 'id'>>) => void; onRemove: () => void; onSwap: (d: number) => void }) {
  const controls = useDragControls()
  return (
    <Reorder.Item as="li" value={s.id} dragListener={false} dragControls={controls} onDragStart={onDragStart} onDragEnd={onDragEnd} className="rounded-xl border p-3" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)', position: 'relative' }}>
      <div className="flex items-center gap-2">
        <button type="button" className="grid size-11 shrink-0 cursor-grab place-items-center rounded-full" style={{ touchAction: 'none', color: 'var(--ink-faint)' }} onPointerDown={(e) => controls.start(e)} aria-label={`Arrastrar el paso ${i + 1}`}><GripVertical size={18} aria-hidden /></button>
        <span className="w-6 text-center font-display text-xl" style={{ color: 'var(--accent)' }}>{i + 1}</span>
        <Field value={s.title} onCommit={(v) => v.trim() && onUpdate({ title: v.trim() })} maxLength={160} aria-label="Paso" />
        <label className="flex shrink-0 items-center gap-1 text-sm"><Field value={s.minutes ? String(s.minutes) : ''} onCommit={(v) => { const m = Math.round(Number(v)); onUpdate({ minutes: m > 0 ? Math.min(180, m) : null }) }} inputMode="numeric" aria-label="Minutos" style={{ width: 60 }} /> min</label>
      </div>
      <div className="mt-2"><Field value={s.note ?? ''} onCommit={(v) => onUpdate({ note: v.trim() || null })} maxLength={300} placeholder="Nota (opcional)" aria-label="Nota del paso" /></div>
      <div className="mt-1 flex justify-end">
        <button className="grid size-11 place-items-center" disabled={i === 0} onClick={() => onSwap(-1)} aria-label="Subir paso"><ArrowUp size={16} aria-hidden /></button>
        <button className="grid size-11 place-items-center" disabled={i === n - 1} onClick={() => onSwap(1)} aria-label="Bajar paso"><ArrowDown size={16} aria-hidden /></button>
        <button className="grid size-11 place-items-center" onClick={onRemove} aria-label="Quitar paso"><Trash2 size={16} aria-hidden /></button>
      </div>
    </Reorder.Item>
  )
}
