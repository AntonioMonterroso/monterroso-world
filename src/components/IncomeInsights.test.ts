import { describe, expect, it } from 'vitest'
import { byClient } from './IncomeInsights'
import type { Payment, Project } from '../lib/projects'

const p = (id: string, client: string): Project => ({ id, title: id, client, status: 'active', month: '2026-11', due_date: null, amount: 0, currency: 'GTQ', site_url: null, notes: null, checklist: [] })
const pay = (project_id: string, amount: number, paid_at: string | null): Payment => ({ id: Math.random().toString(), project_id, amount, due_date: null, paid_at, method: null, note: null })

describe('cobros por cliente', () => {
  it('agrupa por cliente del mes y saca el porcentaje', () => {
    const r = byClient([p('a', 'Imperio'), p('b', 'Imperio'), p('c', 'Dulce')], [pay('a', 300, '2026-11-03'), pay('b', 300, '2026-11-09'), pay('c', 400, '2026-11-10'), pay('c', 999, '2026-10-10'), pay('c', 50, null)], '2026-11')
    expect(r).toEqual([{ name: 'Imperio', total: 600, pct: 60 }, { name: 'Dulce', total: 400, pct: 40 }])
  })
})
