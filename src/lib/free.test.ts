import { describe, expect, it } from 'vitest'
import { freeToSpend, upcomingPayments } from './free'
import type { Loan, Sub } from './finance'

const sub = (name: string, amount: number, next_due: string, period: Sub['period'] = 'monthly', active = true): Sub => ({ id: name, name, amount, currency: 'GTQ', period, next_due, category: 'x', area: 'personal', url: null, notes: null, active })
const loan = (person: string, amount: number, due: string | null, direction: Loan['direction'] = 'borrowed'): Loan => ({ id: person, direction, person, amount, currency: 'GTQ', loan_date: '2026-09-01', due_date: due, note: null })

describe('pagos que vienen', () => {
  it('cuenta cada vez que cae una suscripción dentro de la ventana', () => {
    const u = upcomingPayments([sub('Netflix', 60, '2026-10-25'), sub('Semanal', 10, '2026-10-21', 'weekly')], [], [], '2026-10-20', 30)
    expect(u.filter((x) => x.name === 'Netflix')).toHaveLength(1)
    expect(u.filter((x) => x.name === 'Semanal').length).toBeGreaterThanOrEqual(4)
  })
  it('ignora suscripciones apagadas, fuera de ventana y préstamos que me deben', () => {
    const u = upcomingPayments([sub('Off', 99, '2026-10-22', 'monthly', false), sub('Lejos', 50, '2026-12-30')], [loan('Ana', 500, '2026-10-30', 'lent')], [], '2026-10-20', 30)
    expect(u).toHaveLength(0)
  })
  it('incluye deudas mías con fecha cercana, aun vencidas', () => {
    const u = upcomingPayments([], [loan('Luis', 300, '2026-10-10')], [{ id: 'p', loan_id: 'Luis', amount: 100, paid_on: '2026-10-01', note: null }], '2026-10-20')
    expect(u).toMatchObject([{ amount: 200, date: '2026-10-20' }])
  })
})

describe('libre para gastar', () => {
  it('resta lo comprometido de lo disponible', () => {
    expect(freeToSpend(1000, [{ name: 'a', amount: 250.5, date: '2026-10-25', kind: 'sub' }])).toEqual({ free: 749.5, committed: 250.5 })
  })
  it('puede quedar negativo', () => {
    expect(freeToSpend(100, [{ name: 'a', amount: 300, date: '2026-10-25', kind: 'sub' }]).free).toBe(-200)
  })
})
