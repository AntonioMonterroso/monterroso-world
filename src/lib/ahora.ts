import { suggest, type Suggestion, type SuggestInput } from './suggest'

/** La tarjeta «Ahora» de Hoy: las reglas de suggest.ts más cobro por hacer, retiro de ahorro y «¿qué cocino?»,
 *  con tipo (nunca dos del mismo), acción principal y posponer 3 horas sin castigo. */
export type Inline = 'event-done' | 'promise-done' | 'pick' | 'anotar' | 'cobrado'
export type Item = Suggestion & { kind: string; act: string; inline?: Inline; ref?: string }

export type Extra = {
  /** Clientes con mensualidad que ya tocan cobrar o van atrasados. */
  collect?: { id: string; title: string; late: boolean }[]
  /** Retiros de ahorro planeados que ya llegaron a su fecha. */
  savings?: { id: string; amount: string; goal: string }[]
  /** Cuántas recetas se pueden hacer ya con lo que hay en casa. */
  cookReady?: number
  /** Propuestas enviadas hace 3 días o más sin respuesta. */
  quotes?: { id: string; client: string; days: number }[]
}

export const SNOOZE_MS = 3 * 60 * 60 * 1000
const KEY = 'mw_snooze'

export type Snoozed = Record<string, number>
let mem: Snoozed = {} // respaldo si el navegador no deja guardar
const load = (): Snoozed => { try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as Snoozed) : mem } catch { return mem } }
const store = (v: Snoozed) => { mem = v; try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* sin almacenamiento */ } }
export function readSnoozed(now = Date.now()): Snoozed {
  return Object.fromEntries(Object.entries(load()).filter(([, t]) => typeof t === 'number' && t > now))
}
/** Mañana a las 6 de la mañana (hora local). */
export function tomorrowMorning(now = Date.now()): number { const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(6, 0, 0, 0); return d.getTime() }
export function snooze(id: string, now = Date.now(), until?: number): Snoozed {
  const next = { ...readSnoozed(now), [id]: until ?? now + SNOOZE_MS }
  store(next)
  countSnooze(id, now)
  return next
}

// Cuántas veces pospones lo mismo: si pasa seguido, Hoy sugiere cambiarle la hora (sin regañar)
const CKEY = 'mw_snooze_count'
const WINDOW_MS = 14 * 24 * 60 * 60 * 1000
let cmem: Record<string, number[]> = {}
const cload = (): Record<string, number[]> => { try { const raw = localStorage.getItem(CKEY); return raw ? (JSON.parse(raw) as Record<string, number[]>) : cmem } catch { return cmem } }
function countSnooze(id: string, now: number): void {
  const all = cload()
  const next: Record<string, number[]> = {}
  for (const [k, v] of Object.entries(all)) { const keep = v.filter((t) => now - t < WINDOW_MS); if (keep.length) next[k] = keep }
  next[id] = [...(next[id] ?? []), now]
  cmem = next
  try { localStorage.setItem(CKEY, JSON.stringify(next)) } catch { /* sin almacenamiento */ }
}
/** Veces que se pospuso esta sugerencia en las últimas dos semanas. */
export function snoozeCount(id: string, now = Date.now()): number {
  return (cload()[id] ?? []).filter((t) => now - t < WINDOW_MS).length
}

