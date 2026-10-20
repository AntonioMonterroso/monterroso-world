import { activeIn, currentMonth, monthlyPeriods, setupMonth, setupPaid, shiftMonth, type Payment, type Project } from './projects'

const r2 = (n: number) => Math.round(n * 100) / 100

export type ClientState = 'paid' | 'pending' | 'late'
export type ClientRow = {
  project: Project
  fee: number
  /** Estado de la mensualidad del mes que se mira. */
  state: ClientState
  paidAt: string | null
  /** Mensualidades de meses anteriores sin cobrar. */
  lateMonths: string[]
  /** Todo lo que este cliente te debe hasta hoy (mensualidades atrasadas + la de este mes + instalación sin cobrar). */
  owed: number
  setupDue: number
}

const paidIn = (p: Project, payments: Payment[], period: string) =>
  payments.find((x) => x.project_id === p.id && x.kind === 'monthly' && x.period === period && x.paid_at)

/** Clientes que te pagan mensualidad en `month`: quién ya pagó, quién falta y quién va atrasado. */
export function monthlyClients(projects: Project[], payments: Payment[], month: string, today = new Date()): ClientRow[] {
  const now = currentMonth(today)
  return projects
    .filter((p) => p.status !== 'closed' && Number(p.monthly_fee ?? 0) > 0 && activeIn(p, month))
    .map((p) => {
      const fee = Number(p.monthly_fee)
      const got = paidIn(p, payments, month)
      const pastDue = month < now || (month === now && p.billing_day != null && today.getDate() > p.billing_day)
      const lateMonths = monthlyPeriods(p, month).filter((m) => m < month && !paidIn(p, payments, m))
      const setupDue = Number(p.setup_fee ?? 0) > 0 && !setupPaid(p, payments) && setupMonth(p) <= month ? Number(p.setup_fee) : 0
      const state: ClientState = got ? 'paid' : pastDue ? 'late' : 'pending'
      return { project: p, fee, state, paidAt: got?.paid_at ?? null, lateMonths, setupDue, owed: r2((got ? 0 : fee) + lateMonths.length * fee + setupDue) }
    })
    .sort((a, b) => (a.project.billing_day ?? 28) - (b.project.billing_day ?? 28) || a.project.title.localeCompare(b.project.title, 'es'))
}

export type IncomingTotals = { fixed: number; collected: number; pending: number; late: number; clients: number; paidClients: number }
/** Resumen del mes: lo fijo que debería entrar, lo ya cobrado, lo que falta y lo que quedó de meses anteriores. */
export function incomingTotals(rows: ClientRow[]): IncomingTotals {
  const fixed = r2(rows.reduce((s, r) => s + r.fee, 0))
  const collected = r2(rows.filter((r) => r.state === 'paid').reduce((s, r) => s + r.fee, 0))
  const late = r2(rows.reduce((s, r) => s + r.lateMonths.length * r.fee, 0))
  return { fixed, collected, pending: r2(fixed - collected), late, clients: rows.length, paidClients: rows.filter((r) => r.state === 'paid').length }
}

export type ForecastMonth = { month: string; fixed: number; clients: number }
/** Lo que entraría cada mes si todos siguen pagando: mensualidades vigentes (las que terminan se caen solas). */
export function forecast(projects: Project[], from: string, n: number): ForecastMonth[] {
  return Array.from({ length: n }, (_, i) => {
    const month = shiftMonth(from, i)
    const rows = projects.filter((p) => p.status !== 'closed' && Number(p.monthly_fee ?? 0) > 0 && activeIn(p, month))
    return { month, fixed: r2(rows.reduce((s, p) => s + Number(p.monthly_fee), 0)), clients: rows.length }
  })
}
