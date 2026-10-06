import { describe, expect, it } from 'vitest'
import { balanceOf, creditLeft, reconcile, totals, type Account, type Transfer } from './accounts'

const acc = (id: string, kind: Account['kind'], opening = 0, extra: Partial<Account> = {}): Account => ({ id, name: id, kind, bank: null, last4: null, opening_balance: opening, credit_limit: null, color: 'x', position: 0, archived: false, ...extra })
const tx = (account_id: string | null, kind: 'income' | 'expense', amount: number) => ({ account_id, kind, amount })
const tr = (from_id: string, to_id: string, amount: number, fee = 0): Transfer => ({ id: Math.random().toString(), from_id, to_id, amount, fee, tx_date: '2026-10-01', note: null })

describe('accounts', () => {
  it('saldo = inicial + ingresos − gastos', () => {
    expect(balanceOf(acc('a', 'bank', 1000), [tx('a', 'income', 500), tx('a', 'expense', 200.5), tx('b', 'income', 999), tx(null, 'expense', 50)], [])).toBe(1299.5)
  })
  it('las transferencias mueven dinero y la comisión sale del origen', () => {
    const t = [tr('a', 'b', 300, 5)]
    expect(balanceOf(acc('a', 'bank', 1000), [], t)).toBe(695)
    expect(balanceOf(acc('b', 'cash', 0), [], t)).toBe(300)
  })
  it('una transferencia no cambia el total disponible, salvo por la comisión', () => {
    const accounts = [acc('a', 'bank', 1000), acc('b', 'cash', 100)]
    const t = [tr('a', 'b', 400, 2)]
    const bal = Object.fromEntries(accounts.map((x) => [x.id, balanceOf(x, [], t)]))
    expect(totals(accounts, bal).available).toBe(1098)
  })
  it('separa efectivo, bancos, billeteras y tarjetas', () => {
    const accounts = [acc('c', 'cash'), acc('b', 'bank'), acc('w', 'wallet'), acc('t', 'card'), acc('old', 'bank', 0, { archived: true })]
    const t = totals(accounts, { c: 100, b: 900, w: 50, t: -300, old: 999 })
    expect(t).toEqual({ cash: 100, banks: 900, wallets: 50, cards: -300, available: 1050 })
  })
  it('crédito disponible de una tarjeta', () => {
    expect(creditLeft({ credit_limit: 5000 }, -1200)).toBe(3800)
    expect(creditLeft({ credit_limit: 5000 }, 0)).toBe(5000)
    expect(creditLeft({ credit_limit: null }, -1)).toBeNull()
  })
  it('conciliar calcula la diferencia con el banco', () => {
    expect(reconcile(1000, 1200)).toEqual({ diff: 200, kind: 'income' })
    expect(reconcile(1000, 940.25)).toEqual({ diff: 59.75, kind: 'expense' })
    expect(reconcile(500, 500)).toEqual({ diff: 0, kind: null })
  })
})
