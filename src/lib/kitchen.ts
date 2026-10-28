export type Meal = 'desayuno' | 'almuerzo' | 'cena' | 'sopa' | 'rapida' | 'postre' | 'extra'
export type Ingredient = { n: string; k: string | null; opt?: boolean }
export type Recipe = {
  id: string
  title: string
  meal: Meal
  minutes: number | null
  servings: number | null
  ingredients: Ingredient[]
  steps: string[]
  tips: string | null
  favorite: boolean
  cooked_count: number
  last_cooked: string | null
}
export type PantryItem = { id: string; name: string; category: string; have: boolean; notes: string | null }

export const MEALS: { id: Meal; label: string }[] = [
  { id: 'desayuno', label: 'Desayuno' },
  { id: 'almuerzo', label: 'Almuerzo' },
  { id: 'cena', label: 'Cena' },
  { id: 'sopa', label: 'Sopa' },
  { id: 'rapida', label: 'Rápida' },
  { id: 'postre', label: 'Postre' },
  { id: 'extra', label: 'Extra' },
]
export const mealLabel = (m: Meal) => MEALS.find((x) => x.id === m)?.label ?? m

export const PANTRY_CATEGORIES = ['Proteínas', 'Lácteos y huevos', 'Verduras y hierbas', 'Pan, masa y tortillas', 'Pastas y granos', 'Especias', 'Aceites y vinagres', 'Salsas y enlatados', 'Dulces y bebidas', 'Otro']

/** Minúsculas y sin tildes, para comparar nombres de ingredientes. */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** Ingredientes necesarios (no opcionales y controlados por la despensa) que no hay en casa. */
export function missing(r: Pick<Recipe, 'ingredients'>, pantry: Pick<PantryItem, 'name' | 'have'>[]): string[] {
  const have = new Set(pantry.filter((p) => p.have).map((p) => norm(p.name)))
  const out: string[] = []
  for (const i of r.ingredients) {
    if (!i.k || i.opt || have.has(norm(i.k))) continue
    if (!out.some((x) => norm(x) === norm(i.k!))) out.push(i.k)
  }
  return out
}

/** Recetas ordenadas para «¿qué cocino hoy?»: primero las que tienen todo, luego las que piden menos cosas; favoritas antes. */
export function rankRecipes<T extends Pick<Recipe, 'ingredients' | 'favorite' | 'title'>>(rs: T[], pantry: Pick<PantryItem, 'name' | 'have'>[]) {
  return rs
    .map((r) => ({ r, miss: missing(r, pantry) }))
    .sort((a, b) => a.miss.length - b.miss.length || Number(b.r.favorite) - Number(a.r.favorite) || a.r.title.localeCompare(b.r.title, 'es'))
}

/** Busca en la despensa el ingrediente que menciona una línea escrita a mano («2 tazas de avena» → Avena). Gana el nombre más largo. */
export function guessKey(line: string, pantry: Pick<PantryItem, 'name'>[]): string | null {
  const l = ` ${norm(line)} `
  let best: string | null = null
  for (const p of pantry) {
    const n = norm(p.name)
    if (n && l.includes(` ${n} `) && (!best || n.length > norm(best).length)) best = p.name
  }
  return best
}

/** Convierte el texto del editor (una línea por ingrediente; «(opcional)» al final lo marca opcional) en ingredientes.
 *  Las líneas que no cambiaron conservan el ingrediente que ya tenían, aunque no esté en la despensa (p. ej. Leche). */
export function parseIngredients(text: string, pantry: Pick<PantryItem, 'name'>[], prev: Ingredient[] = []): Ingredient[] {
  return text.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => {
    const opt = /\(opcional\)\s*$/i.test(s)
    const n = s.replace(/\s*\(opcional\)\s*$/i, '').trim()
    const old = prev.find((p) => p.n === n)
    const k = old ? old.k : guessKey(n, pantry)
    return opt ? { n, k, opt: true } : { n, k }
  })
}
export const ingredientsText = (is: Ingredient[]) => is.map((i) => (i.opt ? `${i.n} (opcional)` : i.n)).join('\n')

/** Nombres que todavía no están pendientes en Por comprar (sin repetir). */
export function toShop(names: string[], pending: { name: string }[]): string[] {
  const seen = new Set(pending.map((p) => norm(p.name)))
  return names.filter((n) => { const k = norm(n); if (seen.has(k)) return false; seen.add(k); return true })
}
