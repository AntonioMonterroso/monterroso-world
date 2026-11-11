import { beforeEach, describe, expect, it } from 'vitest'
import { ahora, readSnoozed, snooze, SNOOZE_MS, tomorrowMorning } from './ahora'
import type { SuggestInput } from './suggest'

const base: SuggestInput = { nowMin: 10 * 60, current: null, next: null, priorities: { open: 3, total: 3 }, overdue: [], followUps: [], toSend: [], habitsPending: [], routine: null, inbox: 0, exitList: null, promises: [], chase: [], renewals: [] }

describe('Ahora', () => {
  beforeEach(() => { try { localStorage.clear() } catch { /* node sin localStorage */ } })

  it('nunca repite el mismo tipo', () => {
    const r = ahora({ ...base, overdue: [{ id: 'a', title: 'A', minsLate: 5 }, { id: 'b', title: 'B', minsLate: 9 }] }, {}, { soft: false, snoozed: {} })
    expect(r.filter((x) => x.kind === 'overdue')).toHaveLength(1)
  })
  it('máximo tres, lo que se vence primero', () => {
    const r = ahora({ ...base, next: { title: 'Ensayo', startMin: 10 * 60 + 5 }, overdue: [{ id: 'a', title: 'A', minsLate: 5 }], promises: [{ id: 'p', text: 'Libro', overdue: true }], renewals: [{ id: 'r', name: 'Dominio', days: 3 }], chase: [{ id: 'c', name: 'Cable' }] }, { collect: [{ id: 'x', title: 'Barbería', late: false }] }, { soft: false, snoozed: {} })
    expect(r).toHaveLength(3)
    expect(r[0].kind).toBe('overdue')
  })
  it('agrega cobro, ahorro y cocina con su acción', () => {
    const r = ahora(base, { collect: [{ id: 'x', title: 'Barbería Imperio', late: false }], savings: [{ id: 's', amount: 'Q 500.00', goal: 'Moto' }], cookReady: 5 }, { soft: false, snoozed: {}, limit: 10 })
    expect(r.find((x) => x.kind === 'collect')?.act).toBe('Cobrado')
    expect(r.find((x) => x.kind === 'savings')?.title).toMatch(/Q 500/)
    expect(r.find((x) => x.kind === 'cook')).toBeUndefined() // a las 10:00 no es hora de comer
    const noon = ahora({ ...base, nowMin: 12 * 60 }, { cookReady: 5 }, { soft: false, snoozed: {}, limit: 10 })
    expect(noon.find((x) => x.kind === 'cook')?.reason).toMatch(/5 recetas/)
  })
  it('posponer esconde la sugerencia por tres horas', () => {
    const now = 1_000_000
    const s = snooze('ov-a', now)
    expect(s['ov-a']).toBe(now + SNOOZE_MS)
    expect(readSnoozed(now + SNOOZE_MS - 1)['ov-a']).toBeDefined()
    expect(readSnoozed(now + SNOOZE_MS + 1)['ov-a']).toBeUndefined()
    const r = ahora({ ...base, overdue: [{ id: 'a', title: 'A', minsLate: 5 }] }, {}, { soft: false, snoozed: { 'ov-a': now + SNOOZE_MS } })
    expect(r.find((x) => x.id === 'ov-a')).toBeUndefined()
  })
  it('día suave: una sola, y solo de lo que de verdad pesa', () => {
    const r = ahora({ ...base, habitsPending: [{ id: 'h', name: 'Estirar' }], inbox: 3, promises: [{ id: 'p', text: 'Libro', overdue: false }] }, {}, { soft: true, snoozed: {} })
    expect(r).toHaveLength(1)
    expect(r[0].kind).toBe('promise')
  })
  it('«Mañana» esconde la sugerencia hasta las 6 de la mañana siguiente', () => {
    const now = new Date(2026, 10, 11, 15, 0).getTime()
    expect(new Date(tomorrowMorning(now)).getDate()).toBe(12)
    expect(new Date(tomorrowMorning(now)).getHours()).toBe(6)
    expect(snooze('x', now, tomorrowMorning(now))['x']).toBe(tomorrowMorning(now))
  })
  it('propuesta sin respuesta pide seguimiento', () => {
    const r = ahora(base, { quotes: [{ id: 'q1', client: 'Imperio', days: 4 }, { id: 'q2', client: 'Dulce', days: 9 }] }, { soft: false, snoozed: {}, limit: 10 })
    expect(r.find((x) => x.kind === 'quote')?.title).toBe('Dar seguimiento a la propuesta de Dulce')
  })
})
