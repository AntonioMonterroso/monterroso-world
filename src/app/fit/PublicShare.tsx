import { Loader2, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import Globe from '../../components/Globe'
import Sheet from '../../components/Sheet'
import { firstNumber, volume, type Entry } from '../../lib/fitness'
import { isValidToken } from '../../lib/share'
import { supabase } from '../../lib/supabase'
import { localISO } from '../../lib/time'

type Item = { name: string; sets: number; reps: string; weight: number | null; rest_sec: number | null; notes: string | null }
type SharedWorkout = { id: string; title: string; notes: string | null; items: Item[] }
type SharedLog = { id: string; title: string; performed_on: string; duration_min: number | null; entries: Entry[]; notes: string | null }
type Data = { partner: { name: string }; canLog: boolean; workouts: SharedWorkout[]; logs: SharedLog[] }
type Fail = 'invalid' | 'locked' | 'pin_required' | 'pin_wrong' | 'network'

type Row = { reps: string; weight: string }

async function call(body: Record<string, unknown>): Promise<{ ok: true; data: unknown } | { ok: false; error: Fail }> {
  const { data, error } = await supabase.functions.invoke('share', { body })
  if (!error) return { ok: true, data }
  const ctx = (error as { context?: Response }).context
  const json = await ctx?.json?.().catch(() => null) as { error?: string } | null
  const e = json?.error
  return { ok: false, error: e === 'locked' || e === 'pin_required' || e === 'pin_wrong' || e === 'invalid' ? e : 'network' }
}

/** Panel público de un compañero: se entra solo con el enlace (y el PIN si lo tiene). */
export default function PublicShare() {
  const { token = '' } = useParams()
  const [data, setData] = useState<Data | null>(null)
  const [fail, setFail] = useState<Fail | null>(null)
  const [loading, setLoading] = useState(true)
  const [pin, setPin] = useState(() => { try { return sessionStorage.getItem(`pin_${token}`) ?? '' } catch { return '' } })
  const [tab, setTab] = useState<'routines' | 'history'>('routines')
  const [logFor, setLogFor] = useState<SharedWorkout | 'free' | null>(null)

  const load = useCallback(async (p: string) => {
    setLoading(true)
    const r = await call({ action: 'get', token, pin: p || undefined })
    setLoading(false)
    if (r.ok) { setData(r.data as Data); setFail(null); try { if (p) sessionStorage.setItem(`pin_${token}`, p) } catch { /* sin almacenamiento */ } }
    else { setFail(r.error); if (r.error === 'pin_wrong') { try { sessionStorage.removeItem(`pin_${token}`) } catch { /* nada */ } } }
  }, [token])

  useEffect(() => { if (isValidToken(token)) load(pin); else { setLoading(false); setFail('invalid') } }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const shell = (children: React.ReactNode) => (
    <main className="safe-top mx-auto min-h-dvh max-w-xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2 font-display text-lg"><Globe size={26} /> Entrenamiento</div>
      {children}
    </main>
  )

  if (loading && !data) return shell(<div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>)

  if (fail === 'invalid') return shell(<div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}><p className="font-display text-2xl">Este enlace ya no funciona</p><p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>Pudo caducar o ser revocado. Pídele uno nuevo a quien te lo compartió.</p></div>)
  if (fail === 'locked') return shell(<div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}><p className="font-display text-2xl">Demasiados intentos</p><p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>Espera 15 minutos y vuelve a probar.</p></div>)
  if (fail === 'network') return shell(<div className="rounded-2xl border p-6 text-center" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}><p className="font-display text-2xl">No pude conectar</p><button className="btn btn-primary mt-4" onClick={() => load(pin)}>Reintentar</button></div>)

  if (!data) {
    return shell(
      <form className="grid gap-4 rounded-2xl border p-6" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }} onSubmit={(e) => { e.preventDefault(); load(pin) }}>
        <h1 className="font-display text-3xl">Escribe tu PIN</h1>
        <input className="field text-center text-2xl tracking-[0.4em]" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} aria-label="PIN" autoFocus />
        {fail === 'pin_wrong' && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>PIN incorrecto.</p>}
        <button className="btn btn-primary justify-center" disabled={pin.length < 4}>Entrar</button>
      </form>,
    )
  }

  return shell(
    <>
      <h1 className="font-display text-4xl">Hola, {data.partner.name}</h1>
      <div className="mt-5 inline-flex rounded-full p-1" style={{ background: 'var(--surface)' }} role="tablist">
        {([['routines', 'Rutinas'], ['history', 'Mi historial']] as const).map(([v, l]) => <button key={v} role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className="min-h-11 rounded-full px-5 text-sm font-semibold" style={{ background: tab === v ? 'var(--accent)' : 'transparent', color: tab === v ? 'var(--bg)' : 'var(--ink-soft)' }}>{l}</button>)}
      </div>

      {tab === 'routines' ? (
        <div className="mt-6 grid gap-4">
          {data.workouts.length === 0 && <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Todavía no te compartieron rutinas.</p>}
          {data.workouts.map((w) => (
            <section key={w.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }} aria-label={w.title}>
              <h2 className="font-display text-2xl">{w.title}</h2>
              {w.notes && <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>{w.notes}</p>}
              <ol className="mt-3 grid gap-1 text-sm">{w.items.map((it, i) => <li key={i} className="flex justify-between gap-3 border-b py-2" style={{ borderColor: 'var(--line-soft)' }}><span>{it.name}</span><span style={{ color: 'var(--ink-soft)' }}>{it.sets} × {it.reps}{it.weight ? ` · ${it.weight}` : ''}</span></li>)}</ol>
              {data.canLog && <button className="btn btn-primary mt-4" onClick={() => setLogFor(w)}><Plus size={16} aria-hidden /> Registrar entrenamiento</button>}
            </section>
          ))}
          {data.canLog && <button className="btn btn-ghost w-fit" onClick={() => setLogFor('free')}>Registrar entrenamiento libre</button>}
        </div>
      ) : (
        <ul className="mt-6 grid gap-2">
          {data.logs.length === 0 && <li className="text-sm" style={{ color: 'var(--ink-soft)' }}>Aún no hay sesiones registradas.</li>}
          {data.logs.map((l) => (
            <li key={l.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
              <p className="font-semibold">{l.title}</p>
              <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{l.performed_on}{l.duration_min && ` · ${l.duration_min} min`}{volume(l.entries) > 0 && ` · ${volume(l.entries).toLocaleString('es')} de volumen`}</p>
              <div className="mt-2 grid gap-1 text-sm">{l.entries.map((e, i) => <p key={i}><strong>{e.name}</strong> <span style={{ color: 'var(--ink-soft)' }}>{e.sets.map((s) => `${s.reps}${s.weight ? `×${s.weight}` : ''}`).join(' · ')}</span></p>)}</div>
            </li>
          ))}
        </ul>
      )}

      <LogSheet token={token} pin={pin} target={logFor} onClose={() => setLogFor(null)} onSaved={() => { setLogFor(null); setTab('history'); load(pin) }} />
    </>,
  )
}

