import { currentMonth, type Payment, type Project } from './projects'
import { monthlyClients, type ClientState } from './incoming'

/** Un cliente es el nombre que le pusiste a sus trabajos (o el título del trabajo si no tiene). */
export const clientName = (p: Pick<Project, 'client' | 'title'>) => (p.client?.trim() || p.title).trim()
export const clientKey = (name: string) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

export type ClientSummary = {
  key: string
  name: string
  projects: Project[]
  /** Trabajos que siguen abiertos (no cerrados). */
  active: Project[]
  /** Estado del cobro del mes: de su mensualidad, o «none» si no tiene acuerdo de cobro vigente. */
  state: ClientState | 'none'
  fee: number
  owed: number
}

export function groupClients(projects: Project[], payments: Payment[], month = currentMonth(), today = new Date()): ClientSummary[] {
  const by = new Map<string, Project[]>()
  for (const p of projects) { const k = clientKey(clientName(p)); by.set(k, [...(by.get(k) ?? []), p]) }
  return [...by.entries()].map(([key, list]) => {
    const rows = monthlyClients(list, payments, month, today)
    const worst: ClientState | 'none' = rows.length === 0 ? 'none' : rows.some((r) => r.state === 'late' || r.lateMonths.length > 0) ? 'late' : rows.some((r) => r.state === 'pending') ? 'pending' : 'paid'
    return {
      key, name: clientName(list[0]), projects: list.sort((a, b) => b.month.localeCompare(a.month)),
      active: list.filter((p) => p.status !== 'closed'),
      state: worst, fee: rows.reduce((s, r) => s + r.fee, 0), owed: rows.reduce((s, r) => s + r.owed, 0),
    }
  }).sort((a, b) => ({ late: 0, pending: 1, paid: 2, none: 3 }[a.state] - { late: 0, pending: 1, paid: 2, none: 3 }[b.state]) || a.name.localeCompare(b.name, 'es'))
}
