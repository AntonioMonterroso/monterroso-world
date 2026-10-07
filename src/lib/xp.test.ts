import { describe, expect, it } from 'vitest'
import { balance, canClaim, levelOf, pointsToGo, totalXp, weekXp, xpByDay, type XpData } from './xp'

const empty: XpData = { tasks: [], habitLogs: [], runs: [], promises: [], deliveries: [], checkins: [], focus: [] }

describe('xp', () => {
  it('suma lo que haces cada día y nada por lo que no', () => {
    const by = xpByDay({ ...empty, tasks: [{ done: true, priority_date: '2026-10-07' }, { done: false, priority_date: '2026-10-07' }], habitLogs: [{ day: '2026-10-07' }, { day: '2026-10-07' }], runs: [{ day: '2026-10-07', completed: true }, { day: '2026-10-07', completed: false }] })
    expect(by.get('2026-10-07')!.total).toBe(10 + 2 * 5 + 15)
  })
  it('el enfoque cuenta por minuto y tiene tope diario', () => {
    const by = xpByDay({ ...empty, focus: [{ started_at: '2026-10-07', actual_min: 25 }, { started_at: '2026-10-07', actual_min: 200 }] })
    expect(by.get('2026-10-07')!.total).toBe(120)
  })
  it('promesas, envíos y registro del día', () => {
    const by = xpByDay({ ...empty, promises: [{ done: true, done_on: '2026-10-06' }, { done: false, done_on: null }], deliveries: [{ sent_at: '2026-10-06' }, { sent_at: null }], checkins: [{ day: '2026-10-06', energy: 3 }, { day: '2026-10-05', energy: null }] })
    expect(by.get('2026-10-06')!.total).toBe(8 + 6 + 5)
    expect(by.has('2026-10-05')).toBe(false)
  })
  it('niveles suaves y crecientes', () => {
    expect(levelOf(0).level).toBe(1); expect(levelOf(49).level).toBe(1); expect(levelOf(50).level).toBe(2); expect(levelOf(200).level).toBe(3)
    const l = levelOf(125); expect(l.level).toBe(2); expect(l.into).toBe(75); expect(l.need).toBe(150); expect(l.pct).toBe(50)
  })
  it('semana y total', () => {
    const by = xpByDay({ ...empty, habitLogs: [{ day: '2026-10-05' }, { day: '2026-10-06' }, { day: '2026-09-01' }] })
    expect(totalXp(by)).toBe(15)
    expect(weekXp(by, ['2026-10-05', '2026-10-06', '2026-10-07'])).toBe(10)
  })
  it('canjear resta puntos pero no el nivel', () => {
    const bal = balance(300, [{ cost: 120 }, { cost: 30 }])
    expect(bal).toBe(150); expect(canClaim(bal, 150)).toBe(true); expect(canClaim(bal, 151)).toBe(false); expect(pointsToGo(bal, 200)).toBe(50)
    expect(levelOf(300).level).toBe(3)
  })
})
