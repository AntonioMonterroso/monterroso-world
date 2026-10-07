import { useMemo } from 'react'
import { balanceOf, totals, type Account, type GoalMove, type LoanLite, type PayLite, type Transfer } from './accounts'
import type { Tx } from './finance'
import { useTable } from './table'

/** Saldos de todas las cuentas con todo conectado: movimientos, transferencias, préstamos, pagos y metas. */
export function useBalances() {
  const accounts = useTable<Account>('fin_accounts', { col: 'position', asc: true })
  const txs = useTable<Tx>('fin_transactions', { col: 'tx_date', asc: false })
  const transfers = useTable<Transfer>('fin_transfers', { col: 'tx_date', asc: false })
  const loans = useTable<LoanLite & { person?: string }>('loans', { col: 'loan_date', asc: false })
  const payments = useTable<PayLite & { id: string }>('loan_payments', { col: 'paid_on', asc: true })
  const moves = useTable<GoalMove & { id: string }>('fin_goal_moves', { col: 'tx_date', asc: false })

  const loading = accounts.loading || txs.loading
  const balances = useMemo(() => Object.fromEntries(accounts.rows.map((a) => [a.id, balanceOf(a, txs.rows, transfers.rows, { loans: loans.rows, payments: payments.rows, goalMoves: moves.rows })])), [accounts.rows, txs.rows, transfers.rows, loans.rows, payments.rows, moves.rows])
  const tot = useMemo(() => totals(accounts.rows, balances), [accounts.rows, balances])
  const inGoals = useMemo(() => Math.round(moves.rows.filter((m) => accounts.rows.some((a) => a.id === m.account_id && !a.archived)).reduce((s, m) => s + Number(m.amount), 0) * 100) / 100, [moves.rows, accounts.rows])
  return { accounts, txs, transfers, loading, balances, totals: tot, inGoals, error: accounts.error || txs.error || transfers.error || loans.error || payments.error || moves.error }
}
