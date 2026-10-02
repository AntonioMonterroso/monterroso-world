import { Check, PiggyBank } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTable } from '../lib/table'
import type { Goal } from '../lib/finance'
import { pickGoal } from '../lib/goals'
import { money } from '../lib/projects'

const R = 30, C = 2 * Math.PI * R

/** La meta de ahorro que más conviene tener a la vista: avance, lo que falta y un empujón para sumar hoy. */
export default function GoalSpotlight({ today, evening }: { today: string; evening: boolean }) {
  const db = useTable<Goal>('savings_goals', { col: 'created_at', asc: true })
  const [adding, setAdding] = useState(false)
  const [amount, setAmount] = useState('')
  const [thanks, setThanks] = useState('')
  const s = useMemo(() => pickGoal(db.rows, today, evening), [db.rows, today, evening])
  if (db.loading || !s) return null

  const { goal, pct, remaining, done, perWeek, daysLeft, message } = s
  const color = done ? 'var(--pos)' : 'var(--accent)'

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = Number(amount.replace(',', '.'))
    if (!(n > 0)) return
    await db.update(goal.id, { saved: Math.round((Number(goal.saved) + n) * 100) / 100 })
    const left = Math.max(0, remaining - n)
    setThanks(left === 0 ? '¡Lo lograste! Esa meta ya es tuya.' : `Sumaste ${money(n)}. Te faltan ${money(left)}.`)
    setAmount(''); setAdding(false)
  }

  return (
    <section aria-labelledby="meta-hoy" className="goal" data-evening={evening} data-done={done}>
      <div className="goal-ring" aria-hidden>
        <svg viewBox="0 0 72 72" width="72" height="72">
          <circle cx="36" cy="36" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="7" />
          <circle cx="36" cy="36" r={R} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} transform="rotate(-90 36 36)" style={{ transition: 'stroke-dashoffset 700ms var(--ease-out), stroke 300ms var(--ease-out)' }} />
        </svg>
        <span>{done ? <Check size={22} strokeWidth={3} aria-hidden /> : `${pct}%`}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="eyebrow flex items-center gap-1.5"><PiggyBank size={14} aria-hidden /> {evening && !done ? 'Antes de dormir' : 'Tu meta de ahorro'}</p>
        <h2 id="meta-hoy" className="mt-0.5 truncate text-lg font-semibold tracking-tight">{goal.title}</h2>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          <strong style={{ color: 'var(--ink)' }}>{money(Number(goal.saved))}</strong> de {money(Number(goal.target))}{!done && <> · faltan {money(remaining)}</>}
        </p>
        <p className="mt-1 text-sm" style={{ color }} role="status">{thanks || message}</p>
        {!done && perWeek !== null && <p className="mt-0.5 text-xs" style={{ color: 'var(--ink-faint)' }}>{money(perWeek)} por semana te lleva a tiempo ({daysLeft} {daysLeft === 1 ? 'día' : 'días'}).</p>}
        {!done && daysLeft !== null && daysLeft <= 0 && <p className="mt-0.5 text-xs" style={{ color: 'var(--neg)' }}>La fecha ya pasó: puedes moverla en Metas.</p>}

        {adding ? (
          <form onSubmit={add} className="mt-3 flex gap-2">
            <label className="sr-only" htmlFor="goal-amt">Monto a sumar</label>
            <input id="goal-amt" autoFocus className="field !min-h-11" inputMode="decimal" placeholder="Cuánto sumas hoy" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button className="btn btn-primary shrink-0" disabled={!(Number(amount.replace(',', '.')) > 0)}>Sumar</button>
            <button type="button" className="btn btn-ghost shrink-0" onClick={() => setAdding(false)}>Cancelar</button>
          </form>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!done && <button className="btn btn-tint !min-h-10" onClick={() => { setThanks(''); setAdding(true) }}>Sumar un aporte</button>}
            <Link to="/app/dinero/metas" className="inline-flex min-h-10 items-center text-sm underline" style={{ color: 'var(--ink-soft)' }}>Ver mis metas</Link>
          </div>
        )}
      </div>
    </section>
  )
}
