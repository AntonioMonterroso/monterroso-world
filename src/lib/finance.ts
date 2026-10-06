import { dayNum, isoFromNum } from './recur'

export type Kind = 'income' | 'expense'
/** Clave de un área: 'web', 'music', 'personal' o una creada por ti. */
export type Area = string
export type Tx = { id: string; kind: Kind; amount: number; currency: string; category: string; area: Area; tx_date: string; note: string | null; account_id?: string | null }
export type Budget = { id: string; category: string; limit_amount: number; currency: string }
export type Goal = { id: string; title: string; target: number; saved: number; currency: string; due_date: string | null }
export type Period = 'weekly' | 'monthly' | 'yearly'
export type Sub = { id: string; name: string; amount: number; currency: string; period: Period; next_due: string; category: string; area: Area; url: string | null; notes: string | null; active: boolean; account_id?: string | null }
export type Loan = { id: string; direction: 'lent' | 'borrowed'; person: string; amount: number; currency: string; loan_date: string; due_date: string | null; note: string | null }
export type LoanPayment = { id: string; loan_id: string; amount: number; paid_on: string; note: string | null }

/** Áreas y categorías con las que se siembra la primera vez; después son tuyas (ver taxonomy.ts). */
export const DEFAULT_AREAS: { key: string; name: string; color: string }[] = [
  { key: 'web', name: 'Freelance web', color: 'var(--dev)' },
  { key: 'music', name: 'Música', color: 'var(--music)' },
  { key: 'personal', name: 'Personal', color: 'var(--personal)' },
]
export const DEFAULT_INCOME_CATEGORIES = ['Proyecto web', 'Tocada', 'Clases', 'Producción musical', 'Salario', 'Otros']
export const DEFAULT_EXPENSE_CATEGORIES = ['Comida', 'Transporte', 'Casa', 'Software y servicios', 'Equipo y tecnología', 'Instrumentos', 'Iglesia y ofrendas', 'Salud', 'Ocio', 'Educación', 'Otros']

const r2 = (n: number) => Math.round(n * 100) / 100

export const inMonth = (iso: string, month: string) => iso.startsWith(month)

export type MonthTotals = { income: number; expense: number; balance: number }

/** Totales del mes por moneda. `extraIncome` permite sumar cobros de trabajos ya registrados en otro módulo. */
export function monthTotals(txs: Tx[], month: string, extraIncome: { currency: string; amount: number; date: string }[] = []): Record<string, MonthTotals> {
  const out: Record<string, MonthTotals> = {}
  const t = (c: string) => (out[c] ??= { income: 0, expense: 0, balance: 0 })
  for (const x of txs) if (inMonth(x.tx_date, month)) t(x.currency)[x.kind] += Number(x.amount)
  for (const e of extraIncome) if (inMonth(e.date, month)) t(e.currency).income += Number(e.amount)
  for (const v of Object.values(out)) { v.income = r2(v.income); v.expense = r2(v.expense); v.balance = r2(v.income - v.expense) }
  return out
}

export function spendByCategory(txs: Tx[], month: string, currency: string): { category: string; total: number }[] {
  const m = new Map<string, number>()
  for (const x of txs) if (x.kind === 'expense' && x.currency === currency && inMonth(x.tx_date, month)) m.set(x.category, (m.get(x.category) ?? 0) + Number(x.amount))
  return [...m.entries()].map(([category, total]) => ({ category, total: r2(total) })).sort((a, b) => b.total - a.total)
}

export function incomeByArea(txs: Tx[], month: string, currency: string, extra: { currency: string; amount: number; date: string }[] = []): Record<Area, number> {
  const out: Record<Area, number> = { web: 0, music: 0, personal: 0 }
  for (const x of txs) if (x.kind === 'income' && x.currency === currency && inMonth(x.tx_date, month)) out[x.area] = (out[x.area] ?? 0) + Number(x.amount)
  for (const e of extra) if (e.currency === currency && inMonth(e.date, month)) out.web += Number(e.amount)
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, r2(v)]))
}

export type BudgetStatus = { budget: Budget; spent: number; pct: number; state: 'ok' | 'warn' | 'over' }
export function budgetStatus(budgets: Budget[], txs: Tx[], month: string): BudgetStatus[] {
  return budgets.map((b) => {
    const spent = r2(txs.filter((x) => x.kind === 'expense' && x.category === b.category && x.currency === b.currency && inMonth(x.tx_date, month)).reduce((a, x) => a + Number(x.amount), 0))
    const pct = b.limit_amount > 0 ? Math.round((spent / b.limit_amount) * 100) : 0
    return { budget: b, spent, pct, state: pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok' }
  })
}

/** Siguiente fecha de cobro. Mensual conserva el día cuando se puede (31 → último día del mes). */
export function addPeriod(iso: string, period: Period): string {
  if (period === 'weekly') return isoFromNum(dayNum(iso) + 7)
  const [y, m, d] = iso.split('-').map(Number)
  const ty = period === 'yearly' ? y + 1 : m === 12 ? y + 1 : y
  const tm = period === 'yearly' ? m : m === 12 ? 1 : m + 1
  const last = new Date(Date.UTC(ty, tm, 0)).getUTCDate()
  return `${ty}-${String(tm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`
}

/** Costo mensual equivalente de una suscripción. */
export const monthlyCost = (s: Pick<Sub, 'amount' | 'period'>) => r2(s.period === 'monthly' ? Number(s.amount) : s.period === 'yearly' ? Number(s.amount) / 12 : (Number(s.amount) * 52) / 12)

export const loanPaid = (l: Loan, pays: LoanPayment[]) => r2(pays.filter((p) => p.loan_id === l.id).reduce((a, p) => a + Number(p.amount), 0))
export const loanBalance = (l: Loan, pays: LoanPayment[]) => Math.max(0, r2(Number(l.amount) - loanPaid(l, pays)))

/** Total pendiente por moneda: lo que te deben y lo que debes. */
export function loanTotals(loans: Loan[], pays: LoanPayment[]): Record<string, { owedToMe: number; iOwe: number }> {
  const out: Record<string, { owedToMe: number; iOwe: number }> = {}
  for (const l of loans) {
    const t = (out[l.currency] ??= { owedToMe: 0, iOwe: 0 })
    t[l.direction === 'lent' ? 'owedToMe' : 'iOwe'] += loanBalance(l, pays)
  }
  for (const v of Object.values(out)) { v.owedToMe = r2(v.owedToMe); v.iOwe = r2(v.iOwe) }
  return out
}

/** Ingresos y gastos de los últimos `n` meses terminando en `end` (YYYY-MM), para la gráfica. */
export function lastMonths(txs: Tx[], end: string, n: number, currency: string, extra: { currency: string; amount: number; date: string }[] = []) {
  const [y, m] = end.split('-').map(Number)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(y, m - 1 - (n - 1 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const t = monthTotals(txs, key, extra)[currency] ?? { income: 0, expense: 0, balance: 0 }
    return { month: key, ...t }
  })
}
