import { Check, Loader2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { cleanEntries, firstNumber, type Entry, type Partner, type Workout, type WorkoutItem, type WorkoutLog } from '../../lib/fitness'
import { supabase } from '../../lib/supabase'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'

type SetRow = { reps: string; weight: string; done: boolean }
type Plan = Record<string, SetRow[][]> // personKey → ejercicio → series

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/** Sesión de entrenamiento: marca cada serie, descansa con cronómetro y guarda el registro (tuyo y, si hay, del compañero). */
export default function Session() {
  const { id } = useParams()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const ws = useTable<Workout>('workouts', { col: 'created_at', asc: true })
  const its = useTable<WorkoutItem>('workout_items', { col: 'position', asc: true })
  const logs = useTable<WorkoutLog>('workout_logs', { col: 'performed_on', asc: false })
  const partners = useTable<Partner>('training_partners', { col: 'name', asc: true })
  const w = ws.rows.find((x) => x.id === id)
  const items = useMemo(() => its.rows.filter((i) => i.workout_id === id).sort((a, b) => a.position - b.position), [its.rows, id])
  const partner = partners.rows.find((p) => p.id === sp.get('con'))

  const people = useMemo(() => [{ key: 'me', name: 'Yo', partnerId: null as string | null }, ...(partner ? [{ key: partner.id, name: partner.name, partnerId: partner.id }] : [])], [partner])
  const [who, setWho] = useState('me')
  const [plan, setPlan] = useState<Plan>({})
  const [start] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [rest, setRest] = useState(0)
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const built = useRef('')

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  useEffect(() => {
    if (rest <= 0) return
    const t = setTimeout(() => { setRest((r) => { if (r === 1) navigator.vibrate?.([200, 100, 200]); return r - 1 }) }, 1000)
    return () => clearTimeout(t)
  }, [rest])

  // Arma las series con los valores de la rutina, usando el último peso real de cada persona si existe
  useEffect(() => {
    if (!w || items.length === 0 || logs.loading) return
    const sig = `${w.id}|${items.map((i) => i.id).join(',')}|${people.map((p) => p.key).join(',')}`
    if (built.current === sig) return
    built.current = sig
    const next: Plan = {}
    for (const p of people) {
      const mine = logs.rows.filter((l) => l.partner_id === p.partnerId)
      next[p.key] = items.map((it) => {
        const last = mine.flatMap((l) => l.entries).find((e) => e.name.toLowerCase() === it.name.toLowerCase())
        const lastW = last?.sets.find((s) => s.weight)?.weight
        const weight = lastW ?? it.weight
        return Array.from({ length: it.sets }, () => ({ reps: String(firstNumber(it.reps)), weight: weight == null ? '' : String(weight), done: false }))
      })
    }
    setPlan(next)
  }, [w, items, people, logs.rows, logs.loading])

  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    navigator.wakeLock?.request('screen').then((l) => { lock = l }).catch(() => {})
    return () => { lock?.release().catch(() => {}) }
  }, [])

  if (ws.loading || its.loading) return <div className="fixed inset-0 z-50 grid place-items-center" style={{ background: 'var(--bg)' }}><Loader2 className="animate-spin" aria-label="Cargando" /></div>
  if (!w) return <div className="fixed inset-0 z-50 grid place-items-center" style={{ background: 'var(--bg)' }}><p>No encontré esta rutina.</p></div>

  const rows = plan[who] ?? []
  const upd = (ei: number, si: number, patch: Partial<SetRow>) => setPlan((p) => ({ ...p, [who]: (p[who] ?? []).map((sets, i) => (i === ei ? sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) : sets)) }))

  const toggle = (ei: number, si: number) => {
    const s = rows[ei][si]
    upd(ei, si, { done: !s.done })
    if (!s.done && items[ei].rest_sec) setRest(items[ei].rest_sec!)
  }

  const finish = async () => {
    const sessionKey = crypto.randomUUID()
    const duration = Math.max(1, Math.round((Date.now() - start) / 60000))
    const batch = people.map((p) => {
      const entries: Entry[] = cleanEntries(items.map((it, i) => ({ name: it.name, sets: (plan[p.key]?.[i] ?? []).filter((s) => s.done).map((s) => ({ reps: Number(s.reps) || 0, weight: s.weight.trim() === '' ? null : Number(s.weight.replace(',', '.')) })) })))
      return { p, entries }
    }).filter((b) => b.entries.length > 0)
    if (batch.length === 0) return setErr('Marca al menos una serie como hecha para guardar.')
    setSaving(true); setErr('')
    const { error } = await supabase.from('workout_logs').insert(batch.map(({ p, entries }) => ({ partner_id: p.partnerId, workout_id: w.id, session_key: batch.length > 1 ? sessionKey : null, title: w.title, performed_on: localISO(), duration_min: Math.min(600, duration), entries, notes: notes.trim() || null })))
    setSaving(false)
    if (error) return setErr('No se pudo guardar el entrenamiento.')
    nav('/app/ejercicio/historial')
  }

  const doneCount = rows.flat().filter((s) => s.done).length
  const total = rows.flat().length

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#08111f' }}>
      <div className="flex items-center gap-2 px-3 py-2">
        <button className="grid size-11 place-items-center rounded-full" onClick={() => nav(`/app/ejercicio/rutina/${w.id}`)} aria-label="Salir sin guardar"><X size={22} aria-hidden /></button>
        <div className="min-w-0 flex-1"><p className="truncate font-semibold">{w.title}</p><p className="text-xs" style={{ color: 'var(--ink-soft)' }}>{mmss(Math.floor((now - start) / 1000))} · {doneCount}/{total} series</p></div>
        {people.length > 1 && (
          <div className="inline-flex rounded-full p-1" style={{ background: 'var(--surface)' }} role="tablist" aria-label="Persona">
            {people.map((p) => <button key={p.key} role="tab" aria-selected={who === p.key} onClick={() => setWho(p.key)} className="min-h-10 rounded-full px-3 text-sm font-semibold" style={{ background: who === p.key ? 'var(--accent)' : 'transparent', color: who === p.key ? 'var(--bg)' : 'var(--ink-soft)' }}>{p.name}</button>)}
          </div>
        )}
      </div>
      {rest > 0 && <div role="timer" aria-live="off" className="mx-3 mb-2 flex items-center justify-between rounded-xl px-4 py-2" style={{ background: 'color-mix(in oklab, var(--music) 18%, transparent)' }}><span className="text-sm">Descanso</span><span className="font-display text-2xl">{mmss(rest)}</span><button className="min-h-11 px-2 text-sm underline" onClick={() => setRest(0)}>Saltar</button></div>}

      <div className="flex-1 overflow-y-auto px-3 pb-6">
        <div className="mx-auto grid max-w-2xl gap-4">
          {items.length === 0 && <p className="mt-6 text-center" style={{ color: 'var(--ink-soft)' }}>Esta rutina no tiene ejercicios. Agrégalos primero.</p>}
          {items.map((it, ei) => (
            <section key={it.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }} aria-label={it.name}>
              <h2 className="font-display text-xl">{it.name}</h2>
              <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{it.sets} × {it.reps}{it.rest_sec ? ` · descanso ${it.rest_sec}s` : ''}</p>
              <ol className="mt-3 grid gap-2">
                {(rows[ei] ?? []).map((s, si) => (
                  <li key={si} className="flex items-center gap-2" style={{ opacity: s.done ? 0.6 : 1 }}>
                    <span className="w-6 text-center text-sm" style={{ color: 'var(--ink-faint)' }}>{si + 1}</span>
                    <label className="flex flex-1 items-center gap-1 text-xs"><input className="field" inputMode="numeric" value={s.reps} onChange={(e) => upd(ei, si, { reps: e.target.value.replace(/\D/g, '') })} aria-label={`Repeticiones, serie ${si + 1}`} />reps</label>
                    <label className="flex flex-1 items-center gap-1 text-xs"><input className="field" inputMode="decimal" value={s.weight} onChange={(e) => upd(ei, si, { weight: e.target.value })} aria-label={`Peso, serie ${si + 1}`} />peso</label>
                    <button onClick={() => toggle(ei, si)} aria-pressed={s.done} aria-label={s.done ? 'Desmarcar serie' : 'Marcar serie hecha'} className="grid size-12 shrink-0 place-items-center rounded-full border" style={{ borderColor: '#8fd1a4', background: s.done ? '#8fd1a4' : 'transparent', color: 'var(--bg)' }}>{s.done && <Check size={20} aria-hidden />}</button>
                  </li>
                ))}
              </ol>
            </section>
          ))}
          <label className="grid gap-2 text-sm">Notas<textarea className="field py-3" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} placeholder="Cómo te sentiste" /></label>
          {err && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>{err}</p>}
          <button className="btn btn-primary min-h-14 justify-center text-lg" onClick={finish} disabled={saving || items.length === 0}>{saving && <Loader2 size={18} className="animate-spin" aria-hidden />} Terminar y guardar</button>
        </div>
      </div>
    </div>
  )
}
