import { describe, expect, it } from 'vitest'
import { PRESETS, allocate, avgIncome, cleanBuckets, pctLeft, progress, shareOf } from './plan'

describe('calculadora de reparto', () => {
  it('todos los planes base suman 100%', () => { for (const p of PRESETS) expect(pctLeft(p.buckets)).toBe(0) })
  it('reparte 50/30/20', () => {
    expect(allocate(1000, PRESETS[0].buckets).map((x) => x.amount)).toEqual([500, 300, 200])
  })
  it('cuadra al centavo con redondeos', () => {
    const rows = allocate(100.01, PRESETS[2].buckets)
    expect(Math.round(rows.reduce((s, x) => s + x.amount, 0) * 100) / 100).toBe(100.01)
  })
  it('no reparte negativos', () => { expect(allocate(-50, PRESETS[0].buckets).every((x) => x.amount === 0)).toBe(true) })
  it('si no suma 100 no fuerza el cuadre', () => {
    const rows = allocate(1000, [{ id: 'a', name: 'A', pct: 40, kind: 'spend' }])
    expect(rows[0].amount).toBe(400)
    expect(pctLeft([{ id: 'a', name: 'A', pct: 40, kind: 'spend' }])).toBe(60)
  })
  it('avance contra la meta', () => {
    expect(progress(500, 200)).toEqual({ pct: 40, left: 300, over: false })
    expect(progress(500, 650).over).toBe(true)
    expect(progress(0, 10).pct).toBe(0)
  })
  it('porcentaje de lo fijo', () => { expect(shareOf(150, 1000)).toBe(15); expect(shareOf(10, 0)).toBe(0) })
  it('el promedio ignora meses sin ingreso', () => { expect(avgIncome([{ income: 0 }, { income: 600 }, { income: 400 }])).toBe(500); expect(avgIncome([])).toBe(0) })
  it('limpia planes dañados', () => {
    expect(cleanBuckets('x')).toBeNull()
    expect(cleanBuckets([{ id: 'a', name: 'A', pct: 150, kind: 'save' }, { nope: 1 }])).toEqual([{ id: 'a', name: 'A', pct: 100, kind: 'save' }])
  })
})
