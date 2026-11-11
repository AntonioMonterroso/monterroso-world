import { missing, norm, toShop, type PantryItem, type Recipe } from './kitchen'

/** Plan de comidas de la semana: qué recetas cada día. Vive en tus ajustes (mealPlan), sin tabla nueva. */
export type MealPlan = Record<string, string[]>

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** Lunes a domingo de la semana de `today` (offset 1 = la siguiente). */
export function weekDays(today: string, offset = 0): string[] {
  const d = new Date(`${today}T12:00:00`)
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow + offset * 7)
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(d); x.setDate(d.getDate() + i); return iso(x) })
}

/** Solo deja días desde el lunes pasado en adelante y recetas que existan. */
export function cleanPlan(raw: unknown, today: string, ids?: Set<string>): MealPlan {
  if (!raw || typeof raw !== 'object') return {}
  const from = weekDays(today, -1)[0]
  const out: MealPlan = {}
  for (const [day, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < from || !Array.isArray(v)) continue
    const list = v.filter((x): x is string => typeof x === 'string' && (!ids || ids.has(x))).slice(0, 6)
    if (list.length) out[day] = list
  }
  return out
}

/** Lo que falta comprar para cocinar lo planeado esos días: sin lo que ya hay en la despensa ni lo que ya está en Por comprar. */
export function shoppingFor(plan: MealPlan, days: string[], recipes: Recipe[], pantry: PantryItem[], pending: { name: string }[]): { name: string; for: string[] }[] {
  const need = new Map<string, { name: string; for: string[] }>()
  for (const day of days) for (const rid of plan[day] ?? []) {
    const r = recipes.find((x) => x.id === rid)
    if (!r) continue
    for (const n of missing(r, pantry)) {
      const k = norm(n)
      const cur = need.get(k) ?? { name: n, for: [] }
      if (!cur.for.includes(r.title)) cur.for.push(r.title)
      need.set(k, cur)
    }
  }
  const names = toShop([...need.values()].map((x) => x.name), pending)
  return names.map((n) => need.get(norm(n))!)
}
