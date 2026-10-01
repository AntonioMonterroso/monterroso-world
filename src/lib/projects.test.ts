import { describe, expect, it } from 'vitest'
import { monthLabel, shiftMonth, summarize, type Payment, type Project } from './projects'

const proj = (id: string, amount: number, currency = 'USD'): Project => ({ id, title: id, client: null, status: 'active', month: '2026-10', due_date: null, amount, currency, site_url: null, notes: null, checklist: [] })
const pay = (project_id: string, amount: number, paid: boolean): Payment => ({ id: Math.random().toString(), project_id, amount, due_date: null, paid_at: paid ? '2026-10-05' : null, method: null, note: null })

describe('totales de cobros', () => {
  it('separa cobrado y por cobrar, ignorando cobros aún pendientes', () => {
    const t = summarize([proj('a', 1000)], [pay('a', 400, true), pay('a', 300, false)])
    expect(t.USD).toEqual({ billed: 1000, received: 400, pending: 600 })
  })

  it('no mezcla monedas', () => {
    const t = summarize([proj('a', 100, 'USD'), proj('b', 2000, 'MXN')], [pay('b', 500, true)])
    expect(t.USD.pending).toBe(100)
    expect(t.MXN.pending).toBe(1500)
  })

  it('pendiente nunca es negativo si se cobra de más', () => {
    expect(summarize([proj('a', 100)], [pay('a', 150, true)]).USD.pending).toBe(0)
  })

  it('suma decimales sin errores de punto flotante', () => {
    expect(summarize([proj('a', 0.3)], [pay('a', 0.1, true), pay('a', 0.2, true)]).USD.pending).toBe(0)
  })
})

describe('meses', () => {
  it('cambia de año', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })
  it('etiqueta en español', () => {
    expect(monthLabel('2026-10')).toMatch(/octubre/)
  })
})
