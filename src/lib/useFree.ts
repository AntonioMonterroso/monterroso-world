import { useMemo } from 'react'
import { useBalances } from './balances'
import type { Loan, LoanPayment, Sub } from './finance'
import { freeToSpend, upcomingPayments } from './free'
import { useTable } from './table'
import { localISO } from './time'

/** «Libre para gastar»: lo que hay en cuentas menos lo que pagarás en los próximos 30 días. */
export function useFreeToSpend() {
  const bals = useBalances()
  const subs = useTable<Sub>('subscriptions', { col: 'next_due', asc: true })
  const loans = useTable<Loan>('loans', { col: 'loan_date', asc: false })
  const pays = useTable<LoanPayment>('loan_payments', { col: 'paid_on', asc: true })
  const today = localISO()
  const soon = useMemo(() => upcomingPayments(subs.rows, loans.rows, pays.rows, today, 30), [subs.rows, loans.rows, pays.rows, today])
  const free = useMemo(() => freeToSpend(bals.totals.available, soon), [bals.totals.available, soon])
  const hasAccounts = bals.accounts.rows.some((a) => !a.archived)
  return { loading: bals.loading || subs.loading, hasAccounts, ...free, available: bals.totals.available }
}
