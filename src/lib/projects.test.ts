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

import { activeIn, expectedTotal, hasBilling, monthlyPeriods, monthlyStates, paidTo, setupMonth, setupPaid, summarizeMonth } from './projects'
import { balanceOf } from './accounts'

const rec = (over: Partial<Project> = {}): Project => ({ ...proj('r', 0, 'GTQ'), month: '2026-08', setup_fee: 300, monthly_fee: 500, billing_day: 5, monthly_start: '2026-08', monthly_end: null, account_id: 'cta', ...over })
const mpay = (period: string, amount = 500, extra: Partial<Payment> = {}): Payment => ({ ...pay('r', amount, true), kind: 'monthly', period, paid_at: `${period}-05`, ...extra })

describe('instalación y mensualidad', () => {
  it('detecta si un trabajo cobra instalación o mensualidad', () => {
    expect(hasBilling(proj('a', 100))).toBe(false)
    expect(hasBilling(rec())).toBe(true)
    expect(hasBilling(rec({ setup_fee: 0, monthly_fee: 0 }))).toBe(false)
  })
  it('cuenta los meses desde el inicio hasta hoy o el fin', () => {
    expect(monthlyPeriods(rec(), '2026-10')).toEqual(['2026-08', '2026-09', '2026-10'])
    expect(monthlyPeriods(rec({ monthly_end: '2026-09' }), '2026-12')).toEqual(['2026-08', '2026-09'])
    expect(monthlyPeriods(rec({ monthly_start: null }), '2026-10')).toEqual([])
    expect(activeIn(rec(), '2026-07')).toBe(false)
    expect(activeIn(rec(), '2026-11')).toBe(true)
  })
  it('la instalación toca en el mes de inicio', () => { expect(setupMonth(rec())).toBe('2026-08'); expect(setupMonth(rec({ monthly_start: null }))).toBe('2026-08') })
  it('marca atrasadas las mensualidades vencidas', () => {
    const st = monthlyStates(rec(), [mpay('2026-08')], '2026-10', new Date(2026, 9, 20))
    expect(st.map((x) => [x.period, x.paid, x.late])).toEqual([['2026-08', true, false], ['2026-09', false, true], ['2026-10', false, true]])
    expect(monthlyStates(rec(), [], '2026-10', new Date(2026, 9, 3)).at(-1)?.late).toBe(false)
  })
  it('sabe si la instalación ya se cobró', () => {
    expect(setupPaid(rec(), [])).toBe(false)
    expect(setupPaid(rec(), [{ ...pay('r', 300, true), kind: 'setup' }])).toBe(true)
  })
  it('valor esperado: monto + instalación + mensualidades', () => { expect(expectedTotal(rec(), '2026-10')).toBe(300 + 3 * 500) })
  it('resumen del mes: lo de este mes y el atraso de meses anteriores', () => {
    const today = new Date(2026, 9, 20)
    const t = summarizeMonth([rec()], [mpay('2026-08'), { ...pay('r', 300, true), kind: 'setup', paid_at: '2026-08-05' }], '2026-10', today).GTQ
    expect(t.billed).toBe(500)       // solo la mensualidad de octubre
    expect(t.received).toBe(0)
    expect(t.pending).toBe(500 + 500) // octubre + septiembre atrasada
    const agosto = summarizeMonth([rec()], [mpay('2026-08'), { ...pay('r', 300, true), kind: 'setup', paid_at: '2026-08-05' }], '2026-08', today).GTQ
    expect(agosto).toEqual({ billed: 800, received: 800, pending: 0 })
  })
  it('una instalación de un mes anterior sin cobrar cuenta como atraso', () => {
    const t = summarizeMonth([rec()], [mpay('2026-08'), mpay('2026-09')], '2026-10', new Date(2026, 9, 20)).GTQ
    expect(t.pending).toBe(500 + 300)
  })
  it('un trabajo sin cobros recurrentes se mide como siempre', () => {
    expect(summarizeMonth([proj('a', 1000)], [pay('a', 400, true)], '2026-10').USD).toEqual({ billed: 1000, received: 400, pending: 600 })
  })
  it('los cobros suman al saldo de la cuenta donde cayeron', () => {
    const work = paidTo([{ ...mpay('2026-10'), account_id: 'cta' }, { ...pay('r', 99, false), account_id: 'cta' }, mpay('2026-09')])
    expect(work).toEqual([{ account_id: 'cta', amount: 500 }])
    expect(balanceOf({ id: 'cta', opening_balance: 100 }, [], [], { work })).toBe(600)
  })
})

import { workIncomeRows, workKindLabel } from './projects'
describe('cobros de trabajos como movimientos', () => {
  it('solo los cobrados, con su origen', () => {
    const rows = workIncomeRows([rec()], [mpay('2026-10', 500, { account_id: 'cta' }), { ...pay('r', 99, false) }, { ...pay('r', 300, true), kind: 'setup', paid_at: '2026-10-02' }])
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ kind: 'income', amount: 500, tx_date: '2026-10-05', account_id: 'cta', category: 'Trabajo: r', area: 'web' })
    expect(workKindLabel(rows[0].work)).toBe('Mensualidad de octubre de 2026')
    expect(workKindLabel(rows[1].work)).toBe('Instalación')
  })
  it('ignora cobros de trabajos que ya no existen', () => { expect(workIncomeRows([], [mpay('2026-10')])).toEqual([]) })
})
