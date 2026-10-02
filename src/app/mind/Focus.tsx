import { Loader2, Pause, Play, Plus, Square, Volume2, VolumeX, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Avatar from '../../components/Avatar'
import { chime, startAmbient, stopAmbient, type AmbientKind } from '../../lib/ambient'
import { CAPTURE_LABEL, DEFAULT_DOPAMINE, classifyCapture, focusStats, mmss, pickDopamine, remainingSeconds, type FocusSession } from '../../lib/focus'
import { getSettings, patchSettings } from '../../lib/settings'
import { supabase } from '../../lib/supabase'
import { useTable } from '../../lib/table'
import { usePriorities } from '../../lib/data'
import { ErrorBar, chip } from '../money/shared'
import { PageHeader } from '../../components/ui'

type Inbox = { id: string; text: string; kind: string; processed: boolean; source: string }
type Run = { mode: 'focus' | 'break'; status: 'running' | 'paused' | 'finished'; task: string; plannedMin: number; startedAt: number; endAt: number; pausedLeft: number; distractions: number; sound: AmbientKind; companion: boolean; saved: boolean; actualMin: number; completed: boolean }

const KEY = 'mw_focus'
const DURATIONS = [15, 25, 45, 50]
const SOUNDS: { id: AmbientKind; label: string }[] = [{ id: 'off', label: 'Silencio' }, { id: 'brown', label: 'Ruido marrón' }, { id: 'rain', label: 'Lluvia' }]

const load = (): Run | null => { try { const r = localStorage.getItem(KEY); return r ? (JSON.parse(r) as Run) : null } catch { return null } }
const store = (r: Run | null) => { try { if (r) localStorage.setItem(KEY, JSON.stringify(r)); else localStorage.removeItem(KEY) } catch { /* sin almacenamiento */ } }

const MESSAGES = ['Estoy aquí contigo.', 'Una sola cosa a la vez.', 'Vas bien. Sigue con lo que tienes enfrente.', 'Si algo se te ocurre, anótalo y vuelve.', 'Respira. Falta menos de lo que parece.']

export default function Focus() {
  const sessions = useTable<FocusSession>('focus_sessions', { col: 'started_at', asc: false })
  const inbox = useTable<Inbox>('inbox_items', { col: 'created_at', asc: false })
  const pr = usePriorities()
  const [run, setRun] = useState<Run | null>(load)
  const [now, setNow] = useState(() => Date.now())
  const [task, setTask] = useState('')
  const [minutes, setMinutes] = useState(25)
  const [custom, setCustom] = useState('')
  const [sound, setSound] = useState<AmbientKind>('off')
  const [companion, setCompanion] = useState(true)
  const [cap, setCap] = useState('')
  const [lastCap, setLastCap] = useState('')
  const [dop, setDop] = useState<{ enabled: boolean; items: string[] }>({ enabled: false, items: DEFAULT_DOPAMINE })
  const [picks, setPicks] = useState<string[]>([])
  const [err, setErr] = useState('')
  const finishing = useRef(false)

  useEffect(() => { getSettings().then((s) => { const d = (s as { dopamine?: typeof dop }).dopamine; if (d) setDop(d) }) }, [])
  useEffect(() => { store(run) }, [run])
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t) }, [])

  const left = run ? (run.status === 'paused' ? run.pausedLeft : run.status === 'running' ? remainingSeconds(run.endAt, now) : 0) : 0
  const total = run ? run.plannedMin * 60 : 0

  // Título de la pestaña con el tiempo
  useEffect(() => {
    if (run?.status === 'running' || run?.status === 'paused') document.title = `${mmss(left)} · ${run.mode === 'focus' ? 'Enfoque' : 'Pausa'}`
    return () => { document.title = 'Monterroso World | Desarrollador web y músico' }
  }, [run?.status, run?.mode, left])

  // Pantalla encendida y sonido mientras corre
  useEffect(() => {
    if (run?.status !== 'running') return
    let lock: WakeLockSentinel | null = null
    navigator.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => {})
    return () => { lock?.release().catch(() => {}) }
  }, [run?.status])
  useEffect(() => {
    if (run?.status === 'running' && run.mode === 'focus' && run.sound !== 'off') startAmbient(run.sound)
    else stopAmbient()
    return () => stopAmbient()
  }, [run?.status, run?.mode, run?.sound])

  const finish = useCallback(async (completed: boolean) => {
    if (!run || run.status === 'finished' || finishing.current) return
    finishing.current = true
    const spent = Math.max(0, total - (run.status === 'paused' ? run.pausedLeft : remainingSeconds(run.endAt, Date.now())))
    const actual = completed && run.mode === 'focus' ? Math.max(1, Math.round(spent / 60)) : Math.round(spent / 60)
    chime()
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      navigator.serviceWorker?.ready.then((r) => r.showNotification(run.mode === 'focus' ? 'Terminó tu enfoque' : 'Terminó la pausa', { body: run.mode === 'focus' ? 'Buen trabajo. Anota lo que quedó y descansa.' : 'Cuando quieras, otra ronda.' })).catch(() => {})
    }
    let saved = run.saved
    if (run.mode === 'focus' && actual >= 1 && !run.saved) {
      const { error } = await supabase.from('focus_sessions').insert({ task: run.task || null, planned_min: run.plannedMin, actual_min: Math.min(600, actual), completed, distractions: Math.min(500, run.distractions), started_at: new Date(run.startedAt).toISOString() })
      if (error) setErr('No se guardó la sesión, pero tu tiempo cuenta igual.'); else saved = true
    }
    if (run.mode === 'focus' && dop.enabled) setPicks(pickDopamine(dop.items, 3))
    setRun({ ...run, status: 'finished', saved, actualMin: actual, completed })
    finishing.current = false
  }, [run, total, dop])

  useEffect(() => { if (run?.status === 'running' && left === 0) void finish(true) }, [run?.status, left, finish])

  const start = (mins: number, mode: 'focus' | 'break' = 'focus', keepTask = '') => {
    const t = Date.now()
    setPicks([])
    setRun({ mode, status: 'running', task: mode === 'focus' ? (keepTask || task.trim()) : '', plannedMin: mins, startedAt: t, endAt: t + mins * 60_000, pausedLeft: 0, distractions: 0, sound, companion, saved: false, actualMin: 0, completed: false })
  }

  const pending = useMemo(() => inbox.rows.filter((i) => i.source === 'focus' && !i.processed), [inbox.rows])

  const capture = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = cap.trim()
    if (!text || !run) return
    const kind = classifyCapture(text)
    const row = await inbox.add({ text, kind: kind === 'link' ? 'link' : kind, processed: false, source: 'focus' })
    if (row) { setLastCap(`${CAPTURE_LABEL[kind]}: ${text}`); setRun({ ...run, distractions: run.distractions + 1 }) }
    setCap('')
  }

  const toTask = async (i: Inbox) => {
    const { error } = await supabase.from('tasks').insert({ title: i.text.slice(0, 500) })
    if (error) return setErr('No pude crear la tarea.')
    await inbox.update(i.id, { processed: true })
  }

  const saveDop = (d: typeof dop) => { setDop(d); patchSettings({ dopamine: d } as never) }
  const stats = useMemo(() => focusStats(sessions.rows), [sessions.rows])
  const msg = run ? MESSAGES[Math.min(MESSAGES.length - 1, Math.floor(((total - left) / Math.max(1, total)) * MESSAGES.length))] : ''
  const r = 90, C = 2 * Math.PI * r

  if (sessions.loading) return <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>

  // ───────── En marcha (pantalla completa, sin distracciones) ─────────
  if (run && run.status !== 'finished') {
    const isFocus = run.mode === 'focus'
    return (
      <div className="safe-top fixed inset-0 z-50 flex flex-col" style={{ background: '#07111a' }}>
        <div className="flex items-center justify-between px-3 py-2">
          <button className="grid size-11 place-items-center rounded-full" onClick={() => finish(false).then(() => setRun(null))} aria-label="Cancelar y salir"><X size={22} aria-hidden /></button>
          <span className="text-sm" style={{ color: 'var(--ink-soft)' }}>{isFocus ? 'Enfoque' : 'Pausa'}</span>
          <button className="grid size-11 place-items-center rounded-full" onClick={() => setRun({ ...run, sound: run.sound === 'off' ? 'brown' : 'off' })} aria-label={run.sound === 'off' ? 'Activar sonido' : 'Silenciar'} aria-pressed={run.sound !== 'off'}>{run.sound === 'off' ? <VolumeX size={20} aria-hidden /> : <Volume2 size={20} aria-hidden />}</button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
          {run.task && <p className="max-w-md font-display text-2xl">{run.task}</p>}
          <div className="relative grid place-items-center">
            <svg viewBox="0 0 200 200" width={260} height={260} role="timer" aria-label={`Quedan ${mmss(left)}`}>
              <circle cx="100" cy="100" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="8" />
              <circle cx="100" cy="100" r={r} fill="none" stroke={isFocus ? 'var(--accent)' : 'var(--pos)'} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - (total ? (total - left) / total : 0))} transform="rotate(-90 100 100)" style={{ transition: 'stroke-dashoffset 300ms linear' }} />
            </svg>
            <span className="absolute font-display text-6xl" style={{ fontVariantNumeric: 'tabular-nums' }}>{mmss(left)}</span>
          </div>
          {isFocus && run.companion && (
            <div className="flex items-center gap-3 text-left" aria-live="off">
              <div className="w-24 shrink-0"><Avatar prop="laptop" size={96} /></div>
              <p className="max-w-[16rem] text-sm" style={{ color: 'var(--ink-soft)' }}>{msg}</p>
            </div>
          )}
          <div className="flex gap-3">
            <button className="btn btn-primary min-h-14 px-6" onClick={() => setRun(run.status === 'paused' ? { ...run, status: 'running', endAt: Date.now() + run.pausedLeft * 1000 } : { ...run, status: 'paused', pausedLeft: remainingSeconds(run.endAt, Date.now()) })}>{run.status === 'paused' ? <Play size={18} aria-hidden /> : <Pause size={18} aria-hidden />} {run.status === 'paused' ? 'Seguir' : 'Pausar'}</button>
            <button className="btn btn-ghost min-h-14 px-6" onClick={() => finish(true)}><Square size={16} aria-hidden /> {isFocus ? 'Terminé' : 'Saltar'}</button>
          </div>
        </div>

        {isFocus && (
          <form onSubmit={capture} className="border-t px-3 py-3" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)', paddingBottom: 'max(.75rem, env(safe-area-inset-bottom))' }}>
            <p className="mb-2 text-xs" style={{ color: 'var(--ink-faint)' }}>¿Se te ocurrió algo? Anótalo aquí y sigue; no pierdes el tiempo.{run.distractions > 0 && ` · ${run.distractions} anotadas`}</p>
            <div className="flex gap-2">
              <label className="sr-only" htmlFor="park">Estacionamiento de distracciones</label>
              <input id="park" className="field" value={cap} onChange={(e) => setCap(e.target.value)} maxLength={500} placeholder="Llamar a… / ¿Y si…? / me preocupa…" autoComplete="off" />
              <button className="btn btn-ghost shrink-0" aria-label="Guardar y volver a lo mío"><Plus size={18} aria-hidden /></button>
            </div>
            {lastCap && <p role="status" className="mt-2 truncate text-xs" style={{ color: 'var(--sky)' }}>Guardado → {lastCap}</p>}
          </form>
        )}
      </div>
    )
  }

  // ───────── Terminó ─────────
  if (run && run.status === 'finished') {
    const isFocus = run.mode === 'focus'
    return (
      <div>
        <PageHeader eyebrow="{isFocus ? 'Enfoque' : 'Pausa'}" title="{isFocus ? (run.completed ? 'Lo lograste' : 'Cerraste la ronda') : 'Pausa terminada'}" />
        <ErrorBar msg={err || inbox.error || sessions.error} onClose={() => setErr('')} />
        {isFocus && <p className="mt-2" style={{ color: 'var(--ink-soft)' }}>{run.actualMin} min de enfoque{run.task && ` en “${run.task}”`}{run.distractions > 0 && ` · anotaste ${run.distractions} ${run.distractions === 1 ? 'idea' : 'ideas'} sin salirte de la tarea`}.</p>}

        {isFocus && pending.length > 0 && (
          <section className="mt-8" aria-labelledby="park-h">
            <h2 id="park-h" className="font-display text-2xl">Lo que anotaste</h2>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>Decide qué hacer con cada cosa, o déjalas en tu bandeja para después.</p>
            <ul className="mt-3 grid gap-2">
              {pending.map((i) => (
                <li key={i.id} className="rounded-xl border p-3" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
                  <p className="text-sm"><span className="mr-2 rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--surface-2)', color: 'var(--sky)' }}>{CAPTURE_LABEL[(i.kind as keyof typeof CAPTURE_LABEL) in CAPTURE_LABEL ? (i.kind as keyof typeof CAPTURE_LABEL) : 'note']}</span>{i.text}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button className="btn btn-ghost" onClick={() => toTask(i)}>Hacer tarea</button>
                    <button className="btn btn-ghost" onClick={() => inbox.update(i.id, { processed: true })}>Es una nota</button>
                    <button className="btn btn-ghost" onClick={() => inbox.remove(i.id)}>Descartar</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {isFocus && picks.length > 0 && (
          <section className="mt-8" aria-labelledby="dop-h">
            <h2 id="dop-h" className="font-display text-2xl">Para tu pausa</h2>
            <ul className="mt-3 grid gap-2">{picks.map((p) => <li key={p} className="rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--surface)' }}>{p}</li>)}</ul>
            <button className="mt-2 min-h-11 text-sm underline" style={{ color: 'var(--ink-soft)' }} onClick={() => setPicks(pickDopamine(dop.items, 3))}>Otras ideas</button>
          </section>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          {isFocus && <button className="btn btn-primary" onClick={() => start(5, 'break')}>Pausa de 5 min</button>}
          {isFocus && run.plannedMin <= 2 && <button className="btn btn-primary" onClick={() => start(25, 'focus', run.task)}>Seguir 25 min</button>}
          <button className="btn btn-ghost" onClick={() => start(isFocus ? run.plannedMin : 25, 'focus', run.task)}>Otra ronda</button>
          <button className="btn btn-ghost" onClick={() => setRun(null)}>Terminar por hoy</button>
        </div>
      </div>
    )
  }

  // ───────── Preparar ─────────
  const open = pr.tasks.filter((t) => !t.done)
  return (
    <div>
      <p className="eyebrow">Mente y cuerpo</p>
      <h1 className="mt-2 font-display text-4xl">Enfoque</h1>
      <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--ink-soft)' }}>Una cosa, un tiempo. Lo que se te ocurra en medio lo anotas y sigues.</p>
      <ErrorBar msg={err || sessions.error || inbox.error} onClose={() => setErr('')} />

      <dl className="mt-6 grid grid-cols-3 gap-3 rounded-2xl border p-4 text-sm" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
        <div><dt className="text-xs" style={{ color: 'var(--ink-faint)' }}>Hoy</dt><dd className="mt-1 font-semibold">{stats.todayMin} min</dd></div>
        <div><dt className="text-xs" style={{ color: 'var(--ink-faint)' }}>Últimos 7 días</dt><dd className="mt-1 font-semibold">{stats.weekMin} min</dd></div>
        <div><dt className="text-xs" style={{ color: 'var(--ink-faint)' }}>Notas por ronda</dt><dd className="mt-1 font-semibold">{stats.avgDistractions}</dd></div>
      </dl>

      <div className="mt-6 grid gap-5">
        <label className="grid gap-2 text-sm">¿En qué te vas a enfocar?
          <input className="field" value={task} onChange={(e) => setTask(e.target.value)} maxLength={300} placeholder="Terminar la sección de contacto" />
        </label>
        {open.length > 0 && <div className="-mt-2 flex flex-wrap gap-2" aria-label="Tus prioridades de hoy">{open.map((t) => <button key={t.id} type="button" className="min-h-11 rounded-full border px-3 text-sm" style={chip(task === t.title)} onClick={() => setTask(t.title)}>{t.title}</button>)}</div>}

        <fieldset>
          <legend className="mb-2 text-sm">Cuánto tiempo</legend>
          <div className="flex flex-wrap items-center gap-2">
            {DURATIONS.map((m) => <button key={m} type="button" aria-pressed={minutes === m && !custom} onClick={() => { setMinutes(m); setCustom('') }} className="min-h-11 rounded-full border px-4 text-sm" style={chip(minutes === m && !custom)}>{m} min</button>)}
            <input className="field !w-24" inputMode="numeric" value={custom} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 3); setCustom(v); if (Number(v) > 0) setMinutes(Math.min(240, Number(v))) }} placeholder="Otro" aria-label="Minutos personalizados" />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm">Sonido</legend>
          <div className="flex flex-wrap gap-2">{SOUNDS.map((s) => <button key={s.id} type="button" aria-pressed={sound === s.id} onClick={() => setSound(s.id)} className="min-h-11 rounded-full border px-4 text-sm" style={chip(sound === s.id, 'var(--sky)')}>{s.label}</button>)}</div>
        </fieldset>
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5" checked={companion} onChange={(e) => setCompanion(e.target.checked)} /> Que me acompañe el avatar mientras trabajo</label>

        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary min-h-14 px-8 text-lg" onClick={() => start(minutes)}><Play size={20} aria-hidden /> Empezar {minutes} min</button>
          <button className="btn btn-ghost min-h-14" onClick={() => start(2)}>Solo 2 minutos</button>
        </div>
        <p className="-mt-2 text-xs" style={{ color: 'var(--ink-faint)' }}>¿Cuesta arrancar? Prueba 2 minutos. Al terminar decides si sigues.</p>
      </div>

      {pending.length > 0 && <p className="mt-8 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--surface)', color: 'var(--ink-soft)' }}>Tienes {pending.length} {pending.length === 1 ? 'nota' : 'notas'} sin clasificar de rondas anteriores. Se muestran al terminar la siguiente.</p>}

      <details className="mt-8 rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
        <summary className="min-h-11 cursor-pointer py-2 font-semibold">Menú de pausas (opcional)</summary>
        <label className="mt-2 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5" checked={dop.enabled} onChange={(e) => saveDop({ ...dop, enabled: e.target.checked })} /> Sugerirme algo al terminar cada ronda</label>
        <label className="mt-2 grid gap-2 text-sm">Tus opciones, una por línea
          <textarea className="field py-3" rows={5} value={dop.items.join('\n')} onChange={(e) => setDop({ ...dop, items: e.target.value.split('\n').slice(0, 30) })} onBlur={() => saveDop({ ...dop, items: dop.items.map((x) => x.trim()).filter(Boolean).slice(0, 30) })} />
        </label>
      </details>
    </div>
  )
}
