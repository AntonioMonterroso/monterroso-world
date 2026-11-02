import { describe, expect, it } from 'vitest'
import { clientKey, clientName, groupClients } from './clients'
import type { Payment, Project } from './projects'

const proj = (id: string, title: string, client: string | null, fee = 0, extra: Partial<Project> = {}): Project => ({ id, title, client, status: 'active', month: '2026-09', due_date: null, amount: 0, currency: 'GTQ', site_url: null, notes: null, checklist: [], monthly_fee: fee, monthly_start: fee ? '2026-09' : null, billing_day: 5, ...extra })
const pay = (project_id: string, period: string): Payment => ({ id: project_id + period, project_id, amount: 0, due_date: null, paid_at: period + '-05', method: null, note: null, kind: 'monthly', period })
const today = new Date(2026, 9, 20)

describe('clientes', () => {
  it('agrupa los trabajos de una misma persona sin importar tildes ni mayúsculas', () => {
    const g = groupClients([proj('a', 'Página', 'Barbería Imperio'), proj('b', 'Sistema de citas', 'barberia imperio')], [], '2026-10', today)
    expect(g).toHaveLength(1)
    expect(g[0].projects).toHaveLength(2)
    expect(clientKey('Barbería  Imperio')).toBe('barberia imperio')
    expect(clientName(proj('a', 'Sin cliente', null))).toBe('Sin cliente')
  })
  it('lo atrasado va primero, luego por cobrar, luego pagado', () => {
    const g = groupClients([proj('a', 'A', 'Ana', 100), proj('b', 'B', 'Beto', 100), proj('c', 'C', 'Carla', 100), proj('d', 'D', 'Dani')], [pay('a', '2026-09'), pay('a', '2026-10'), pay('c', '2026-09')], '2026-10', today)
    expect(g.map((x) => [x.name, x.state])).toEqual([['Beto', 'late'], ['Carla', 'late'], ['Ana', 'paid'], ['Dani', 'none']])
  })
})
