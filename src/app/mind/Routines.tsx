import { Check, Flame, Loader2, Play, Plus, Sun, Moon, ListChecks } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KIND_LABEL, TEMPLATES, fmtStart, progressOf, routineStreak, totalMinutes, type Routine, type Run, type Step } from '../../lib/routines'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { ErrorBar } from '../money/shared'
import { PageHeader } from '../../components/ui'

const kindIcon = { morning: Sun, evening: Moon, custom: ListChecks } as const

export default function Routines() {
  const routines = useTable<Routine>('routines', { col: 'position', asc: true })
  const steps = useTable<Step>('routine_steps', { col: 'position', asc: true })
  const runs = useTable<Run>('routine_runs', { col: 'day', asc: false })
  const nav = useNavigate()
  const today = localISO()
  const [busy, setBusy] = useState(false)

  const create = async (kind: 'morning' | 'evening' | 'custom') => {
    setBusy(true)
    const t = kind === 'custom' ? null : TEMPLATES[kind]
    const r = await routines.add({ name: t?.name ?? 'Nueva rutina', kind, start_min: t?.start_min ?? null, days: [0, 1, 2, 3, 4, 5, 6], position: (routines.rows.at(-1)?.position ?? 0) + 1, event_id: null })
    if (r && t) await Promise.all(t.steps.map((s, i) => steps.add({ routine_id: r.id, position: i + 1, title: s.title, minutes: s.minutes, note: s.note ?? null })))
    setBusy(false)
    if (r) nav(`/app/mente/rutinas/${r.id}`)
  }

  if (routines.loading) return <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>

  return (
    <div>
      <PageHeader eyebrow="Mente y cuerpo" title="Rutinas" sub="Tu mañana y tu noche, paso a paso y con tiempo. Sin culpa: si haces la mitad, cuenta." action={routines.rows.length > 0 ? <button className="btn btn-primary" onClick={() => create('custom')} disabled={busy}><Plus size={18} aria-hidden /> Rutina</button> : undefined} />
      <ErrorBar msg={routines.error || steps.error || runs.error} onClose={routines.clearError} />

      {routines.rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border p-6" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
          <p className="font-display text-2xl">Empieza con una plantilla</p>
          <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--ink-soft)' }}>Puedes cambiar los pasos, los tiempos y la hora cuando quieras.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="btn btn-primary" onClick={() => create('morning')} disabled={busy}><Sun size={16} aria-hidden /> Rutina de mañana</button>
            <button className="btn btn-primary" onClick={() => create('evening')} disabled={busy}><Moon size={16} aria-hidden /> Rutina de noche</button>
            <button className="btn btn-ghost" onClick={() => create('custom')} disabled={busy}>En blanco</button>
          </div>
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {routines.rows.map((r) => {
            const mine = steps.rows.filter((s) => s.routine_id === r.id).sort((a, b) => a.position - b.position)
            const myRuns = runs.rows.filter((x) => x.routine_id === r.id)
            const todayRun = myRuns.find((x) => x.day === today)
            const p = progressOf(todayRun, mine)
            const streak = routineStreak(r, myRuns, today)
            const Icon = kindIcon[r.kind]
            const done = Boolean(todayRun?.completed)
            return (
              <li key={r.id} className="rounded-2xl border p-4" style={{ background: 'var(--surface)', borderColor: done ? 'var(--pos)' : 'var(--line-soft)' }}>
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full" style={{ background: 'color-mix(in oklab, var(--accent) 14%, transparent)', color: 'var(--accent)' }}><Icon size={20} aria-hidden /></span>
                  <Link to={`/app/mente/rutinas/${r.id}`} className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.name}</span>
                    <span className="block text-xs" style={{ color: 'var(--ink-faint)' }}>{KIND_LABEL[r.kind]}{r.start_min != null && ` · ${fmtStart(r.start_min)}`} · {mine.length} {mine.length === 1 ? 'paso' : 'pasos'}{totalMinutes(mine) > 0 && ` · ${totalMinutes(mine)} min`}</span>
                  </Link>
                  {streak > 0 && <span className="flex shrink-0 items-center gap-1 text-sm" style={{ color: 'var(--accent)' }} aria-label={`Racha de ${streak} días`}><Flame size={16} aria-hidden /> {streak}</span>}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }} role="img" aria-label={`Hoy ${p.done} de ${p.total}`}><div className="h-full rounded-full" style={{ width: `${p.pct}%`, background: 'var(--pos)', transition: 'width 400ms var(--ease-out)' }} /></div>
                  <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>{done ? 'Hecha hoy' : `${p.done}/${p.total}`}</span>
                  {mine.length > 0 && <Link to={`/app/mente/rutinas/${r.id}/hacer`} className={done ? 'btn btn-ghost' : 'btn btn-primary'}>{done ? <Check size={16} aria-hidden /> : <Play size={16} aria-hidden />} {done ? 'Repetir' : p.done > 0 ? 'Seguir' : 'Empezar'}</Link>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
