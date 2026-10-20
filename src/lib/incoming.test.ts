import { describe, expect, it } from 'vitest'
import { forecast, incomingTotals, monthlyClients } from './incoming'
import type { Payment, Project } from './projects'

const proj = (id: string, fee: number, start: string, extra: Partial<Project> = {}): Project => ({ id, title: id, client: null, status: 'active', month: start, due_date: null, amount: 0, currency: 'GTQ', site_url: null, notes: null, checklist: [], monthly_fee: fee, monthly_start: start, billing_day: 5, ...extra })
const pay = (project_id: string, period: string): Payment => ({ id: project_id + period, project_id, amount: 0, due_date: null, paid_at: period + '-05', method: null, note: null, kind: 'monthly', period })
const today = new Date(2026, 9, 20) // 20 de octubre de 2026

describe('clientes con mensualidad', () => {
  it('distingue pagado, atrasado y al día', () => {
    const rows = monthlyClients([proj('a', 100, '2026-08'), proj('b', 200, '2026-08'), proj('c', 300, '2026-10', { billing_day: 28 })], [pay('a', '2026-08'), pay('a', '2026-09'), pay('a', '2026-10')], '2026-10', today)
    const by = Object.fromEntries(rows.map((r) => [r.project.id, r]))
    expect(by.a.state).toBe('paid')
    expect(by.a.owed).toBe(0)
    expect(by.b.state).toBe('late')
    expect(by.b.lateMonths).toEqual(['2026-08', '2026-09'])
    expect(by.b.owed).toBe(600)
    expect(by.c.state).toBe('pending')
  })
  it('ignora cerrados y los que no han empezado o ya terminaron', () => {
    const rows = monthlyClients([proj('x', 100, '2026-08', { status: 'closed' }), proj('y', 100, '2026-12'), proj('z', 100, '2026-01', { monthly_end: '2026-06' })], [], '2026-10', today)
    expect(rows).toHaveLength(0)
  })
  it('suma la instalación sin cobrar a lo que debe', () => {
    const [r] = monthlyClients([proj('a', 100, '2026-10', { setup_fee: 500, billing_day: 28 })], [], '2026-10', today)
    expect(r.setupDue).toBe(500)
    expect(r.owed).toBe(600)
  })
})

describe('totales y proyección', () => {
  it('resume lo fijo, lo cobrado y lo de meses anteriores', () => {
    const rows = monthlyClients([proj('a', 100, '2026-10'), proj('b', 250, '2026-09')], [pay('a', '2026-10')], '2026-10', today)
    expect(incomingTotals(rows)).toEqual({ fixed: 350, collected: 100, pending: 250, late: 250, clients: 2, paidClients: 1 })
  })
  it('proyecta meses y respeta el fin de cada mensualidad', () => {
    const f = forecast([proj('a', 100, '2026-10'), proj('b', 50, '2026-10', { monthly_end: '2026-11' })], '2026-10', 3)
    expect(f.map((m) => m.fixed)).toEqual([150, 150, 100])
    expect(f[2].clients).toBe(1)
  })
})
