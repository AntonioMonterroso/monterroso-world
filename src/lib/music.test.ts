import { describe, expect, it } from 'vitest'
import { fmtDuration, parseDuration, streak } from './music'

describe('racha de práctica', () => {
  it('cuenta días seguidos hasta hoy', () => {
    expect(streak([{ practiced_on: '2026-10-01' }, { practiced_on: '2026-09-30' }, { practiced_on: '2026-09-29' }], '2026-10-01')).toBe(3)
  })
  it('no se rompe si aún no practicas hoy', () => {
    expect(streak([{ practiced_on: '2026-09-30' }, { practiced_on: '2026-09-29' }], '2026-10-01')).toBe(2)
  })
  it('se rompe con un día vacío', () => {
    expect(streak([{ practiced_on: '2026-10-01' }, { practiced_on: '2026-09-29' }], '2026-10-01')).toBe(1)
  })
  it('es cero sin prácticas recientes', () => {
    expect(streak([{ practiced_on: '2026-09-20' }], '2026-10-01')).toBe(0)
  })
  it('cruza el cambio de mes y año', () => {
    expect(streak([{ practiced_on: '2027-01-01' }, { practiced_on: '2026-12-31' }], '2027-01-01')).toBe(2)
  })
})

describe('duración', () => {
  it('formatea y lee mm:ss o minutos', () => {
    expect(fmtDuration(205)).toBe('3:25')
    expect(parseDuration('3:25')).toBe(205)
    expect(parseDuration('4')).toBe(240)
    expect(parseDuration('abc')).toBeNull()
  })
})
