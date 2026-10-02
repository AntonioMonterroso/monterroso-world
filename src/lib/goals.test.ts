import { describe, expect, it } from 'vitest'
import type { Goal } from './finance'
import { messageFor, pickGoal } from './goals'

const g = (id: string, saved: number, target: number, due: string | null = null): Goal => ({ id, title: id, saved, target, currency: 'GTQ', due_date: due })

describe('goals', () => {
  it('sin metas no hay nada que destacar', () => expect(pickGoal([], '2026-10-01')).toBeNull())
  it('destaca la que vence primero', () => {
    const s = pickGoal([g('a', 10, 100, '2026-12-01'), g('b', 5, 100, '2026-11-01'), g('c', 90, 100)], '2026-10-01')!
    expect(s.goal.id).toBe('b')
  })
  it('sin fechas, la más avanzada que no esté cumplida', () => {
    expect(pickGoal([g('a', 10, 100), g('b', 60, 100), g('c', 100, 100)], '2026-10-01')!.goal.id).toBe('b')
  })
  it('calcula lo que falta y el ritmo semanal', () => {
    const s = pickGoal([g('a', 400, 1000, '2026-10-29')], '2026-10-01')!
    expect(s.remaining).toBe(600)
    expect(s.daysLeft).toBe(28)
    expect(s.perWeek).toBe(150)
    expect(s.pct).toBe(40)
  })
  it('sin fecha futura no inventa un ritmo', () => {
    expect(pickGoal([g('a', 400, 1000, '2026-09-01')], '2026-10-01')!.perWeek).toBeNull()
    expect(pickGoal([g('a', 400, 1000)], '2026-10-01')!.perWeek).toBeNull()
  })
  it('si todas están cumplidas, celebra', () => {
    const s = pickGoal([g('a', 100, 100), g('b', 200, 200)], '2026-10-01')!
    expect(s.done).toBe(true)
    expect(s.message).toContain('lograda')
  })
  it('el mensaje sube con el avance y cambia de noche al empezar', () => {
    expect(messageFor(0)).not.toBe(messageFor(0, true))
    expect(messageFor(80)).toContain('casi')
  })
})
