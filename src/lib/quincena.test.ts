import { describe, expect, it } from 'vitest'
import { quincenaOf, quincenaStatus } from './quincena'

describe('quincena', () => {
  it('parte el mes en dos', () => {
    expect(quincenaOf('2026-11-11')).toMatchObject({ n: 1, from: '2026-11-01', to: '2026-11-15' })
    expect(quincenaOf('2026-02-20')).toMatchObject({ n: 2, from: '2026-02-16', to: '2026-02-28' })
  })
  it('límite a la mitad y solo lo gastado en la quincena', () => {
    const q = quincenaOf('2026-11-20')
    const s = quincenaStatus([{ category: 'Comida', limit_amount: 1000, currency: 'GTQ' }], [
      { kind: 'expense', category: 'Comida', amount: 300, tx_date: '2026-11-10', currency: 'GTQ' },
      { kind: 'expense', category: 'Comida', amount: 420, tx_date: '2026-11-18', currency: 'GTQ' },
    ], q)
    expect(s[0]).toMatchObject({ limit: 500, spent: 420, pct: 84, state: 'warn' })
  })
})
