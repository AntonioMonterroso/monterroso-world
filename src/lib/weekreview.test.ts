import { describe, expect, it } from 'vitest'
import { weekReview } from './weekreview'
import type { DayXp } from './xp'

const d = (total: number, parts: { label: string; n: number; pts: number }[] = []): DayXp => ({ total, parts })
const days = ['a', 'b', 'c', 'd', 'e', 'f', 'g'], prev = ['p1', 'p2']

describe('resumen de la semana', () => {
  it('semana vacía: mensaje amable', () => {
    const r = weekReview(new Map(), days, prev, {})
    expect(r.points).toBe(0)
    expect(r.best).toBeNull()
    expect(r.message).toMatch(/quieta/)
  })
  it('suma, mejor día y lo que más hiciste', () => {
    const by = new Map<string, DayXp>([['a', d(20, [{ label: 'Hábitos', n: 4, pts: 20 }])], ['c', d(40, [{ label: 'Prioridades', n: 2, pts: 20 }, { label: 'Minutos de enfoque', n: 30, pts: 30 }])]])
    const r = weekReview(by, days, prev, { a: 4, c: 2 })
    expect(r.points).toBe(60)
    expect(r.best).toEqual({ day: 'c', total: 40 })
    expect(r.focusMin).toBe(30)
    expect(r.top[0]).toEqual({ label: 'Hábitos', n: 4 })
    expect(r.avgEnergy).toBe(3)
    expect(r.activeDays).toBe(2)
  })
  it('compara con la semana anterior sin regañar', () => {
    const by = new Map<string, DayXp>([['a', d(10)], ['p1', d(100)]])
    expect(weekReview(by, days, prev, {}).message).toMatch(/tranquila/)
    const up = new Map<string, DayXp>([['a', d(100)], ['p1', d(50)]])
    expect(weekReview(up, days, prev, {}).message).toMatch(/Subiste/)
  })
})
