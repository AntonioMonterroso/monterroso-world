import { Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { exerciseNames, progress, sessionsInLast, volume, type Partner, type WorkoutLog } from '../../lib/fitness'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { Empty, ErrorBar, chip } from '../money/shared'

function Spark({ points }: { points: { date: string; best: number }[] }) {
  if (points.length < 2) return <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>Necesitas al menos dos sesiones con este ejercicio para ver la curva.</p>
  const W = 300, H = 80
  const max = Math.max(...points.map((p) => p.best)), min = Math.min(...points.map((p) => p.best))
  const span = Math.max(1, max - min)
  const xy = points.map((p, i) => [(i / (points.length - 1)) * (W - 16) + 8, H - 12 - ((p.best - min) / span) * (H - 28)] as const)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Mejor peso por sesión: de ${points[0].best} a ${points.at(-1)!.best}`}>
      <polyline points={xy.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="var(--music)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {xy.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" fill="var(--music)" />)}
    </svg>
  )
}

export default function History() {
  const logs = useTable<WorkoutLog>('workout_logs', { col: 'performed_on', asc: false })
  const partners = useTable<Partner>('training_partners', { col: 'name', asc: true })
  const [who, setWho] = useState<string>('me')
  const [open, setOpen] = useState<string | null>(null)
  const [ex, setEx] = useState('')
  const today = localISO()

  const mine = useMemo(() => logs.rows.filter((l) => (who === 'me' ? l.partner_id === null : l.partner_id === who)), [logs.rows, who])
  const names = useMemo(() => exerciseNames(mine), [mine])
  const exercise = names.includes(ex) ? ex : names[0] ?? ''
  const points = useMemo(() => (exercise ? progress(mine, exercise) : []), [mine, exercise])
  const week = sessionsInLast(mine, today, 7)

  if (logs.loading) return <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>

  return (
    <div>
      <p className="eyebrow">Ejercicio</p>
      <h1 className="mt-2 font-display text-4xl">Historial</h1>
      <ErrorBar msg={logs.error} onClose={logs.clearError} />

      {partners.rows.length > 0 && (
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Persona">
          {[{ id: 'me', name: 'Yo' }, ...partners.rows].map((p) => <button key={p.id} aria-pressed={who === p.id} onClick={() => setWho(p.id)} className="min-h-11 shrink-0 rounded-full border px-4 text-sm" style={chip(who === p.id)}>{p.name}</button>)}
        </div>
      )}

      {mine.length === 0 ? <Empty title="Aún no hay sesiones" text="Cuando termines un entrenamiento, aparece aquí con sus series y pesos." /> : (
        <div className="mt-6 grid gap-8">
          <p className="rounded-2xl border p-4 text-sm" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)', color: 'var(--ink-soft)' }}>
            <span className="font-display text-3xl" style={{ color: 'var(--ink)' }}>{week}</span> {week === 1 ? 'sesión' : 'sesiones'} en los últimos 7 días · {mine.length} en total
          </p>

          {names.length > 0 && (
            <section aria-labelledby="prog">
              <h2 id="prog" className="font-display text-2xl">Progreso</h2>
              <select className="field mt-3" value={exercise} onChange={(e) => setEx(e.target.value)} aria-label="Ejercicio">{names.map((n) => <option key={n}>{n}</option>)}</select>
              <div className="mt-3"><Spark points={points} /></div>
              {points.length > 0 && <p className="mt-1 text-xs" style={{ color: 'var(--ink-faint)' }}>Mejor peso: {Math.max(...points.map((p) => p.best))} · Última vez: {points.at(-1)!.best}</p>}
            </section>
          )}

          <section aria-labelledby="ses">
            <h2 id="ses" className="font-display text-2xl">Sesiones</h2>
            <ul className="mt-3 grid gap-2">
              {mine.map((l) => (
                <li key={l.id} className="rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
                  <button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left" onClick={() => setOpen(open === l.id ? null : l.id)} aria-expanded={open === l.id}>
                    <span className="min-w-0"><span className="block truncate font-semibold">{l.title}</span><span className="block text-xs" style={{ color: 'var(--ink-faint)' }}>{l.performed_on}{l.duration_min && ` · ${l.duration_min} min`}{l.session_key && ' · con compañero'}</span></span>
                    <span className="shrink-0 text-xs" style={{ color: 'var(--ink-soft)' }}>{volume(l.entries) > 0 ? `${volume(l.entries).toLocaleString('es')} de volumen` : ''}</span>
                  </button>
                  {open === l.id && (
                    <div className="grid gap-2 border-t px-4 py-3 text-sm" style={{ borderColor: 'var(--line-soft)' }}>
                      {l.entries.map((e, i) => <p key={i}><strong>{e.name}</strong> <span style={{ color: 'var(--ink-soft)' }}>{e.sets.map((s) => `${s.reps}${s.weight ? `×${s.weight}` : ''}`).join(' · ')}</span></p>)}
                      {l.notes && <p style={{ color: 'var(--ink-soft)' }}>{l.notes}</p>}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
