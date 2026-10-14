import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Tx } from './finance'
import { supabase } from './supabase'

export type Status = 'idea' | 'active' | 'review' | 'delivered' | 'closed'
export const STATUSES: { id: Status; label: string; color: string }[] = [
  { id: 'idea', label: 'Idea', color: 'var(--ink-faint)' },
  { id: 'active', label: 'En curso', color: 'var(--dev)' },
  { id: 'review', label: 'En revisión', color: 'var(--music)' },
  { id: 'delivered', label: 'Entregado', color: 'var(--personal)' },
  { id: 'closed', label: 'Cerrado', color: 'var(--pos)' },
]
export const statusMeta = (s: Status) => STATUSES.find((x) => x.id === s)!

export type CheckTask = { id: string; text: string; done: boolean }

export type Project = {
  id: string
  title: string
  client: string | null
  status: Status
  month: string
  due_date: string | null
  amount: number
  currency: string
  site_url: string | null
  notes: string | null
  checklist: CheckTask[]
  /** Cobro único de arranque (instalación, inscripción). */
  setup_fee?: number
  /** Mensualidad que se repite cada mes, desde `monthly_start` hasta `monthly_end` (o sin fin). */
  monthly_fee?: number
  billing_day?: number | null
  monthly_start?: string | null
  monthly_end?: string | null
  /** Cuenta a la que cae lo que cobras de este trabajo. */
  account_id?: string | null
  reminder_event_id?: string | null
}
export type NewProject = Omit<Project, 'id'>

export type Payment = {
  id: string
  project_id: string
  amount: number
  due_date: string | null
  paid_at: string | null
  method: string | null
  note: string | null
  kind?: PayKind
  period?: string | null
  account_id?: string | null
}
export type PayKind = 'setup' | 'monthly' | 'other'
export type NewPayment = Omit<Payment, 'id'>

/** Todo el dinero del sistema es en quetzales. */
export const CURRENCIES = ['GTQ']

const GTQ = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 2 })
/** Siempre quetzales (Q 1,200.00); el segundo parámetro se conserva por compatibilidad. */
export const money = (n: number, _currency?: string) => GTQ.format(n)

export const currentMonth = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
export function shiftMonth(m: string, delta: number) {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(y, mo - 1 + delta, 1)
  return currentMonth(d)
}
export function monthLabel(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo - 1, 1).toLocaleDateString('es', { month: 'long', year: 'numeric' })
}

export type Totals = { billed: number; received: number; pending: number }

/** Totales por moneda: lo que vale el trabajo, lo ya cobrado y lo que falta por cobrar. */
export function summarize(projects: Project[], payments: Payment[]): Record<string, Totals> {
  const out: Record<string, Totals> = {}
  for (const p of projects) {
    const t = (out[p.currency] ??= { billed: 0, received: 0, pending: 0 })
    t.billed += Number(p.amount)
    t.received += payments.filter((x) => x.project_id === p.id && x.paid_at).reduce((s, x) => s + Number(x.amount), 0)
  }
  for (const t of Object.values(out)) t.pending = Math.max(0, Math.round((t.billed - t.received) * 100) / 100)
  return out
}

export const receivedOf = (p: Project, payments: Payment[]) =>
  payments.filter((x) => x.project_id === p.id && x.paid_at).reduce((s, x) => s + Number(x.amount), 0)

// ───────── Instalación + mensualidad ─────────
const r2 = (n: number) => Math.round(n * 100) / 100
const monthNum = (m: string) => { const [y, mo] = m.split('-').map(Number); return y * 12 + (mo - 1) }

/** ¿Este trabajo cobra instalación o mensualidad? */
export const hasBilling = (p: Project) => Number(p.setup_fee ?? 0) > 0 || (Number(p.monthly_fee ?? 0) > 0 && Boolean(p.monthly_start))

