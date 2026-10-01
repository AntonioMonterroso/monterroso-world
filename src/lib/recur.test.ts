import { describe, expect, it } from 'vitest'
import { occurrences, occursOn, type Recurrence } from './recur'

const base: Recurrence = { start_date: '2026-10-06', repeat: 'none', interval_n: 1, weekdays: [], until: null, exceptions: [] }

describe('recurrencia', () => {
  it('evento único solo ocurre en su fecha', () => {
    expect(occurrences(base, '2026-10-01', '2026-10-31')).toEqual(['2026-10-06'])
  })

  it('semanal martes y jueves', () => {
    const r = { ...base, repeat: 'weekly' as const, weekdays: [2, 4] }
    expect(occurrences(r, '2026-10-06', '2026-10-15')).toEqual(['2026-10-06', '2026-10-08', '2026-10-13', '2026-10-15'])
  })

  it('cada 2 semanas', () => {
    const r = { ...base, repeat: 'weekly' as const, weekdays: [2], interval_n: 2 }
    expect(occurrences(r, '2026-10-06', '2026-11-10')).toEqual(['2026-10-06', '2026-10-20', '2026-11-03'])
  })

  it('semanal sin días usa el día de inicio', () => {
    const r = { ...base, repeat: 'weekly' as const }
    expect(occurrences(r, '2026-10-06', '2026-10-21')).toEqual(['2026-10-06', '2026-10-13', '2026-10-20'])
  })

  it('respeta fecha límite y excepciones', () => {
    const r = { ...base, repeat: 'daily' as const, until: '2026-10-09', exceptions: ['2026-10-08'] }
    expect(occurrences(r, '2026-10-01', '2026-10-20')).toEqual(['2026-10-06', '2026-10-07', '2026-10-09'])
  })

  it('mensual el día 31 cae en el último día de meses cortos', () => {
    const r = { ...base, start_date: '2026-01-31', repeat: 'monthly' as const }
    expect(occurrences(r, '2026-01-01', '2026-04-30')).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30'])
  })

  it('no ocurre antes de la fecha de inicio', () => {
    const r = { ...base, repeat: 'daily' as const }
    expect(occursOn(r, '2026-10-05')).toBe(false)
  })

  it('cambio de horario de verano no desplaza las fechas', () => {
    const r = { ...base, start_date: '2026-03-01', repeat: 'daily' as const }
    expect(occurrences(r, '2026-03-01', '2026-03-03')).toEqual(['2026-03-01', '2026-03-02', '2026-03-03'])
  })
})