function LogSheet({ token, pin, target, onClose, onSaved }: { token: string; pin: string; target: SharedWorkout | 'free' | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('')
  const [rows, setRows] = useState<{ name: string; sets: Row[] }[]>([])
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!target) return
    setErr(''); setDuration(''); setNotes('')
    if (target === 'free') { setTitle('Entrenamiento libre'); setRows([{ name: '', sets: [{ reps: '10', weight: '' }] }]) }
    else { setTitle(target.title); setRows(target.items.map((it) => ({ name: it.name, sets: Array.from({ length: it.sets }, () => ({ reps: String(firstNumber(it.reps)), weight: it.weight ? String(it.weight) : '' })) }))) }
  }, [target])

  const setCell = (i: number, j: number, patch: Partial<Row>) => setRows((r) => r.map((x, a) => (a === i ? { ...x, sets: x.sets.map((s, b) => (b === j ? { ...s, ...patch } : s)) } : x)))

  const save = async () => {
    const entries = rows.map((r) => ({ name: r.name.trim(), sets: r.sets.filter((s) => Number(s.reps) > 0).map((s) => ({ reps: Number(s.reps), weight: s.weight.trim() === '' ? null : Number(s.weight.replace(',', '.')) })) })).filter((e) => e.name && e.sets.length)
    if (!entries.length) return setErr('Anota al menos un ejercicio con repeticiones.')
    setBusy(true); setErr('')
    const r = await call({ action: 'log', token, pin: pin || undefined, workout_id: target && target !== 'free' ? target.id : undefined, title: title.trim() || 'Entrenamiento', performed_on: localISO(), duration_min: Number(duration) > 0 ? Math.round(Number(duration)) : undefined, entries, notes: notes.trim() || undefined })
    setBusy(false)
    if (!r.ok) return setErr('No se pudo guardar. Intenta de nuevo.')
    onSaved()
  }

  return (
    <Sheet open={Boolean(target)} title="Registrar entrenamiento" onClose={onClose}>
      <div className="grid gap-4">
        <label className="grid gap-2 text-sm">Nombre<input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></label>
        {rows.map((r, i) => (
          <fieldset key={i} className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
            {target === 'free' ? <input className="field" value={r.name} onChange={(e) => setRows((x) => x.map((y, a) => (a === i ? { ...y, name: e.target.value } : y)))} placeholder="Ejercicio" aria-label="Ejercicio" maxLength={120} /> : <legend className="px-1 font-semibold">{r.name}</legend>}
            <ol className="mt-2 grid gap-2">
              {r.sets.map((s, j) => (
                <li key={j} className="flex items-center gap-2 text-xs">
                  <span className="w-5 text-center" style={{ color: 'var(--ink-faint)' }}>{j + 1}</span>
                  <input className="field" inputMode="numeric" value={s.reps} onChange={(e) => setCell(i, j, { reps: e.target.value.replace(/\D/g, '') })} aria-label={`Repeticiones, serie ${j + 1}`} /> reps
                  <input className="field" inputMode="decimal" value={s.weight} onChange={(e) => setCell(i, j, { weight: e.target.value })} aria-label={`Peso, serie ${j + 1}`} /> peso
                </li>
              ))}
            </ol>
            <button type="button" className="mt-2 min-h-11 text-sm underline" onClick={() => setRows((x) => x.map((y, a) => (a === i ? { ...y, sets: [...y.sets, { ...y.sets.at(-1)! }] } : y)))}>+ Serie</button>
          </fieldset>
        ))}
        {target === 'free' && <button type="button" className="btn btn-ghost w-fit" onClick={() => setRows((x) => [...x, { name: '', sets: [{ reps: '10', weight: '' }] }])}><Plus size={16} aria-hidden /> Ejercicio</button>}
        <div className="grid grid-cols-2 gap-3"><label className="grid gap-2 text-sm">Duración (min)<input className="field" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value.replace(/\D/g, ''))} /></label></div>
        <label className="grid gap-2 text-sm">Notas<textarea className="field py-3" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} /></label>
        {err && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>{err}</p>}
        <button className="btn btn-primary w-fit" onClick={save} disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden />} Guardar</button>
      </div>
    </Sheet>
  )
}
