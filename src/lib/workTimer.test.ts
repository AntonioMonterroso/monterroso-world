import { describe, expect, it } from 'vitest'
import { fmtHours, minutesSince, perHour } from './workTimer'

describe('workTimer', () => {
  it('redondea los minutos', () => { expect(minutesSince(0, 90_000)).toBe(2); expect(minutesSince(0, 10_000)).toBe(1) })
  it('formatea horas', () => { expect(fmtHours(135)).toBe('2 h 15 min'); expect(fmtHours(45)).toBe('45 min'); expect(fmtHours(120)).toBe('2 h') })
  it('calcula lo que ganas por hora', () => { expect(perHour(1500, 600)).toBe(150); expect(perHour(100, 0)).toBeNull() })
})
