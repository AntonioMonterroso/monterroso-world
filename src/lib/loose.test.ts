import { describe, expect, it } from 'vitest'
import { dueLabel, findStuff, lentToChase, promiseState, sortPromises, type Promise_, type Stuff } from './loose'

const st = (o: Partial<Stuff>): Stuff => ({ id: Math.random().toString(), name: 'x', kind: 'placed', place: null, person: null, remind_on: null, event_id: null, returned: false, returned_on: null, created_at: '2026-10-01T10:00:00Z', ...o })
const pr = (o: Partial<Promise_>): Promise_ => ({ id: Math.random().toString(), text: 'x', person: null, due_date: null, event_id: null, done: false, done_on: null, created_at: '2026-10-01T10:00:00Z', ...o })

describe('loose ends', () => {
  it('busca sin acentos y por varias palabras', () => {
    const items = [st({ name: 'Cable de guitarra', place: 'Cajón del estudio' }), st({ name: 'Pedal', kind: 'lent', person: 'Marcos' })]
    expect(findStuff(items, 'cajon').map((i) => i.name)).toEqual(['Cable de guitarra'])
    expect(findStuff(items, 'marcos pedal')).toHaveLength(1)
    expect(findStuff(items, 'zzz')).toHaveLength(0)
    expect(findStuff(items, '  ')).toHaveLength(2)
  })
  it('lo prestado se reclama al llegar la fecha o tras 3 semanas sin fecha', () => {
    const today = '2026-10-30'
    expect(lentToChase([st({ kind: 'lent', remind_on: '2026-10-30' })], today)).toHaveLength(1)
    expect(lentToChase([st({ kind: 'lent', remind_on: '2026-11-05' })], today)).toHaveLength(0)
    expect(lentToChase([st({ kind: 'lent', created_at: '2026-10-01T00:00:00Z' })], today)).toHaveLength(1)
    expect(lentToChase([st({ kind: 'lent', created_at: '2026-10-20T00:00:00Z' })], today)).toHaveLength(0)
    expect(lentToChase([st({ kind: 'lent', returned: true, remind_on: '2026-10-01' }), st({ kind: 'placed', remind_on: '2026-10-01' })], today)).toHaveLength(0)
  })
  it('estado y orden de las promesas', () => {
    const today = '2026-10-10'
    expect(promiseState(pr({ due_date: '2026-10-09' }), today)).toBe('overdue')
    expect(promiseState(pr({ due_date: '2026-10-10' }), today)).toBe('today')
    expect(promiseState(pr({ due_date: '2026-10-12' }), today)).toBe('soon')
    expect(promiseState(pr({ due_date: '2026-10-20' }), today)).toBe('open')
    expect(promiseState(pr({}), today)).toBe('open')
    const sorted = sortPromises([pr({ text: 'sin fecha' }), pr({ text: 'lejos', due_date: '2026-11-01' }), pr({ text: 'ayer', due_date: '2026-10-09' }), pr({ text: 'hoy', due_date: '2026-10-10' })], today)
    expect(sorted.map((p) => p.text)).toEqual(['ayer', 'hoy', 'lejos', 'sin fecha'])
  })
  it('etiquetas de fecha', () => {
    expect(dueLabel('2026-10-10', '2026-10-10')).toBe('Hoy')
    expect(dueLabel('2026-10-11', '2026-10-10')).toBe('Mañana')
    expect(dueLabel('2026-10-07', '2026-10-10')).toBe('Venció hace 3 días')
    expect(dueLabel(null, '2026-10-10')).toBe('Sin fecha')
  })
})
