import { describe, expect, it } from 'vitest'
import { freeGaps, peakHour, planDay } from './dayplan'

describe('plan del día', () => {
  it('encuentra los huecos entre bloques', () => {
    expect(freeGaps([{ start: 9 * 60, end: 12 * 60 }, { start: 13 * 60, end: 14 * 60 }], 8 * 60)).toEqual([{ start: 480, end: 540 }, { start: 720, end: 780 }, { start: 840, end: 1260 }])
  })
  it('descarta huecos cortos', () => { expect(freeGaps([{ start: 500, end: 700 }], 480, 1260, 25)).toEqual([{ start: 700, end: 1260 }]) })
  it('la mejor hora necesita historial', () => {
    const s = (h: number) => ({ actual_min: 25, started_at: new Date(2026, 0, 5, h, 0).toISOString() })
    expect(peakHour([s(9), s(9)])).toBeNull()
    expect(peakHour([s(9), s(9), s(9), s(15), s(10)])).toBe(9)
  })
  it('lo primero va cerca de tu mejor hora', () => {
    const plan = planDay({ priorities: ['A', 'B'], gaps: [{ start: 480, end: 600 }, { start: 840, end: 1000 }], energy: 4, peak: 14 })
    expect(plan.map((p) => p.title)).toEqual(['A', 'B'])
    expect(plan.find((p) => p.title === 'A')?.start).toBe(840)
  })
  it('con energía baja solo una cosa y corta', () => {
    const plan = planDay({ priorities: ['A', 'B', 'C'], gaps: [{ start: 480, end: 900 }], energy: 1, peak: null })
    expect(plan).toEqual([{ start: 480, min: 15, title: 'A' }])
  })
  it('no se amontona en un solo hueco', () => {
    const plan = planDay({ priorities: ['A', 'B', 'C'], gaps: [{ start: 480, end: 600 }], energy: 3, peak: null })
    expect(plan.map((p) => p.start)).toEqual([480, 515, 550])
  })
})
