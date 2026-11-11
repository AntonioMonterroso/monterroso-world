import { describe, expect, it } from 'vitest'
import { cleanExtras, step } from './habitExtra'

describe('habitExtra', () => {
  it('limpia valores raros y días viejos', () => {
    const x = cleanExtras({ a: { perDay: 8, monthGoal: 20, tally: { '2026-11-10': 3, '2026-09-01': 2, bad: 1 } }, b: { perDay: 1 }, c: 'x' }, '2026-11-11')
    expect(x).toEqual({ a: { perDay: 8, monthGoal: 20, tally: { '2026-11-10': 3 } } })
  })
  it('el contador marca hecho al llegar a la meta', () => {
    const e = { perDay: 3, tally: { '2026-11-11': 2 } }
    expect(step(e, '2026-11-11', 1)).toEqual({ count: 3, done: true })
    expect(step(e, '2026-11-11', -1)).toEqual({ count: 1, done: false })
    expect(step(undefined, '2026-11-11', 1)).toEqual({ count: 1, done: true })
  })
})
