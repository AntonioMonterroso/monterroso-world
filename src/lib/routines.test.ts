import { describe, expect, it } from 'vitest'
import { TEMPLATES, currentKind, fmtStart, isScheduled, progressOf, routineStreak, totalMinutes } from './routines'

const run = (day: string, completed = true) => ({ day, completed })
const every = { days: [0, 1, 2, 3, 4, 5, 6] }

describe('rutinas', () => {
  it('las plantillas traen pasos y suman minutos', () => {
    expect(TEMPLATES.morning.steps.length).toBeGreaterThanOrEqual(4)
    expect(totalMinutes(TEMPLATES.morning.steps)).toBe(40)
    expect(totalMinutes([{ minutes: null }, { minutes: 5 }])).toBe(5)
  })
  it('elige la rutina según la hora', () => {
    expect(currentKind(7)).toBe('morning')
    expect(currentKind(14)).toBeNull()
    expect(currentKind(21)).toBe('evening')
  })
  it('avance de la ejecución', () => {
    expect(progressOf({ done_steps: ['a', 'c'] }, [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }])).toEqual({ done: 2, total: 4, pct: 50 })
    expect(progressOf(undefined, [{ id: 'a' }])).toEqual({ done: 0, total: 1, pct: 0 })
    expect(progressOf(undefined, [])).toEqual({ done: 0, total: 0, pct: 0 })
  })
  it('horario por día', () => {
    expect(isScheduled({ days: [1, 2] }, 2)).toBe(true)
    expect(isScheduled({ days: [1, 2] }, 0)).toBe(false)
    expect(fmtStart(420)).toBe('07:00')
    expect(fmtStart(null)).toBe('')
  })
})

describe('racha de rutina', () => {
  it('cuenta días seguidos y hoy sin terminar no la rompe', () => {
    expect(routineStreak(every, [run('2026-09-30'), run('2026-09-29'), run('2026-09-28')], '2026-10-01')).toBe(3)
  })
  it('cuenta hoy si ya se completó', () => {
    expect(routineStreak(every, [run('2026-10-01'), run('2026-09-30')], '2026-10-01')).toBe(2)
  })
  it('un día programado sin completar la corta', () => {
    expect(routineStreak(every, [run('2026-09-30'), run('2026-09-28')], '2026-10-01')).toBe(1)
  })
  it('un intento incompleto no cuenta', () => {
    expect(routineStreak(every, [run('2026-09-30', false), run('2026-09-29')], '2026-10-01')).toBe(0)
  })
  it('los días no programados no la rompen', () => {
    // 2026-10-01 es jueves; programada solo lunes (1) y jueves (4)
    const r = { days: [1, 4] }
    expect(routineStreak(r, [run('2026-09-28'), run('2026-10-01')], '2026-10-01')).toBe(2)
    expect(routineStreak(r, [run('2026-09-28')], '2026-10-01')).toBe(1)
  })
  it('sin registros es cero', () => {
    expect(routineStreak(every, [], '2026-10-01')).toBe(0)
  })
})
