import { addPeriod, loanBalance, type Loan, type LoanPayment, type Sub } from './finance'
import { dayNum } from './recur'

const r2 = (n: number) => Math.round(n * 100) / 100

export type Upcoming = { name: string; amount: number; date: string; kind: 'sub' | 'loan' }
/** Pagos que vienen en los próximos `days` días: suscripciones activas (cada vez que caen) y deudas que tú debes con fecha límite. */
export function upcomingPayments(subs: Sub[], loans: Loan[], loanPays: LoanPayment[], today: string, days = 30): Upcoming[] {
  const limit = dayNum(today) + days
  const out: Upcoming[] = []
  for (const s of subs) {
    if (!s.active) continue
    let d = s.next_due
    for (let i = 0; i < 12 && dayNum(d) <= limit; i++) {
      if (dayNum(d) >= dayNum(today)) out.push({ name: s.name, amount: Number(s.amount), date: d, kind: 'sub' })
      d = addPeriod(d, s.period)
    }
  }
  for (const l of loans) {
    if (l.direction !== 'borrowed' || !l.due_date) continue
    const left = loanBalance(l, loanPays)
    if (left > 0 && dayNum(l.due_date) <= limit) out.push({ name: `Deuda con ${l.person}`, amount: left, date: l.due_date < today ? today : l.due_date, kind: 'loan' })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

/** Lo que de verdad puedes gastar: lo disponible en tus cuentas (que ya no incluye lo apartado en ahorro) menos lo que tienes que pagar pronto. */
export function freeToSpend(available: number, upcoming: Upcoming[]) {
  const committed = r2(upcoming.reduce((s, u) => s + u.amount, 0))
  return { free: r2(available - committed), committed }
}
