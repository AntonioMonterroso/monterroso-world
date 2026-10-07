import { addPeriod } from './finance'
import { dayNum, isoFromNum } from './recur'

export type Unit = 'week' | 'month' | 'year'
export type Renewal = { id: string; name: string; every_n: number; unit: Unit; next_due: string; lead_days: number; note: string | null; event_id: string | null }

export const UNIT_LABEL: Record<Unit, [string, string]> = { week: ['semana', 'semanas'], month: ['mes', 'meses'], year: ['año', 'años'] }
export const every = (r: Pick<Renewal, 'every_n' | 'unit'>) => (r.every_n === 1 ? `Cada ${UNIT_LABEL[r.unit][0]}` : `Cada ${r.every_n} ${UNIT_LABEL[r.unit][1]}`)

/** Suma n meses conservando el día cuando se puede (31 → último día del mes). */
function addMonths(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(y, m - 1 + n, 1)
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`
}

/** Siguiente vencimiento tras renovar. Si ya iba atrasado, cuenta desde hoy para no quedar vencido otra vez. */
export function nextDue(r: Pick<Renewal, 'every_n' | 'unit' | 'next_due'>, today: string): string {
  const base = r.next_due < today ? today : r.next_due
  if (r.unit === 'week') return isoFromNum(dayNum(base) + 7 * r.every_n)
  return addMonths(base, r.unit === 'year' ? 12 * r.every_n : r.every_n)
}

export type RState = 'overdue' | 'soon' | 'later'
export const daysUntil = (r: Pick<Renewal, 'next_due'>, today: string) => dayNum(r.next_due) - dayNum(today)
export const stateOf = (r: Pick<Renewal, 'next_due' | 'lead_days'>, today: string): RState => { const d = daysUntil(r, today); return d < 0 ? 'overdue' : d <= r.lead_days ? 'soon' : 'later' }
export const sortRenewals = (l: Renewal[]) => [...l].sort((a, b) => a.next_due.localeCompare(b.next_due))

export function whenLabel(d: number): string {
  if (d < -1) return `Venció hace ${-d} días`
  if (d === -1) return 'Venció ayer'
  if (d === 0) return 'Vence hoy'
  if (d === 1) return 'Vence mañana'
  if (d <= 60) return `En ${d} días`
  return `En ${Math.round(d / 30)} meses`
}

/** Fecha en que debe sonar el aviso: lead_days antes (nunca antes de hoy). */
export const remindDate = (r: Pick<Renewal, 'next_due' | 'lead_days'>, today: string) => { const n = dayNum(r.next_due) - r.lead_days; return isoFromNum(Math.max(n, dayNum(today))) }

export const SEEDS = ['Dominio de mi página', 'Seguro del carro', 'Cuerdas de la guitarra', 'Parches de la batería', 'Revisión del carro', 'Cita con el dentista']
export { addPeriod }
