import { describe, expect, it } from 'vitest'
import { clean, DEFAULT, PALETTES, surprise } from './appearance'

describe('apariencia', () => {
  it('lee valores dañados como los de fábrica', () => {
    expect(clean(null)).toEqual(DEFAULT)
    expect(clean({ mode: 'rojo', h: 999, s: -4, daily: 'si' })).toMatchObject({ mode: 'oscuro', h: 360, s: 0, daily: false })
    expect(clean({ mode: 'claro', palette: 'Uva', h: 270, s: 80, daily: true })).toMatchObject({ mode: 'claro', palette: 'Uva', h: 270, daily: true })
  })
  it('Grafito es la primera paleta y hay siete', () => { expect(PALETTES[0].name).toBe('Grafito'); expect(PALETTES).toHaveLength(7) })
  it('sorpréndeme es estable para el mismo día y cambia entre días', () => {
    expect(surprise(20000)).toEqual(surprise(20000))
    expect(surprise(20000)).not.toEqual(surprise(20001))
    const s = surprise(12345)
    expect(s.h).toBeGreaterThanOrEqual(0); expect(s.h).toBeLessThan(360); expect(s.s).toBeGreaterThanOrEqual(60)
  })
})
