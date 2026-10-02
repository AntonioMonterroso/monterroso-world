import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
}
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
