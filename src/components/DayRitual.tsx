import { BatteryFull, BatteryLow, BatteryMedium, BatteryWarning, Frown, Meh, Moon, Smile, Sunrise, Zap, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useCheckins } from '../lib/checkin'
import { ENERGY, MOOD, dayWins, energyMessage, ritualFor, type Checkin } from '../lib/rhythm'
import { useTable } from '../lib/table'
import { localISO } from '../lib/time'

const E_ICON: Record<number, LucideIcon> = { 1: BatteryWarning, 2: BatteryLow, 3: BatteryMedium, 4: BatteryFull, 5: Zap }
const M_ICON: Record<number, LucideIcon> = { 1: Frown, 3: Meh, 5: Smile }

type Props = { ck: ReturnType<typeof useCheckins>; hour: number; prioritiesDone: number; habitsDone: number; onAddPriority: (text: string) => void }

/** Arranque por la mañana, cierre por la noche; entre medias, solo el pulso de tu energía. */
export default function DayRitual({ ck, hour, prioritiesDone, habitsDone, onAddPriority }: Props) {
  const sessions = useTable<{ id: string; actual_min: number; started_at: string }>('focus_sessions', { col: 'started_at', asc: false })
  const runs = useTable<{ id: string; day: string; completed: boolean }>('routine_runs', { col: 'day', asc: false })
  const deliveries = useTable<{ id: string; sent_at: string | null }>('deliveries', { col: 'created_at', asc: false })
  const today = localISO()
  const ritual = ritualFor(hour)
  const t = ck.today
  const [win, setWin] = useState('')
  const [tomorrow, setTomorrow] = useState('')
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)
  useEffect(() => { setWin(t?.win ?? ''); setTomorrow(t?.tomorrow ?? '') }, [t?.win, t?.tomorrow])

  const wins = useMemo(() => dayWins({
    prioritiesDone, habitsDone,
    focusMin: sessions.rows.filter((s) => s.started_at.slice(0, 10) === today || new Date(s.started_at).toLocaleDateString('en-CA') === today).reduce((a, s) => a + (s.actual_min ?? 0), 0),
    routinesDone: runs.rows.filter((r) => r.day === today && r.completed).length,
    deliveriesSent: deliveries.rows.filter((d) => d.sent_at && new Date(d.sent_at).toLocaleDateString('en-CA') === today).length,
  }), [prioritiesDone, habitsDone, sessions.rows, runs.rows, deliveries.rows, today])

  if (ck.loading) return null
  const pickEnergy = (n: number) => { void ck.save({ energy: n }); setEditing(false) }
  const showPicker = t?.energy == null || editing
  const Icon = ritual === 'close' ? Moon : ritual === 'start' ? Sunrise : Zap
  const title = ritual === 'close' ? 'Cierre del día' : ritual === 'start' ? 'Arranque del día' : 'Tu energía'
  const carry = ritual === 'start' ? ck.yesterday?.tomorrow : null

  const closeDay = async () => {
    await ck.save({ win: win.trim() || null, tomorrow: tomorrow.trim() || null })
    setSaved(true); setTimeout(() => setSaved(false), 5000)
  }

  return (
    <section className="ritual" aria-labelledby="ritual-t" data-ritual={ritual ?? 'mid'}>
      <div className="ritual-head">
        <span className="ritual-ico" aria-hidden><Icon size={18} /></span>
        <div className="min-w-0">
          <h2 id="ritual-t" className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>{energyMessage(t?.energy ?? null)}</p>
        </div>
        {!showPicker && <button className="ml-auto min-h-11 shrink-0 px-2 text-sm underline" style={{ color: 'var(--ink-soft)' }} onClick={() => setEditing(true)}>Cambiar</button>}
      </div>

      {showPicker && (
        <div className="mt-3">
          <p className="text-xs font-semibold" style={{ color: 'var(--ink-faint)' }}>¿Cómo va tu energía?</p>
          <div className="energy" role="group" aria-label="Energía de hoy">
            {ENERGY.map((e) => { const I = E_ICON[e.n]; return <button key={e.n} type="button" className="energy-btn" aria-pressed={t?.energy === e.n} onClick={() => pickEnergy(e.n)}><I size={20} aria-hidden /><span>{e.label}</span></button> })}
          </div>
        </div>
      )}

      {t?.energy != null && !editing && (
        <div className="mt-3 flex items-center gap-2" role="group" aria-label="Ánimo de hoy">
          <span className="text-xs font-semibold" style={{ color: 'var(--ink-faint)' }}>Ánimo</span>
          {MOOD.map((m) => { const I = M_ICON[m.n]; return <button key={m.n} type="button" className="mood-btn" aria-pressed={t.mood === m.n} aria-label={m.label} onClick={() => void ck.save({ mood: m.n })}><I size={20} aria-hidden /></button> })}
        </div>
      )}

      {carry && (
        <div className="ritual-note">
          <p className="text-xs font-semibold" style={{ color: 'var(--ink-faint)' }}>Ayer dejaste para hoy</p>
          <p className="mt-0.5 text-sm">{carry}</p>
          <button className="btn btn-tint mt-2 !min-h-10" onClick={() => onAddPriority(carry)}>Hacerla prioridad</button>
        </div>
      )}

      {ritual === 'close' && (
        <div className="mt-4 grid gap-3">
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--ink-faint)' }}>Hoy lograste</p>
            <ul className="mt-1.5 grid gap-1">{wins.map((w) => <li key={w} className="flex items-center gap-2 text-sm"><span className="size-1.5 shrink-0 rounded-full" style={{ background: 'var(--pos)' }} aria-hidden />{w}</li>)}</ul>
          </div>
          <label className="grid gap-1.5 text-sm">¿Qué fue lo mejor de hoy?<input className="field" value={win} maxLength={500} onChange={(e) => setWin(e.target.value)} placeholder="Algo pequeño también vale" /></label>
          <label className="grid gap-1.5 text-sm">¿Qué queda para mañana?<input className="field" value={tomorrow} maxLength={500} onChange={(e) => setTomorrow(e.target.value)} placeholder="Una sola cosa, la primera" /></label>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary" onClick={closeDay}>Cerrar el día</button>
            {saved && <p role="status" className="text-sm" style={{ color: 'var(--pos)' }}>Listo. Descansa, mañana te lo recuerdo.</p>}
          </div>
        </div>
      )}
    </section>
  )
}

export type { Checkin }
