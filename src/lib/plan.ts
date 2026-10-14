/** Calculadora de reparto: de cada ingreso, cuánto va a gastos, ahorro, ofrendas y gustos. */
export type BucketKind = 'spend' | 'save' | 'give' | 'free'
export type Bucket = { id: string; name: string; pct: number; kind: BucketKind }

const b = (id: string, name: string, pct: number, kind: BucketKind): Bucket => ({ id, name, pct, kind })
export const PRESETS: { id: string; name: string; note: string; buckets: Bucket[] }[] = [
  { id: 'classic', name: '50 · 30 · 20', note: 'Necesidades, gustos y ahorro. La regla clásica.', buckets: [b('spend', 'Necesidades', 50, 'spend'), b('free', 'Gustos', 30, 'free'), b('save', 'Ahorro', 20, 'save')] },
  { id: 'save-first', name: 'Ahorro primero', note: 'Lo primero que apartas es el ahorro.', buckets: [b('save', 'Ahorro', 30, 'save'), b('spend', 'Gastos', 50, 'spend'), b('free', 'Libre', 20, 'free')] },
  { id: 'tithe', name: 'Con diezmo y ofrendas', note: 'Separa primero lo que das, luego el resto.', buckets: [b('give', 'Diezmo y ofrendas', 10, 'give'), b('spend', 'Gastos', 50, 'spend'), b('save', 'Ahorro', 20, 'save'), b('free', 'Libre', 20, 'free')] },
]

const r2 = (n: number) => Math.round(n * 100) / 100

export const pctUsed = (buckets: Bucket[]) => buckets.reduce((s, x) => s + x.pct, 0)
/** Porcentaje que falta por asignar (negativo si te pasaste). */
export const pctLeft = (buckets: Bucket[]) => 100 - pctUsed(buckets)

/** Reparte un monto: cada parte en centavos exactos, y la diferencia por redondeo se la lleva la parte más grande para que todo cuadre. */
export function allocate(income: number, buckets: Bucket[]): { id: string; pct: number; amount: number }[] {
  const base = Math.max(0, income)
  const rows = buckets.map((x) => ({ id: x.id, pct: x.pct, amount: Math.floor(((base * x.pct) / 100) * 100 + 1e-9) / 100 }))
  if (pctUsed(buckets) === 100 && rows.length > 0) {
    const diff = r2(base - rows.reduce((s, x) => s + x.amount, 0))
    if (diff !== 0) { const big = rows.reduce((m, x) => (x.pct > m.pct ? x : m), rows[0]); big.amount = r2(big.amount + diff) }
  }
  return rows
}

/** Cuánto llevas contra lo que te toca: ok si estás dentro, over si te pasaste (en ahorro, "over" es bueno). */
export function progress(target: number, actual: number): { pct: number; left: number; over: boolean } {
  return { pct: target > 0 ? Math.round((actual / target) * 100) : 0, left: r2(Math.max(0, target - actual)), over: actual > target }
}

/** Qué parte de tu ingreso se va en lo fijo (por ejemplo, suscripciones). */
export const shareOf = (part: number, income: number) => (income > 0 ? Math.round((part / income) * 100) : 0)

/** Promedio de ingreso de los meses que sí tuvieron ingreso (los meses en cero no bajan el promedio). */
export function avgIncome(series: { income: number }[]): number {
  const m = series.filter((x) => x.income > 0)
  return m.length ? r2(m.reduce((s, x) => s + x.income, 0) / m.length) : 0
}

/** Pasa un plan guardado (posiblemente viejo o dañado) a algo seguro. */
export function cleanBuckets(raw: unknown): Bucket[] | null {
  if (!Array.isArray(raw)) return null
  const out = raw.filter((x): x is Bucket => x && typeof x.id === 'string' && typeof x.name === 'string' && typeof x.pct === 'number' && ['spend', 'save', 'give', 'free'].includes(x.kind)).map((x) => ({ ...x, pct: Math.min(100, Math.max(0, Math.round(x.pct))), name: x.name.slice(0, 40) })).slice(0, 8)
  return out.length ? out : null
}
