import { describe, expect, it } from 'vitest'
import { daysUntil, every, nextDue, remindDate, sortRenewals, stateOf, whenLabel, type Renewal } from './renewals'

const r = (o: Partial<Renewal>): Renewal => ({ id: 'x', name: 'x', every_n: 1, unit: 'month', next_due: '2026-10-31', lead_days: 7, note: null, event_id: null, ...o })

describe('renewals', () => {
  it('siguiente vencimiento por mes, año y semana', () => {
    expect(nextDue(r({ next_due: '2026-10-31' }), '2026-10-20')).toBe('2026-11-30')
    expect(nextDue(r({ unit: 'year', next_due: '2026-10-31' }), '2026-10-20')).toBe('2027-10-31')
    expect(nextDue(r({ unit: 'year', every_n: 2, next_due: '2026-10-31' }), '2026-10-20')).toBe('2028-10-31')
    expect(nextDue(r({ unit: 'week', every_n: 2, next_due: '2026-10-01' }), '2026-09-28')).toBe('2026-10-15')
  })
  it('si ya venció, cuenta desde hoy', () => {
    expect(nextDue(r({ unit: 'month', next_due: '2026-06-15' }), '2026-10-10')).toBe('2026-11-10')
  })
  it('estados', () => {
    expect(stateOf(r({ next_due: '2026-10-09' }), '2026-10-10')).toBe('overdue')
    expect(stateOf(r({ next_due: '2026-10-15', lead_days: 7 }), '2026-10-10')).toBe('soon')
    expect(stateOf(r({ next_due: '2026-12-15', lead_days: 7 }), '2026-10-10')).toBe('later')
    expect(daysUntil(r({ next_due: '2026-10-12' }), '2026-10-10')).toBe(2)
  })
  it('textos', () => {
    expect(whenLabel(0)).toBe('Vence hoy'); expect(whenLabel(-3)).toBe('Venció hace 3 días'); expect(whenLabel(90)).toBe('En 3 meses')
    expect(every(r({ every_n: 1, unit: 'year' }))).toBe('Cada año'); expect(every(r({ every_n: 6, unit: 'month' }))).toBe('Cada 6 meses')
  })
  it('el aviso nunca queda en el pasado y los más próximos van primero', () => {
    expect(remindDate(r({ next_due: '2026-10-12', lead_days: 7 }), '2026-10-10')).toBe('2026-10-10')
    expect(remindDate(r({ next_due: '2026-10-30', lead_days: 7 }), '2026-10-10')).toBe('2026-10-23')
    expect(sortRenewals([r({ name: 'b', next_due: '2026-12-01' }), r({ name: 'a', next_due: '2026-11-01' })]).map((x) => x.name)).toEqual(['a', 'b'])
  })
})
