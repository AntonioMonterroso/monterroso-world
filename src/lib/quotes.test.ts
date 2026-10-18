import { describe, expect, it } from 'vitest'
import { recommendPkg, SEED_EXTRAS, SEED_PACKAGES, addDays, bodyFor, isExpired, isToken, linesFromPick, lineOn, newToken, nextNumber, paymentPlan, pickTotals, totalsOf, waLink, type Extra, type Line, type Pkg } from './quotes'

const L = (over: Partial<Line> = {}): Line => ({ id: 'a', label: 'x', qty: 1, unit: 100, period: 'once', ...over })

describe('cuentas de una propuesta', () => {
  it('separa lo de una vez, lo mensual y lo anual', () => {
    const t = totalsOf([L({ unit: 600 }), L({ id: 'b', unit: 350, period: 'month' }), L({ id: 'c', unit: 85, period: 'year' })], 'none')
    expect(t.once.total).toBe(600); expect(t.month.total).toBe(350); expect(t.year.total).toBe(85)
  })
  it('multiplica por cantidad', () => { expect(totalsOf([L({ qty: 3, unit: 50 })], 'none').once.total).toBe(150) })
  it('las líneas opcionales solo cuentan si las activas', () => {
    const lines = [L({ unit: 100 }), L({ id: 'o', unit: 40, optional: true })]
    expect(totalsOf(lines, 'none').once.total).toBe(100)
    expect(totalsOf([lines[0], { ...lines[1], on: true }], 'none').once.total).toBe(140)
    expect(lineOn(lines[1])).toBe(false)
  })
  it('IVA agregado: suma el 12%', () => { const t = totalsOf([L({ unit: 1000 })], 'added').once; expect(t).toEqual({ base: 1000, iva: 120, total: 1120 }) })
  it('IVA incluido: separa la base sin cambiar el total', () => { const t = totalsOf([L({ unit: 1120 })], 'included').once; expect(t).toEqual({ base: 1000, iva: 120, total: 1120 }) })
  it('sin IVA no toca nada', () => { expect(totalsOf([L({ unit: 333.33 })], 'none').once).toEqual({ base: 333.33, iva: 0, total: 333.33 }) })
  it('ignora cantidades y precios negativos o inválidos', () => { expect(totalsOf([L({ qty: -2, unit: 100 }), L({ id: 'z', unit: NaN })], 'none').once.total).toBe(0) })
})

describe('estructura de pagos', () => {
  it('70 / 30 y la suma cuadra al centavo', () => {
    const p = paymentPlan(12345.67, 70)
    expect(p.map((x) => x.pct)).toEqual([70, 30])
    expect(Math.round(p.reduce((s, x) => s + x.amount, 0) * 100) / 100).toBe(12345.67)
  })
  it('100% al confirmar o al entregar', () => { expect(paymentPlan(500, 100)).toEqual([{ label: 'Al confirmar', pct: 100, amount: 500 }]); expect(paymentPlan(500, 0)).toEqual([{ label: 'Al entregar', pct: 100, amount: 500 }]) })
  it('sin monto no hay pagos', () => { expect(paymentPlan(0, 70)).toEqual([]) })
})

describe('números, fechas y enlaces', () => {
  it('numera de forma consecutiva por año', () => {
    expect(nextNumber([], 2026)).toBe('COT-2026-001')
    expect(nextNumber(['COT-2026-001', 'COT-2026-007', 'COT-2025-099'], 2026)).toBe('COT-2026-008')
  })
  it('vigencia', () => { expect(addDays('2026-10-17', 15)).toBe('2026-11-01'); expect(isExpired('2026-10-01', '2026-10-17')).toBe(true); expect(isExpired(null, '2026-10-17')).toBe(false) })
  it('el token es largo, único y válido', () => { const a = newToken(), b = newToken(); expect(a).not.toBe(b); expect(isToken(a)).toBe(true); expect(a.length).toBeGreaterThanOrEqual(16); expect(isToken('corto')).toBe(false) })
  it('arma el enlace de WhatsApp', () => { expect(waLink('502 3764-5139', 'Hola ¿qué tal?')).toBe('https://wa.me/50237645139?text=Hola%20%C2%BFqu%C3%A9%20tal%3F') })
})

describe('paquetes y extras', () => {
  const pkg = { id: 'p', ...SEED_PACKAGES[1] } as Pkg
  const dom = { id: 'e', ...SEED_EXTRAS[0] } as Extra
  it('los precios de arranque son los acordados', () => { expect(SEED_PACKAGES.map((p) => [p.setup_fee, p.monthly_fee])).toEqual([[500, 250], [600, 350], [0, 0]]) })
  it('paquete + dominio', () => { expect(pickTotals({ pkg, extras: [dom] })).toEqual({ once: 600, month: 350, year: 85 }) })
  it('convierte la elección en líneas de propuesta', () => {
    const lines = linesFromPick({ pkg, extras: [dom] })
    expect(lines.map((l) => [l.period, l.unit])).toEqual([['once', 600], ['month', 350], ['year', 85]])
  })
  it('las plantillas traen contenido propio y la de blanco va vacía', () => { expect(bodyFor('citas').sections.length).toBeGreaterThan(0); expect(bodyFor('custom').sections).toEqual([]) })
})

describe('propuesta guiada', () => {
  const pk = SEED_PACKAGES.map((p, i) => ({ id: `p${i}`, ...p })) as Pkg[]
  it('citas recomienda el sistema completo', () => { expect(recommendPkg(['booking'], pk)?.name).toBe('Sistema completo de citas') })
  it('solo que lo encuentren: la página', () => { expect(recommendPkg(['found'], pk)?.name).toBe('Página de presentación') })
  it('control y contabilidad van a la medida', () => { expect(recommendPkg(['found', 'control'], pk)?.kind).toBe('custom'); expect(recommendPkg(['accounting'], pk)?.kind).toBe('custom') })
  it('sin metas claras, el recomendado', () => { expect(recommendPkg([], pk)?.recommended).toBe(true); expect(recommendPkg(['other'], pk)?.recommended).toBe(true) })
  it('sin paquetes no inventa nada', () => { expect(recommendPkg(['booking'], [])).toBeUndefined() })
})
