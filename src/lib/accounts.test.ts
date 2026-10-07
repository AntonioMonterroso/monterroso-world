import { describe, expect, it } from 'vitest'
import { balanceOf, creditLeft, reconcile, totals, type Account, type Transfer } from './accounts'

const acc = (id: string, kind: Account['kind'], opening = 0, extra: Partial<Account> = {}): Account => ({ id, name: id, kind, bank: null, last4: null, opening_balance: opening, credit_limit: null, color: 'x', position: 0, archived: false, ...extra })
const tx = (account_id: string | null, kind: 'income' | 'expense', amount: number) => ({ account_id, kind, amount })
const tr = (from_id: string, to_id: string, amount: number, fee = 0): Transfer => ({ id: Math.random().toString(), from_id, to_id, amount, fee, tx_date: '2026-10-01', note: null })

describe('dinero conectado', () => {
  const a = acc('a', 'bank', 1000)
  it('prestar baja la cuenta y pedir prestado la sube', () => {
    expect(balanceOf(a, [], [], { loans: [{ id: 'l1', direction: 'lent', amount: 300, account_id: 'a' }] })).toBe(700)
    expect(balanceOf(a, [], [], { loans: [{ id: 'l2', direction: 'borrowed', amount: 500, account_id: 'a' }] })).toBe(1500)
    expect(balanceOf(a, [], [], { loans: [{ id: 'l3', direction: 'lent', amount: 300, account_id: 'otra' }] })).toBe(1000)
  })
  it('los pagos van en sentido contrario al préstamo', () => {
    const loans = [{ id: 'l1', direction: 'lent' as const, amount: 300, account_id: 'a' }, { id: 'l2', direction: 'borrowed' as const, amount: 500, account_id: 'a' }]
    const payments = [{ loan_id: 'l1', amount: 100, account_id: 'a' }, { loan_id: 'l2', amount: 200, account_id: 'a' }, { loan_id: 'l1', amount: 999, account_id: null }]
    expect(balanceOf(a, [], [], { loans, payments })).toBe(1000 - 300 + 500 + 100 - 200)
  })
  it('aportar a una meta saca dinero de la cuenta y retirar lo regresa', () => {
    expect(balanceOf(a, [], [], { goalMoves: [{ account_id: 'a', amount: 250 }, { account_id: 'a', amount: -50 }, { account_id: 'b', amount: 999 }] })).toBe(800)
  })
})

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
