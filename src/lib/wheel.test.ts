import { describe, expect, it } from 'vitest'
import { pickIndex, targetRotation, winnerAt } from './wheel'

describe('wheel', () => {
  it('la flecha lee la porción correcta sin girar', () => {
    expect(winnerAt(0, 4)).toBe(0)
    expect(winnerAt(360, 4)).toBe(0)
  })
  it('al girar 90° en sentido horario, la flecha lee la porción anterior', () => {
    expect(winnerAt(90, 4)).toBe(3)
    expect(winnerAt(180, 4)).toBe(2)
  })
  it('el giro objetivo aterriza en la porción elegida, desde cualquier posición', () => {
    for (const n of [2, 3, 5, 6, 8]) for (const cur of [0, 37, 359, 1234.5]) for (let k = 0; k < n; k++) {
      const r = targetRotation(cur, k, n, 5)
      expect(r).toBeGreaterThan(cur + 5 * 360 - 1)
      expect(winnerAt(r, n)).toBe(k)
    }
  })
  it('el ruido leve no saca la flecha de su porción', () => {
    for (const j of [-1, -0.5, 0.5, 1]) expect(winnerAt(targetRotation(10, 2, 6, 4, j), 6)).toBe(2)
  })
  it('elige parejo entre 0 y n-1', () => {
    expect(pickIndex(5, 0)).toBe(0)
    expect(pickIndex(5, 0.999)).toBe(4)
  })
})
