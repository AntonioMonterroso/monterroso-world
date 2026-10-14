import { describe, expect, it } from 'vitest'
import { NO_RULE, cleanRule, ruleActive, ruleAmount, workStats } from './savingsRule'

describe('regla de ahorro de trabajos', () => {
  it('calcula el porcentaje al centavo', () => { expect(ruleAmount(500, 20)).toBe(100); expect(ruleAmount(333.33, 15)).toBe(50); expect(ruleAmount(100, 150)).toBe(100); expect(ruleAmount(100, -5)).toBe(0) })
  it('solo está activa con porcentaje y meta', () => {
    expect(ruleActive(NO_RULE)).toBe(false)
    expect(ruleActive({ pct: 20, goalId: null, auto: false })).toBe(false)
    expect(ruleActive({ pct: 20, goalId: 'g', auto: false })).toBe(true)
  })
  it('limpia valores dañados', () => {
    expect(cleanRule(undefined)).toEqual(NO_RULE)
    expect(cleanRule({ pct: 250, goalId: 5, auto: 'si' })).toEqual({ pct: 100, goalId: null, auto: false })
    expect(cleanRule({ pct: 20, goalId: 'g', auto: true })).toEqual({ pct: 20, goalId: 'g', auto: true })
  })
  it('del mes: cuánto cobraste, cuánto te tocaba y cuánto falta', () => {
    const pays = [{ paid_at: '2026-10-05', amount: 500 }, { paid_at: '2026-10-20', amount: 300 }, { paid_at: '2026-09-30', amount: 999 }, { paid_at: null, amount: 100 }]
    const moves = [{ tx_date: '2026-10-05', amount: 100, source_payment_id: 'p1' }, { tx_date: '2026-10-06', amount: 50, source_payment_id: null }, { tx_date: '2026-09-05', amount: 70, source_payment_id: 'p0' }]
    expect(workStats(pays, moves, { pct: 20, goalId: 'g', auto: false }, '2026-10')).toEqual({ collected: 800, shouldSave: 160, saved: 100, left: 60 })
  })
  it('sin regla no te debe nada', () => { expect(workStats([{ paid_at: '2026-10-05', amount: 500 }], [], NO_RULE, '2026-10').left).toBe(0) })
})
