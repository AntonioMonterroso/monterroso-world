import { describe, expect, it } from 'vitest'
import type { Place, Trip } from './inspire'
import { outingCandidates, outingKind, tripWhen } from './outings'

const place = (id: string, category: string, status: 'want' | 'visited' = 'want'): Place => ({ id, trip_id: null, name: id, category, status, address: null, url: null, notes: null, rating: null, visited_on: null })
const trip = (id: string, start: string | null, end: string | null = null): Trip => ({ id, name: id, start_date: start, end_date: end, notes: null })

describe('outings', () => {
  it('distingue países, comida y café por la categoría', () => {
    expect(outingKind('País o ciudad')).toBe('travel')
    expect(outingKind('Viaje')).toBe('travel')
    expect(outingKind('Restaurante')).toBe('food')
    expect(outingKind('Café')).toBe('coffee')
    expect(outingKind('Naturaleza')).toBe('nature')
    expect(outingKind('Música y estudios')).toBe('music')
    expect(outingKind('lo que sea')).toBe('other')
  })
  it('cuenta regresiva de un viaje', () => {
    expect(tripWhen(trip('a', '2026-10-01').start_date ? trip('a', '2026-10-01') : trip('a', null), '2026-10-01').text).toBe('¡Estás de viaje!')
    expect(tripWhen(trip('a', '2026-10-02'), '2026-10-01').text).toBe('Sale mañana')
    expect(tripWhen(trip('a', '2026-10-11'), '2026-10-01').text).toBe('Faltan 10 días')
    expect(tripWhen(trip('a', '2027-01-01'), '2026-10-01').text).toBe('Faltan 3 meses')
    expect(tripWhen(trip('a', '2026-09-01', '2026-09-05'), '2026-10-01').text).toBe('Ya pasó')
    expect(tripWhen(trip('a', null), '2026-10-01').text).toBe('Sin fecha todavía')
  })
  it('primero el viaje en curso, luego el más próximo y luego lugares', () => {
    const c = outingCandidates([place('p1', 'Restaurante')], [trip('lejos', '2026-12-01'), trip('ya', '2026-09-30', '2026-10-03'), trip('pronto', '2026-10-05')], '2026-10-01')
    expect(c.map((x) => x.id)).toEqual(['ya', 'pronto', 'lejos', 'p1'])
    expect(c[0].type).toBe('trip')
  })
  it('ignora lugares ya visitados y viajes pasados', () => {
    const c = outingCandidates([place('v', 'Restaurante', 'visited'), place('w', 'Café')], [trip('pasado', '2026-01-01', '2026-01-05')], '2026-10-01')
    expect(c.map((x) => x.id)).toEqual(['w'])
  })
  it('rota los lugares con el día', () => {
    const ps = [place('a', 'Café'), place('b', 'Café'), place('c', 'Café')]
    const d1 = outingCandidates(ps, [], '2026-10-01')[0].id
    const d2 = outingCandidates(ps, [], '2026-10-02')[0].id
    expect(d1).not.toBe(d2)
  })
})
