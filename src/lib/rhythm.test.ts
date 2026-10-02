import { describe, expect, it } from 'vitest'
import { dayWins, energyMessage, isSoftDay, ritualFor } from './rhythm'
import { suggest, type SuggestInput } from './suggest'

const base: SuggestInput = { nowMin: 10 * 60, current: null, next: null, priorities: { open: 3, total: 3 }, overdue: [], followUps: [], toSend: [], habitsPending: [], routine: null, inbox: 0 }

describe('rhythm', () => {
  it('día suave con energía 1 o 2', () => {
    expect(isSoftDay({ energy: 2 })).toBe(true)
    expect(isSoftDay({ energy: 3 })).toBe(false)
    expect(isSoftDay({ energy: null })).toBe(false)
    expect(isSoftDay(undefined)).toBe(false)
  })
  it('ritual por hora', () => {
    expect(ritualFor(7)).toBe('start')
    expect(ritualFor(14)).toBeNull()
    expect(ritualFor(20)).toBe('close')
    expect(ritualFor(3)).toBeNull()
  })
  it('las ganancias siempre dicen algo', () => {
    expect(dayWins({ prioritiesDone: 0, habitsDone: 0, focusMin: 0, deliveriesSent: 0, routinesDone: 0 })).toHaveLength(1)
    const w = dayWins({ prioritiesDone: 2, habitsDone: 1, focusMin: 75, deliveriesSent: 1, routinesDone: 1 })
    expect(w).toContain('2 prioridades cumplidas')
    expect(w).toContain('1 h 15 min de enfoque')
    expect(w).toContain('1 hábito hecho')
  })
  it('mensaje según energía', () => {
    expect(energyMessage(1)).toContain('suave')
    expect(energyMessage(5)).toContain('difícil')
    expect(energyMessage(null)).toContain('Cuéntame')
  })
})

describe('suggest con energía baja', () => {
  it('abre con una sola cosa pequeña y recorta la lista', () => {
    const r = suggest({ ...base, lowEnergy: true, overdue: [{ id: 'a', title: 'Factura', minsLate: 20 }], followUps: [{ id: 'f', title: 'Cot' }], inbox: 3, habitsPending: [{ id: 'h', name: 'x' }] })
    expect(r[0].id).toBe('soft-day')
    expect(r.length).toBeLessThanOrEqual(2)
    expect(r.some((s) => s.id === 'inbox' || s.id === 'habit')).toBe(false)
  })
  it('sin energía baja todo sigue igual', () => {
    expect(suggest({ ...base, inbox: 3 }).some((s) => s.id === 'soft-day')).toBe(false)
  })
})
