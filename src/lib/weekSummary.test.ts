import { describe, expect, it } from 'vitest'
import { weekRange, weekSummary } from './weekSummary'

describe('weekRange', () => {
  it('domingo resume la semana que termina hoy', () => expect(weekRange(new Date(2026, 10, 15))).toEqual({ from: '2026-11-09', to: '2026-11-15' }))
  it('lunes resume la que terminó ayer', () => expect(weekRange(new Date(2026, 10, 16))).toEqual({ from: '2026-11-09', to: '2026-11-15' }))
  it('otros días no hay resumen', () => expect(weekRange(new Date(2026, 10, 11))).toBeNull())
})

describe('weekSummary', () => {
  it('suma solo lo de la semana', () => {
    const s = weekSummary({ from: '2026-11-09', to: '2026-11-15' }, {
      payments: [{ amount: 500, paid_at: '2026-11-10' }, { amount: 300, paid_at: '2026-11-01' }, { amount: 99, paid_at: null }],
      txs: [{ kind: 'expense', amount: 45, category: 'Comida', tx_date: '2026-11-12' }, { kind: 'expense', amount: 100, category: 'Casa', tx_date: '2026-11-13' }, { kind: 'income', amount: 1000, category: 'Otros', tx_date: '2026-11-13' }, { kind: 'expense', amount: 20, category: 'Comida', tx_date: '2026-11-14', currency: 'USD' }],
      habitLogs: [{ day: '2026-11-09' }, { day: '2026-11-15' }, { day: '2026-11-16' }],
      practice: [{ minutes: 20, practiced_on: '2026-11-10' }, { minutes: 15, practiced_on: '2026-11-10' }, { minutes: 30, practiced_on: '2026-11-11' }],
    })
    expect(s.collected).toBe(500)
    expect(s.spent).toBe(145)
    expect(s.topSpend).toEqual({ category: 'Casa', total: 100 })
    expect(s.habitChecks).toBe(2)
    expect(s.practiceMin).toBe(65)
    expect(s.practiceDays).toBe(2)
  })
})
