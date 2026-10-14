import { getSettings, patchSettings } from './settings'
import { supabase } from './supabase'

/** Regla de ahorro conectada con Trabajos: de cada cobro, un porcentaje se aparta para una meta. */
export type Rule = { pct: number; goalId: string | null; auto: boolean }
export const NO_RULE: Rule = { pct: 0, goalId: null, auto: false }
export const PCTS = [10, 15, 20, 30]

const r2 = (n: number) => Math.round(n * 100) / 100
export const ruleActive = (r: Rule) => r.pct > 0 && Boolean(r.goalId)
export const ruleAmount = (amount: number, pct: number) => r2((Number(amount) * Math.min(100, Math.max(0, pct))) / 100)

/** Lee un valor guardado (posiblemente viejo o dañado) como una regla segura. */
export function cleanRule(raw: unknown): Rule {
  const x = raw as Partial<Rule> | null
  if (!x || typeof x !== 'object') return NO_RULE
  const pct = typeof x.pct === 'number' ? Math.min(100, Math.max(0, Math.round(x.pct))) : 0
  return { pct, goalId: typeof x.goalId === 'string' ? x.goalId : null, auto: x.auto === true }
}

export type WorkStats = { collected: number; shouldSave: number; saved: number; left: number }
/** Del mes: cuánto cobraste de trabajos, cuánto te tocaba apartar según tu regla y cuánto apartaste de esos cobros. */
export function workStats(payments: { paid_at: string | null; amount: number }[], moves: { tx_date: string; amount: number; source_payment_id?: string | null }[], rule: Rule, month: string): WorkStats {
  const collected = r2(payments.filter((p) => p.paid_at?.startsWith(month)).reduce((s, p) => s + Number(p.amount), 0))
  const shouldSave = ruleActive(rule) ? ruleAmount(collected, rule.pct) : 0
  const saved = r2(moves.filter((m) => m.source_payment_id && m.tx_date.startsWith(month) && Number(m.amount) > 0).reduce((s, m) => s + Number(m.amount), 0))
  return { collected, shouldSave, saved, left: r2(Math.max(0, shouldSave - saved)) }
}

export const loadRule = async (): Promise<Rule> => cleanRule(((await getSettings()) as { savingsRule?: unknown }).savingsRule)
export const saveRule = (r: Rule) => patchSettings({ savingsRule: r } as never)

/** Aparta el porcentaje de un cobro: suma a la meta y deja el aporte anotado con su origen. Devuelve el monto apartado, o null si falló. */
export async function applyRule(o: { goalId: string; amount: number; accountId: string | null; title: string; paymentId: string | null; date: string }): Promise<number | null> {
  if (!(o.amount > 0)) return null
  const { data: g, error } = await supabase.from('savings_goals').select('saved').eq('id', o.goalId).single()
  if (error || !g) return null
  const up = await supabase.from('savings_goals').update({ saved: r2(Number(g.saved) + o.amount) }).eq('id', o.goalId)
  if (up.error) return null
  const mv = await supabase.from('fin_goal_moves').insert({ goal_id: o.goalId, account_id: o.accountId, amount: o.amount, tx_date: o.date, reason: `Cobro de ${o.title}`, reason_kind: null, plan_id: null, source_payment_id: o.paymentId })
  return mv.error ? null : o.amount
}
