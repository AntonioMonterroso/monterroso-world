import { dayNum } from './recur'

export type Stuff = { id: string; name: string; kind: 'placed' | 'lent'; place: string | null; person: string | null; remind_on: string | null; event_id: string | null; returned: boolean; returned_on: string | null; created_at: string }
export type Promise_ = { id: string; text: string; person: string | null; due_date: string | null; event_id: string | null; done: boolean; done_on: string | null; created_at: string }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Busca por nombre, lugar o persona, sin importar acentos ni mayúsculas. Todas las palabras deben aparecer. */
export function findStuff(items: Stuff[], q: string): Stuff[] {
  const toks = norm(q).split(/\s+/).filter(Boolean)
  if (!toks.length) return items
  return items.filter((i) => { const hay = norm(`${i.name} ${i.place ?? ''} ${i.person ?? ''}`); return toks.every((t) => hay.includes(t)) })
}

export const daysLent = (i: Pick<Stuff, 'created_at'>, today: string) => Math.max(0, dayNum(today) - dayNum(i.created_at.slice(0, 10)))

/** Cosas prestadas que ya toca pedir de vuelta (fecha cumplida) o que llevan mucho tiempo fuera. */
export function lentToChase(items: Stuff[], today: string, longDays = 21): Stuff[] {
  return items.filter((i) => i.kind === 'lent' && !i.returned && ((i.remind_on && i.remind_on <= today) || (!i.remind_on && daysLent(i, today) >= longDays)))
}

export type PromiseState = 'overdue' | 'today' | 'soon' | 'open'
export function promiseState(p: Pick<Promise_, 'due_date' | 'done'>, today: string): PromiseState {
  if (!p.due_date) return 'open'
  const d = dayNum(p.due_date) - dayNum(today)
  return d < 0 ? 'overdue' : d === 0 ? 'today' : d <= 2 ? 'soon' : 'open'
}
const rank: Record<PromiseState, number> = { overdue: 0, today: 1, soon: 2, open: 3 }
export const sortPromises = (list: Promise_[], today: string) => [...list].sort((a, b) => rank[promiseState(a, today)] - rank[promiseState(b, today)] || (a.due_date ?? '9').localeCompare(b.due_date ?? '9') || a.created_at.localeCompare(b.created_at))

export function dueLabel(due: string | null, today: string): string {
  if (!due) return 'Sin fecha'
  const d = dayNum(due) - dayNum(today)
  if (d < -1) return `Venció hace ${-d} días`
  if (d === -1) return 'Venció ayer'
  if (d === 0) return 'Hoy'
  if (d === 1) return 'Mañana'
  return `En ${d} días`
}