/** Meses en que toca cobrar la mensualidad, desde el inicio hasta `upTo` (sin pasar del fin). */
export function monthlyPeriods(p: Project, upTo: string): string[] {
  if (!(Number(p.monthly_fee ?? 0) > 0) || !p.monthly_start) return []
  const end = p.monthly_end && monthNum(p.monthly_end) < monthNum(upTo) ? p.monthly_end : upTo
  const out: string[] = []
  for (let n = monthNum(p.monthly_start); n <= monthNum(end); n++) out.push(`${Math.floor(n / 12)}-${String((n % 12) + 1).padStart(2, '0')}`)
  return out
}
/** ¿La mensualidad de este mes aplica (ya empezó y no ha terminado)? */
export const activeIn = (p: Project, month: string) => monthlyPeriods(p, month).includes(month)

/** Mes (AAAA-MM) en que toca la instalación: el de inicio de la mensualidad, o el del trabajo. */
export const setupMonth = (p: Project) => p.monthly_start || p.month

export type PeriodState = { period: string; paid: boolean; paid_at: string | null; late: boolean }
/** Estado de cada mensualidad hasta `upTo`. Atrasada: el mes ya pasó, o es este mes y ya pasó el día de cobro. */
export function monthlyStates(p: Project, payments: Payment[], upTo: string, today = new Date()): PeriodState[] {
  const now = currentMonth(today)
  return monthlyPeriods(p, upTo).map((period) => {
    const got = payments.find((x) => x.project_id === p.id && x.kind === 'monthly' && x.period === period && x.paid_at)
    const late = !got && (period < now || (period === now && p.billing_day != null && today.getDate() > p.billing_day))
    return { period, paid: Boolean(got), paid_at: got?.paid_at ?? null, late }
  })
}
export const setupPaid = (p: Project, payments: Payment[]) => payments.some((x) => x.project_id === p.id && x.kind === 'setup' && x.paid_at)

/** Lo que vale el trabajo hasta `upTo`: monto + instalación + mensualidades transcurridas. */
export const expectedTotal = (p: Project, upTo: string) => r2(Number(p.amount) + Number(p.setup_fee ?? 0) + monthlyPeriods(p, upTo).length * Number(p.monthly_fee ?? 0))

/** Lo cobrado/por cobrar visto desde un mes. Los trabajos con instalación o mensualidad se miden mes a mes;
 *  el atraso de meses anteriores se suma a "por cobrar". Los demás conservan el cálculo de siempre. */
export function summarizeMonth(projects: Project[], payments: Payment[], month: string, today = new Date()): Record<string, Totals> {
  const out: Record<string, Totals> = {}
  const t = (c: string) => (out[c] ??= { billed: 0, received: 0, pending: 0 })
  const base: Project[] = []
  for (const p of projects) {
    if (!hasBilling(p)) { base.push(p); continue }
    const row = t(p.currency)
    const paidIn = (pay: Payment) => pay.project_id === p.id && pay.paid_at && (pay.period ?? pay.paid_at.slice(0, 7)) === month
    const billed = (p.month === month ? Number(p.amount) : 0) + (setupMonth(p) === month ? Number(p.setup_fee ?? 0) : 0) + (activeIn(p, month) ? Number(p.monthly_fee ?? 0) : 0)
    const got = payments.filter(paidIn).reduce((s, x) => s + Number(x.amount), 0)
    row.billed += billed
    row.received += got
    const owed = Math.max(0, billed - got)
    const late = month === currentMonth(today) ? monthlyStates(p, payments, month, today).filter((x) => x.late && x.period < month).length * Number(p.monthly_fee ?? 0) : 0
    const setupLate = month === currentMonth(today) && setupMonth(p) < month && !setupPaid(p, payments) ? Number(p.setup_fee ?? 0) : 0
    row.pending += owed + late + setupLate
  }
  for (const [c, x] of Object.entries(summarize(base, payments))) { const row = t(c); row.billed += x.billed; row.received += x.received; row.pending += x.pending }
  for (const row of Object.values(out)) { row.billed = r2(row.billed); row.received = r2(row.received); row.pending = r2(row.pending) }
  return out
}