/** Tipo de regla y texto del botón principal según el id que genera suggest(). */
export function describeRule(s: Suggestion): Pick<Item, 'kind' | 'act' | 'inline' | 'ref'> {
  const id = s.id
  if (id === 'next-block') return { kind: 'block-start', act: 'Listo' }
  if (id === 'closing') return { kind: 'block-end', act: 'Anotar lo logrado', inline: 'anotar' }
  if (id.startsWith('exit-')) return { kind: 'exit', act: 'Revisar lista' }
  if (id.startsWith('rt-')) return { kind: 'routine', act: s.title.startsWith('Termina') ? 'Seguir' : 'Empezar' }
  if (id.startsWith('ov-')) return { kind: 'overdue', act: 'Hecho', inline: 'event-done', ref: id.slice(3) }
  if (id.startsWith('pr-')) return { kind: 'promise', act: 'Hecho', inline: 'promise-done', ref: id.slice(3) }
  if (id.startsWith('rn-')) return { kind: 'renewal', act: 'Ver' }
  if (id === 'pick-priorities') return { kind: 'pick', act: 'Elegir', inline: 'pick' }
  if (id === 'do-priorities') return { kind: 'priority', act: 'Enfocarme' }
  if (id === 'chase') return { kind: 'chase', act: 'Ver' }
  if (id.startsWith('fu-') || id === 'to-send') return { kind: 'delivery', act: 'Ver' }
  if (id === 'inbox') return { kind: 'inbox', act: 'Ordenar' }
  if (id === 'habit') return { kind: 'habit', act: 'Ver hábitos' }
  if (id === 'soft-day') return { kind: 'soft', act: 'Una cosa' }
  return { kind: id, act: 'Abrir' }
}

const SOFT_KINDS = new Set(['block-start', 'block-end', 'exit', 'collect', 'promise'])
const inWindow = (m: number, a: number, b: number) => m >= a && m <= b

/** Hasta 3 sugerencias, sin repetir tipo, sin las pospuestas. Con día suave: solo 1 y solo lo que de verdad pesa. */
export function ahora(input: SuggestInput, extra: Extra, o: { soft: boolean; snoozed: Snoozed; limit?: number }): Item[] {
  const items: Item[] = suggest({ ...input, lowEnergy: false }, 20)
    .filter((s) => s.id !== 'free' && s.id !== 'soft-day')
    .map((s) => ({ ...s, ...describeRule(s) }))

  const m = input.nowMin
  if (extra.collect?.length) {
    const c = extra.collect[0]
    items.push({ id: `cobro-${c.id}`, kind: 'collect', title: c.late ? `${c.title} tiene un cobro atrasado` : `Hoy toca cobrar a ${c.title}`, reason: extra.collect.length > 1 ? `Y ${extra.collect.length - 1} cobro${extra.collect.length === 2 ? '' : 's'} más` : 'Un toque y queda registrado', to: '/app/dinero/entra', tone: c.late ? 'soon' : 'now', score: 80, act: 'Cobrado', inline: 'cobrado', ref: c.id })
  }
  for (const p of (extra.savings ?? []).slice(0, 1)) items.push({ id: `ahorro-${p.id}`, kind: 'savings', title: `Tenías planeado sacar ${p.amount}`, reason: `De «${p.goal}». Confirma o mueve la fecha`, to: `/app/dinero/metas?plan=${p.id}`, tone: 'now', score: 70, act: 'Confirmar' })
  if ((extra.cookReady ?? 0) > 0 && (inWindow(m, 11 * 60 + 30, 13 * 60) || inWindow(m, 18 * 60, 19 * 60 + 30))) {
    const n = extra.cookReady!
    items.push({ id: 'cocina', kind: 'cook', title: '¿Qué cocino?', reason: `Puedes hacer ${n} ${n === 1 ? 'receta' : 'recetas'} con lo que hay`, to: '/app/cocina', tone: 'calm', score: 66, act: 'Ver recetas' })
  }

  if (extra.quotes?.length) {
    const q = [...extra.quotes].sort((a, b) => b.days - a.days)[0]
    items.push({ id: `cot-${q.id}`, kind: 'quote', title: `Dar seguimiento a la propuesta de ${q.client}`, reason: `La enviaste hace ${q.days} días y aún no hay respuesta${extra.quotes.length > 1 ? ` (y ${extra.quotes.length - 1} más)` : ''}`, to: '/app/trabajo/propuestas', tone: 'soon', score: 62, act: 'Ver propuesta' })
  }

  const seen = new Set<string>()
  const out: Item[] = []
  for (const it of items.sort((a, b) => b.score - a.score)) {
    if (o.snoozed[it.id] && o.snoozed[it.id] > 0) continue
    if (o.soft && !SOFT_KINDS.has(it.kind)) continue
    if (seen.has(it.kind)) continue
    seen.add(it.kind)
    out.push(it)
  }
  return out.slice(0, o.soft ? 1 : o.limit ?? 3)
}
