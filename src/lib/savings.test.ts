import { describe, expect, it } from 'vitest'
import { duePlans, emergencyTarget, paceOf, pendingPlans, reasonLabel, summarize, withdrawalImpact, type Plan } from './savings'

const goal = { saved: 400, target: 1000, due_date: null as string | null }
const mv = (amount: number, tx_date: string) => ({ amount, tx_date })

describe('resumen de ahorro', () => {
  it('suma lo ahorrado y separa aportes de retiros del mes', () => {
    const s = summarize([{ saved: 400, target: 1000 }, { saved: 100, target: 500 }], [mv(300, '2026-10-02'), mv(-100, '2026-10-10'), mv(50, '2026-09-30')], '2026-10')
    expect(s).toEqual({ saved: 500, target: 1500, pct: 33, deposited: 300, withdrawn: 100, net: 200, withdrawals: 1 })
  })
  it('sin metas no divide entre cero', () => { expect(summarize([], [], '2026-10').pct).toBe(0) })
})

describe('impacto de un retiro', () => {
  it('dice cuánto retrocede la meta', () => {
    expect(withdrawalImpact(goal, 100)).toEqual({ newSaved: 300, newPct: 30, lostPct: 10, tooMuch: false, big: false })
  })
  it('avisa si es más de la mitad y no deja pasar de lo ahorrado', () => {
    expect(withdrawalImpact(goal, 300).big).toBe(true)
    const t = withdrawalImpact(goal, 900)
    expect(t.tooMuch).toBe(true)
    expect(t.newSaved).toBe(0)
  })
})

describe('ritmo de ahorro', () => {
  it('promedia 3 meses y calcula cuándo llegas', () => {
    const p = paceOf({ saved: 400, target: 1000, due_date: null }, [mv(300, '2026-10-02'), mv(300, '2026-09-10'), mv(300, '2026-08-01')], '2026-10-14')
    expect(p.perMonth).toBe(300)
    expect(p.monthsLeft).toBe(2)
    expect(p.onTrack).toBeNull()
  })
  it('compara con la fecha límite', () => {
    const base = [mv(300, '2026-10-02'), mv(300, '2026-09-10'), mv(300, '2026-08-01')]
    expect(paceOf({ saved: 400, target: 1000, due_date: '2026-12-31' }, base, '2026-10-14').onTrack).toBe(true)
    expect(paceOf({ saved: 400, target: 1000, due_date: '2026-11-01' }, base, '2026-10-14').onTrack).toBe(false)
  })
  it('sin aportes no inventa fecha', () => { const p = paceOf(goal, [], '2026-10-14'); expect(p.eta).toBeNull(); expect(p.perMonth).toBe(0) })
  it('una meta cumplida va a tiempo', () => { expect(paceOf({ saved: 1000, target: 1000, due_date: null }, [], '2026-10-14').onTrack).toBe(true) })
  it('los retiros bajan el ritmo', () => {
    expect(paceOf(goal, [mv(300, '2026-10-02'), mv(-300, '2026-10-05')], '2026-10-14').perMonth).toBe(0)
  })
})

describe('fondo de emergencia y retiros planeados', () => {
  it('sugiere tres meses de gasto', () => { expect(emergencyTarget(2150)).toBe(6500); expect(emergencyTarget(0)).toBe(0) })
  it('etiquetas de motivo', () => { expect(reasonLabel('emergency')).toBe('Emergencia'); expect(reasonLabel(null)).toBe('') })
  const plan = (id: string, planned_for: string, status: Plan['status'] = 'pending'): Plan => ({ id, goal_id: 'g', account_id: null, amount: 100, planned_for, reason: 'x', status })
  it('solo piden confirmación los pendientes que ya tocan', () => {
    const ps = [plan('a', '2026-10-20'), plan('b', '2026-10-10'), plan('c', '2026-10-01', 'done'), plan('d', '2026-10-14')]
    expect(duePlans(ps, '2026-10-14').map((p) => p.id)).toEqual(['b', 'd'])
    expect(pendingPlans(ps).map((p) => p.id)).toEqual(['b', 'd', 'a'])
  })
})
