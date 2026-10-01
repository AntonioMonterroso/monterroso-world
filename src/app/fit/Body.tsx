import { Droplets, Loader2, Minus, Moon, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../lib/auth'
import { SLEEP_GOAL, WATER_GOAL, weightChange, type BodyMetric, type HealthDay } from '../../lib/fitness'
import { dayNum, isoFromNum } from '../../lib/recur'
import { getSettings, patchSettings } from '../../lib/settings'
import { supabase } from '../../lib/supabase'
import { useTable } from '../../lib/table'
import { localISO } from '../../lib/time'
import { ErrorBar, toNum } from '../money/shared'

export default function Body() {
  const { session } = useAuth()
  const metrics = useTable<BodyMetric>('body_metrics', { col: 'measured_on', asc: false })
  const health = useTable<HealthDay>('health_days', { col: 'day', asc: false })
  const today = localISO()
  const [kg, setKg] = useState('')
  const [date, setDate] = useState(today)
  const [goal, setGoal] = useState('')
  const [err, setErr] = useState('')
  const [sleep, setSleep] = useState('')

  useEffect(() => { getSettings().then((s) => { const g = (s as { bodyGoal?: number }).bodyGoal; if (g) setGoal(String(g)) }) }, [])

  const todayRow = health.rows.find((h) => h.day === today)
  useEffect(() => { setSleep(todayRow?.sleep_hours != null ? String(todayRow.sleep_hours) : '') }, [todayRow?.sleep_hours])

  const setDay = async (patch: Partial<Pick<HealthDay, 'water_glasses' | 'sleep_hours'>>) => {
    const { error } = await supabase.from('health_days').upsert({ user_id: session?.user.id, day: today, water_glasses: todayRow?.water_glasses ?? 0, sleep_hours: todayRow?.sleep_hours ?? null, ...patch }, { onConflict: 'user_id,day' })
    if (error) setErr('No se guardó. Intenta de nuevo.')
  }

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => { const iso = isoFromNum(dayNum(today) - (6 - i)); return { iso, h: health.rows.find((x) => x.day === iso) } }), [health.rows, today])
  const change = weightChange(metrics.rows)
  const last = metrics.rows[0]
  const goalN = toNum(goal)

  const addWeight = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = toNum(kg)
    if (!(n >= 20 && n <= 400)) return setErr('Escribe un peso entre 20 y 400 kg.')
    setErr(''); await metrics.add({ measured_on: date, weight_kg: n, note: null }); setKg('')
  }

  if (metrics.loading || health.loading) return <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div>
  const water = todayRow?.water_glasses ?? 0

  return (
    <div>
      <p className="eyebrow">Ejercicio</p>
      <h1 className="mt-2 font-display text-4xl">Cuerpo y salud</h1>
      <ErrorBar msg={err || metrics.error || health.error} onClose={() => setErr('')} />

      <section className="mt-6 rounded-2xl border p-4" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }} aria-labelledby="hoy-s">
        <h2 id="hoy-s" className="font-display text-2xl">Hoy</h2>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Droplets size={20} aria-hidden style={{ color: 'var(--sky)' }} /><span className="text-sm">Agua</span></div>
          <div className="flex items-center gap-2">
            <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => setDay({ water_glasses: Math.max(0, water - 1) })} aria-label="Un vaso menos"><Minus size={16} aria-hidden /></button>
            <span className="min-w-20 text-center"><span className="font-display text-3xl">{water}</span><span className="text-sm" style={{ color: 'var(--ink-faint)' }}> / {WATER_GOAL}</span></span>
            <button className="grid size-11 place-items-center rounded-full border" style={{ borderColor: 'var(--line)' }} onClick={() => setDay({ water_glasses: Math.min(40, water + 1) })} aria-label="Un vaso más"><Plus size={16} aria-hidden /></button>
          </div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}><div className="h-full rounded-full" style={{ width: `${Math.min(100, (water / WATER_GOAL) * 100)}%`, background: 'var(--sky)', transition: 'width 300ms var(--ease-out)' }} /></div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Moon size={20} aria-hidden style={{ color: 'var(--music)' }} /><label htmlFor="sleep" className="text-sm">Sueño (horas)</label></div>
          <input id="sleep" className="field !w-24 text-center" inputMode="decimal" value={sleep} onChange={(e) => setSleep(e.target.value)} onBlur={() => { const n = toNum(sleep); if (sleep.trim() === '') setDay({ sleep_hours: null }); else if (n >= 0 && n <= 24) setDay({ sleep_hours: Math.round(n * 10) / 10 }) }} placeholder={String(SLEEP_GOAL)} />
        </div>

        <div className="mt-6 flex h-20 items-end gap-2" role="img" aria-label={`Agua y sueño de los últimos 7 días`}>
          {week.map(({ iso, h }) => (
            <div key={iso} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-14 w-full items-end gap-0.5">
                <div className="flex-1 rounded-t" style={{ height: `${Math.max(3, Math.min(1, (h?.water_glasses ?? 0) / WATER_GOAL) * 56)}px`, background: h?.water_glasses ? 'var(--sky)' : 'var(--surface-2)' }} />
                <div className="flex-1 rounded-t" style={{ height: `${Math.max(3, Math.min(1, (h?.sleep_hours ?? 0) / SLEEP_GOAL) * 56)}px`, background: h?.sleep_hours ? 'var(--music)' : 'var(--surface-2)', opacity: 0.7 }} />
              </div>
              <span className="text-[11px]" style={{ color: iso === today ? 'var(--accent)' : 'var(--ink-faint)' }}>{new Date(iso + 'T12:00:00').toLocaleDateString('es', { weekday: 'narrow' })}</span>
            </div>
          ))}
        </div>
        <p className="mt-1 flex gap-4 text-xs" style={{ color: 'var(--ink-faint)' }}><span><span style={{ color: 'var(--sky)' }}>●</span> Agua</span><span><span style={{ color: 'var(--music)' }}>●</span> Sueño</span></p>
      </section>

      <section className="mt-8" aria-labelledby="peso">
        <h2 id="peso" className="font-display text-2xl">Peso</h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
          {last ? `Último: ${last.weight_kg} kg` : 'Aún no hay mediciones.'}{change !== null && ` · ${change > 0 ? '+' : ''}${change} kg desde la primera`}{goalN > 0 && last && ` · te faltan ${Math.round(Math.abs(last.weight_kg - goalN) * 10) / 10} kg para ${goalN}`}
        </p>
        <form onSubmit={addWeight} className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
          <input className="field" inputMode="decimal" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="kg" aria-label="Peso en kilos" />
          <input type="date" className="field" value={date} max={today} onChange={(e) => setDate(e.target.value)} aria-label="Fecha" />
          <button className="btn btn-primary">Agregar</button>
        </form>
        <label className="mt-3 flex items-center gap-3 text-sm">Meta (kg)
          <input className="field !w-28" inputMode="decimal" value={goal} onChange={(e) => setGoal(e.target.value)} onBlur={() => { const n = toNum(goal); patchSettings({ bodyGoal: n > 0 ? n : undefined } as never) }} />
        </label>
        {metrics.rows.length > 0 && (
          <ul className="mt-4 grid gap-2">
            {metrics.rows.slice(0, 12).map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-xl px-4 py-2 text-sm" style={{ background: 'var(--surface)' }}>
                <span>{m.measured_on}</span><span className="font-semibold">{m.weight_kg} kg</span>
                <button className="grid size-11 place-items-center" onClick={() => metrics.remove(m.id)} aria-label="Eliminar medición"><Trash2 size={14} aria-hidden /></button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
