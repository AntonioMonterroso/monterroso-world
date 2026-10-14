import type { Goal } from './finance'
import { dayNum, isoFromNum } from './recur'

/** Ahorro: el dinero apartado para metas no se toca, y si se toca, queda dicho por qué. */
export type ReasonKind = 'emergency' | 'planned' | 'other'
export type Move = { id: string; goal_id: string; account_id: string; amount: number; tx_date: string; reason?: string | null; reason_kind?: ReasonKind | null; plan_id?: string | null }
export type Plan = { id: string; goal_id: string; account_id: string | null; amount: number; planned_for: string; reason: string; status: 'pending' | 'done' | 'cancelled'; event_id?: string | null }

export const REASONS: { id: ReasonKind; label: string; hint: string }[] = [
  { id: 'emergency', label: 'Emergencia', hint: 'Algo imprevisto que no podía esperar' },
  { id: 'planned', label: 'Compra planeada', hint: 'Era para esto, ya llegó el momento' },
  { id: 'other', label: 'Otro motivo', hint: 'Escríbelo para acordarte después' },
]
export const reasonLabel = (k?: ReasonKind | null) => REASONS.find((r) => r.id === k)?.label ?? ''

const r2 = (n: number) => Math.round(n * 100) / 100
export const isWithdrawal = (m: Pick<Move, 'amount'>) => Number(m.amount) < 0

export type Summary = { saved: number; target: number; pct: number; deposited: number; withdrawn: number; net: number; withdrawals: number }
/** Lo ahorrado en total y lo que entró y salió en un mes (YYYY-MM). */
export function summarize(goals: Pick<Goal, 'saved' | 'target'>[], moves: Pick<Move, 'amount' | 'tx_date'>[], month: string): Summary {
  const saved = r2(goals.reduce((s, g) => s + Number(g.saved), 0))
  const target = r2(goals.reduce((s, g) => s + Number(g.target), 0))
  const inMonth = moves.filter((m) => m.tx_date.startsWith(month))
  const deposited = r2(inMonth.filter((m) => !isWithdrawal(m)).reduce((s, m) => s + Number(m.amount), 0))
  const withdrawn = r2(Math.abs(inMonth.filter(isWithdrawal).reduce((s, m) => s + Number(m.amount), 0)))
  return { saved, target, pct: target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0, deposited, withdrawn, net: r2(deposited - withdrawn), withdrawals: inMonth.filter(isWithdrawal).length }
}

export type Impact = { newSaved: number; newPct: number; lostPct: number; tooMuch: boolean; big: boolean }
/** Qué le pasa a la meta si sacas `amount`: se avisa antes de confirmar. "big" = más de la mitad de lo ahorrado. */
export function withdrawalImpact(goal: Pick<Goal, 'saved' | 'target'>, amount: number): Impact {
  const saved = Number(goal.saved), target = Number(goal.target)
  const real = Math.min(Math.max(0, amount), saved)
  const pct = (v: number) => (target > 0 ? Math.min(100, Math.round((v / target) * 100)) : 0)
  return { newSaved: r2(saved - real), newPct: pct(saved - real), lostPct: pct(saved) - pct(saved - real), tooMuch: amount > saved, big: saved > 0 && real / saved > 0.5 }
}

export type Pace = { perMonth: number; monthsLeft: number | null; eta: string | null; onTrack: boolean | null }
/** A qué ritmo vas: promedio de aportes netos de los últimos 3 meses, cuándo llegarías y si es a tiempo. */
export function paceOf(goal: Pick<Goal, 'saved' | 'target' | 'due_date'>, moves: Pick<Move, 'amount' | 'tx_date'>[], today: string): Pace {
  const end = today.slice(0, 7)
  const [y, m] = end.split('-').map(Number)
  const months = [0, 1, 2].map((i) => { const d = new Date(y, m - 1 - i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })
  const net = moves.filter((x) => months.some((k) => x.tx_date.startsWith(k))).reduce((s, x) => s + Number(x.amount), 0)
  const perMonth = r2(Math.max(0, net / 3))
  const left = Math.max(0, Number(goal.target) - Number(goal.saved))
  if (left === 0) return { perMonth, monthsLeft: 0, eta: today, onTrack: true }
  if (perMonth <= 0) return { perMonth: 0, monthsLeft: null, eta: null, onTrack: goal.due_date ? false : null }
  const monthsLeft = Math.ceil(left / perMonth)
  const eta = isoFromNum(dayNum(today) + monthsLeft * 30)
  return { perMonth, monthsLeft, eta, onTrack: goal.due_date ? eta <= goal.due_date : null }
}

/** Fondo de emergencia sugerido: tres meses de lo que sueles gastar (redondeado a la centena). */
export const emergencyTarget = (avgMonthlyExpense: number) => (avgMonthlyExpense > 0 ? Math.ceil((avgMonthlyExpense * 3) / 100) * 100 : 0)

/** Retiros planeados que ya tocan (hoy o antes) y siguen esperando tu confirmación. */
export const duePlans = (plans: Plan[], today: string) => plans.filter((p) => p.status === 'pending' && p.planned_for <= today).sort((a, b) => a.planned_for.localeCompare(b.planned_for))
export const pendingPlans = (plans: Plan[]) => plans.filter((p) => p.status === 'pending').sort((a, b) => a.planned_for.localeCompare(b.planned_for))
