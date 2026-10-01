import { describe, expect, it } from 'vitest'
import { addPeriod, budgetStatus, incomeByArea, lastMonths, loanBalance, loanTotals, monthlyCost, monthTotals, spendByCategory, type Loan, type LoanPayment, type Tx } from './finance'

const tx = (kind: 'income' | 'expense', amount: number, date: string, o: Partial<Tx> = {}): Tx => ({ id: Math.random().toString(), kind, amount, currency: 'USD', category: 'Otros', area: 'personal', tx_date: date, note: null, ...o })

describe('totales del mes', () => {
  const txs = [tx('income', 500, '2026-10-02', { area: 'web' }), tx('expense', 120.5, '2026-10-05'), tx('income', 80, '2026-09-30'), tx('income', 2000, '2026-10-10', { currency: 'MXN', area: 'music' })]
  it('separa por mes y moneda', () => {
    const t = monthTotals(txs, '2026-10')
    expect(t.USD).toEqual({ income: 500, expense: 120.5, balance: 379.5 })
    expect(t.MXN.income).toBe(2000)
  })
  it('suma cobros de trabajos como ingreso extra', () => {
    expect(monthTotals(txs, '2026-10', [{ currency: 'USD', amount: 400, date: '2026-10-15' }]).USD.income).toBe(900)
  })
  it('evita errores de decimales', () => {
    expect(monthTotals([tx('expense', 0.1, '2026-10-01'), tx('expense', 0.2, '2026-10-02')], '2026-10').USD.expense).toBe(0.3)
  })
  it('ingresos por área, con cobros de trabajos en web', () => {
    expect(incomeByArea(txs, '2026-10', 'USD', [{ currency: 'USD', amount: 100, date: '2026-10-20' }])).toEqual({ web: 600, music: 0, personal: 0 })
  })
  it('gasto por categoría ordenado', () => {
    const r = spendByCategory([tx('expense', 10, '2026-10-01', { category: 'Comida' }), tx('expense', 50, '2026-10-02', { category: 'Casa' }), tx('expense', 5, '2026-10-03', { category: 'Comida' })], '2026-10', 'USD')
    expect(r).toEqual([{ category: 'Casa', total: 50 }, { category: 'Comida', total: 15 }])
  })
})

describe('presupuesto', () => {
  it('avisa al 80% y al pasarse', () => {
    const b = [{ id: '1', category: 'Comida', limit_amount: 100, currency: 'USD' }]
    expect(budgetStatus(b, [tx('expense', 79, '2026-10-01', { category: 'Comida' })], '2026-10')[0].state).toBe('ok')
    expect(budgetStatus(b, [tx('expense', 80, '2026-10-01', { category: 'Comida' })], '2026-10')[0].state).toBe('warn')
    expect(budgetStatus(b, [tx('expense', 130, '2026-10-01', { category: 'Comida' })], '2026-10')[0]).toMatchObject({ state: 'over', pct: 130 })
  })
})

describe('suscripciones', () => {
  it('avanza la fecha de cobro', () => {
    expect(addPeriod('2026-10-15', 'monthly')).toBe('2026-11-15')
    expect(addPeriod('2026-12-15', 'monthly')).toBe('2027-01-15')
    expect(addPeriod('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(addPeriod('2024-02-29', 'yearly')).toBe('2025-02-28')
    expect(addPeriod('2026-12-28', 'weekly')).toBe('2027-01-04')
  })
  it('costo mensual equivalente', () => {
    expect(monthlyCost({ amount: 120, period: 'yearly' })).toBe(10)
    expect(monthlyCost({ amount: 10, period: 'monthly' })).toBe(10)
    expect(monthlyCost({ amount: 3, period: 'weekly' })).toBe(13)
  })
})

describe('préstamos', () => {
  const loan = (direction: 'lent' | 'borrowed', amount: number, currency = 'USD', id = 'a'): Loan => ({ id, direction, person: 'X', amount, currency, loan_date: '2026-10-01', due_date: null, note: null })
  const pay = (loan_id: string, amount: number): LoanPayment => ({ id: Math.random().toString(), loan_id, amount, paid_on: '2026-10-05', note: null })
  it('saldo con pagos parciales', () => {
    expect(loanBalance(loan('lent', 300), [pay('a', 100), pay('a', 50)])).toBe(150)
  })
  it('nunca negativo', () => {
    expect(loanBalance(loan('lent', 100), [pay('a', 150)])).toBe(0)
  })
  it('separa lo que me deben de lo que debo', () => {
    const t = loanTotals([loan('lent', 300, 'USD', 'a'), loan('borrowed', 80, 'USD', 'b')], [pay('a', 100)])
    expect(t.USD).toEqual({ owedToMe: 200, iOwe: 80 })
  })
})

describe('gráfica', () => {
  it('trae los últimos meses en orden, cruzando el año', () => {
    const r = lastMonths([tx('income', 10, '2026-12-01'), tx('expense', 4, '2027-01-10')], '2027-01', 3, 'USD')
    expect(r.map((m) => m.month)).toEqual(['2026-11', '2026-12', '2027-01'])
    expect(r[1].income).toBe(10)
    expect(r[2].expense).toBe(4)
  })
})
