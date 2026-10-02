import type { Goal } from './finance'
import { dayNum } from './recur'

export type Spotlight = {
  goal: Goal
  pct: number
  remaining: number
  done: boolean
  /** Cuánto apartar por semana para llegar a tiempo; solo si la meta tiene fecha futura. */
  perWeek: number | null
  daysLeft: number | null
  message: string
}

const r2 = (n: number) => Math.round(n * 100) / 100

export function messageFor(pct: number, evening = false): string {
  if (pct >= 100) return '¡Meta lograda! Te lo ganaste.'
  if (pct >= 75) return 'Ya casi. Te falta muy poco.'
  if (pct >= 50) return 'Pasaste la mitad. Sigue así.'
  if (pct >= 25) return 'Vas bien: ya llevas un buen pedazo.'
  if (pct > 0) return 'Ya arrancaste, lo difícil es empezar.'
  return evening ? 'Antes de cerrar el día: aparta aunque sea un poco.' : 'Empieza con lo que puedas: cada quetzal cuenta.'
}

/** Elige la meta a destacar: la que vence primero; si no hay fechas, la más avanzada. Si todas están cumplidas, celebra la última. */
export function pickGoal(goals: Goal[], today: string, evening = false): Spotlight | null {
  if (goals.length === 0) return null
  const pctOf = (g: Goal) => (g.target > 0 ? Math.min(100, Math.round((Number(g.saved) / Number(g.target)) * 100)) : 0)
  const open = goals.filter((g) => pctOf(g) < 100)
  const pool = open.length ? open : goals
  const goal = [...pool].sort((a, b) => {
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
    if (a.due_date) return -1
    if (b.due_date) return 1
    return pctOf(b) - pctOf(a)
  })[open.length ? 0 : pool.length - 1]
  const pct = pctOf(goal)
  const remaining = Math.max(0, r2(Number(goal.target) - Number(goal.saved)))
  const daysLeft = goal.due_date ? dayNum(goal.due_date) - dayNum(today) : null
  const perWeek = daysLeft !== null && daysLeft > 0 && remaining > 0 ? r2(remaining / Math.max(1, Math.ceil(daysLeft / 7))) : null
  return { goal, pct, remaining, done: pct >= 100, perWeek, daysLeft, message: messageFor(pct, evening) }
}