export type WorkTx = Tx & { work: { project_id: string; title: string; kind: PayKind; period: string | null } }
/** Los cobros recibidos de Trabajos, como movimientos de ingreso que dicen de dónde vienen. */
export function workIncomeRows(projects: Project[], payments: Payment[]): WorkTx[] {
  const name = new Map(projects.map((p) => [p.id, p]))
  return payments.filter((x) => x.paid_at && name.has(x.project_id)).map((x) => {
    const p = name.get(x.project_id)!
    return { id: `work-${x.id}`, kind: 'income' as const, amount: Number(x.amount), currency: p.currency, category: `Trabajo: ${p.title}`, area: 'web', tx_date: x.paid_at!, note: null, account_id: x.account_id ?? null, work: { project_id: p.id, title: p.title, kind: x.kind ?? 'other', period: x.period ?? null } }
  })
}
export const workKindLabel = (w: WorkTx['work']) => (w.kind === 'setup' ? 'Instalación' : w.kind === 'monthly' && w.period ? `Mensualidad de ${monthLabel(w.period)}` : 'Cobro')

/** Cobros ya recibidos que cayeron en una cuenta (para el saldo de la cuenta). */
export const paidTo = (payments: Payment[]) => payments.filter((x) => x.paid_at && x.account_id).map((x) => ({ account_id: x.account_id as string, amount: Number(x.amount) }))

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [p, pay] = await Promise.all([
      supabase.from('projects').select('*').order('due_date', { nullsFirst: false }),
      supabase.from('payments').select('*').order('created_at'),
    ])
    if (p.error || pay.error) { setError('No pude cargar los trabajos.'); setLoading(false); return }
    setError('')
    setProjects(((p.data ?? []) as Project[]).map((x) => ({ ...x, amount: Number(x.amount) })))
    setPayments(((pay.data ?? []) as Payment[]).map((x) => ({ ...x, amount: Number(x.amount) })))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  const loadRef = useRef(load)
  loadRef.current = load
  useEffect(() => {
    const ch = supabase.channel(`rt-projects-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => loadRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => loadRef.current())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const fail = (m: string) => { setError(m); load() }

  const actions = useMemo(() => ({
    add: async (v: NewProject) => {
      const { data, error } = await supabase.from('projects').insert(v).select().single()
      if (error || !data) { fail('No se pudo crear el trabajo.'); return null }
      const row = { ...(data as Project), amount: Number((data as Project).amount) }
      setProjects((l) => [...l, row])
      return row
    },
    update: async (id: string, patch: Partial<NewProject>) => {
      setProjects((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)))
      const { error } = await supabase.from('projects').update(patch).eq('id', id)
      if (error) fail('No se guardó el cambio.')
    },
    remove: async (id: string) => {
      setProjects((l) => l.filter((x) => x.id !== id))
      setPayments((l) => l.filter((x) => x.project_id !== id))
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) fail('No se pudo eliminar.')
    },
    addPayment: async (v: NewPayment) => {
      const { data, error } = await supabase.from('payments').insert(v).select().single()
      if (error || !data) return fail('No se pudo registrar el cobro.')
      setPayments((l) => [...l, { ...(data as Payment), amount: Number((data as Payment).amount) }])
    },
    updatePayment: async (id: string, patch: Partial<NewPayment>) => {
      setPayments((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)))
      const { error } = await supabase.from('payments').update(patch).eq('id', id)
      if (error) fail('No se guardó el cobro.')
    },
    removePayment: async (id: string) => {
      setPayments((l) => l.filter((x) => x.id !== id))
      const { error } = await supabase.from('payments').delete().eq('id', id)
      if (error) fail('No se pudo eliminar el cobro.')
    },
    clearError: () => setError(''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [load])

  return { projects, payments, loading, error, ...actions }
}
