import { Check, Flame, Loader2, Pause, Play, SkipForward, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { chime } from '../../lib/ambient'
import { mmss, remainingSeconds } from '../../lib/focus'
import { routineStreak, type Routine, type Run, type Step } from '../../lib/routines'
import { supabase } from '../../lib/supabase'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'

/** Ejecución guiada: un paso a la vez, con cuenta regresiva. Cuenta como completada si haces al menos la mitad. */
export default function RoutineRun() {
  const { id } = useParams()
  const nav = useNavigate()
  const routines = useTable<Routine>('routines', { col: 'position', asc: true })
  const stepsDb = useTable<Step>('routine_steps', { col: 'position', asc: true })
  const runsDb = useTable<Run>('routine_runs', { col: 'day', asc: false })
  const today = localISO()

  const r = routines.rows.find((x) => x.id === id)
  const steps = useMemo(() => stepsDb.rows.filter((s) => s.routine_id === id).sort((a, b) => a.position - b.position), [stepsDb.rows, id])
  const todayRun = runsDb.rows.find((x) => x.routine_id === id && x.day === today)

  const [idx, setIdx] = useState<number | null>(null)
  const [done, setDone] = useState<string[]>([])
  const [endAt, setEndAt] = useState<number | null>(null)
  const [paused, setPaused] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [finished, setFinished] = useState<null | { completed: boolean; count: number }>(null)
  const [err, setErr] = useState('')

  const ready = !routines.loading && !stepsDb.loading && !runsDb.loading

  // Empieza en el primer paso que falte (para retomar si saliste)
  useEffect(() => {
    if (!ready || idx !== null || steps.length === 0) return
    const prev = todayRun && !todayRun.completed ? todayRun.done_steps : []
    setDone(prev)
    const first = steps.findIndex((s) => !prev.includes(s.id))
    setIdx(first === -1 ? 0 : first)
  }, [ready, idx, steps, todayRun])

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t) }, [])

  const step = idx !== null ? steps[idx] : undefined

  // Cuenta regresiva del paso
  useEffect(() => {
    if (!step) { setEndAt(null); setPaused(null); return }
    setPaused(null)
    setEndAt(step.minutes ? Date.now() + step.minutes * 60_000 : null)
  }, [step?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const left = endAt === null ? null : paused !== null ? paused : remainingSeconds(endAt, now)
  useEffect(() => { if (left === 0 && paused === null) { chime(); navigator.vibrate?.([200, 100, 200]) } }, [left, paused])

  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    navigator.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => {})
    return () => { lock?.release().catch(() => {}) }
  }, [])

  const save = useCallback(async (d: string[], completed: boolean) => {
    const { error } = await supabase.from('routine_runs').upsert({ routine_id: id, day: today, done_steps: d, total_steps: steps.length, completed, finished_at: completed ? new Date().toISOString() : null }, { onConflict: 'routine_id,day' })
    if (error) setErr('No se guardó el avance, pero puedes seguir.')
  }, [id, today, steps.length])

  const next = async (markDone: boolean) => {
    if (idx === null || !step) return
    const d = markDone && !done.includes(step.id) ? [...done, step.id] : done
    setDone(d)
    if (markDone) void save(d, false)
    if (idx + 1 < steps.length) setIdx(idx + 1)
    else {
      const completed = d.length >= Math.ceil(steps.length / 2)
      await save(d, completed)
      await runsDb.reload()
      setFinished({ completed, count: d.length })
    }
  }

  if (!ready) return <div className="safe-top fixed inset-0 z-50 grid place-items-center" style={{ background: '#07111a' }}><Loader2 className="animate-spin" aria-label="Cargando" /></div>
  if (!r || steps.length === 0) return <div className="safe-top fixed inset-0 z-50 grid place-items-center px-6 text-center" style={{ background: '#07111a' }}><div><p className="font-display text-2xl">{r ? 'Esta rutina no tiene pasos' : 'No encontré esta rutina'}</p><button className="btn btn-primary mt-4" onClick={() => nav('/app/mente/rutinas')}>Volver</button></div></div>

  if (finished) {
    const streak = routineStreak(r, runsDb.rows.filter((x) => x.routine_id === r.id), today)
    return (
      <div className="safe-top fixed inset-0 z-50 grid place-items-center px-6 text-center" style={{ background: '#07111a' }}>
        <div className="max-w-sm">
          <p className="eyebrow">{r.name}</p>
          <h1 className="mt-3 font-display text-5xl">{finished.completed ? 'Lista' : 'Hiciste lo que pudiste'}</h1>
          <p className="mt-3" style={{ color: 'var(--ink-soft)' }}>{finished.count} de {steps.length} pasos. {finished.completed ? 'Cuenta como completada.' : 'Mañana es otra oportunidad; la racha no se borra por un día.'}</p>
          {finished.completed && streak > 0 && <p className="mt-4 inline-flex items-center gap-2 text-lg" style={{ color: 'var(--accent)' }}><Flame size={20} aria-hidden /> {streak} {streak === 1 ? 'día seguido' : 'días seguidos'}</p>}
          <div className="mt-8 flex justify-center gap-3"><button className="btn btn-primary" onClick={() => nav('/app/mente/rutinas')}>Listo</button><button className="btn btn-ghost" onClick={() => nav('/app')}>Ir a Hoy</button></div>
        </div>
      </div>
    )
  }

  if (!step || idx === null) return null
  const total = (step.minutes ?? 0) * 60
  const R = 84, C = 2 * Math.PI * R
  const progress = left !== null && total ? (total - left) / total : 0

  return (
    <div className="safe-top fixed inset-0 z-50 flex flex-col" style={{ background: '#07111a' }}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button className="grid size-11 place-items-center rounded-full" onClick={() => nav('/app/mente/rutinas')} aria-label="Salir"><X size={22} aria-hidden /></button>
        <div className="min-w-0 flex-1 text-center"><p className="truncate text-sm font-semibold">{r.name}</p><p className="text-xs" style={{ color: 'var(--ink-soft)' }}>Paso {idx + 1} de {steps.length}</p></div>
        <span className="size-11" aria-hidden />
      </div>
      <div className="mx-4 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }} role="progressbar" aria-valuenow={done.length} aria-valuemin={0} aria-valuemax={steps.length} aria-label="Progreso de la rutina"><div className="h-full rounded-full" style={{ width: `${(done.length / steps.length) * 100}%`, background: 'var(--pos)', transition: 'width 300ms var(--ease-out)' }} /></div>

      <div className="flex flex-1 flex-col items-center justify-center gap-7 px-6 text-center">
        <h1 className="max-w-md font-display text-4xl">{step.title}</h1>
        {step.note && <p className="max-w-sm text-sm" style={{ color: 'var(--ink-soft)' }}>{step.note}</p>}
        {left !== null ? (
          <div className="relative grid place-items-center">
            <svg viewBox="0 0 200 200" width={220} height={220} role="timer" aria-label={`Quedan ${mmss(left)}`}>
              <circle cx="100" cy="100" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
              <circle cx="100" cy="100" r={R} fill="none" stroke={left === 0 ? 'var(--pos)' : 'var(--accent)'} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform="rotate(-90 100 100)" style={{ transition: 'stroke-dashoffset 300ms linear' }} />
            </svg>
            <span className="absolute font-display text-5xl" style={{ fontVariantNumeric: 'tabular-nums' }}>{left === 0 ? '¡Tiempo!' : mmss(left)}</span>
          </div>
        ) : <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>Sin tiempo: hazlo a tu ritmo.</p>}
        {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
      </div>

      <div className="flex items-center justify-center gap-3 border-t px-4 py-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        {left !== null && left > 0 && <button className="btn btn-ghost min-h-14" onClick={() => (paused !== null ? (setEndAt(Date.now() + paused * 1000), setPaused(null)) : setPaused(remainingSeconds(endAt!, Date.now())))} aria-label={paused !== null ? 'Seguir' : 'Pausar'}>{paused !== null ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />}</button>}
        <button className="btn btn-ghost min-h-14" onClick={() => void next(false)}><SkipForward size={16} aria-hidden /> Saltar</button>
        <button className="btn btn-primary min-h-14 px-8 text-lg" onClick={() => void next(true)}><Check size={20} aria-hidden /> {idx + 1 === steps.length ? 'Terminar' : 'Hecho'}</button>
      </div>
    </div>
  )
}
