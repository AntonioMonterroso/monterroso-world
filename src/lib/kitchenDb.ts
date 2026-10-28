import { norm, toShop } from './kitchen'
import { SEED_PANTRY, SEED_RECIPES } from './kitchenSeed'
import { supabase } from './supabase'

export const FOOD_CATEGORY = 'Súper y comida'

let seeding: Promise<boolean> | null = null

/** La primera vez que se abre Cocina (despensa y recetas vacías) carga la despensa y el recetario inicial. Devuelve true si cargó algo. */
export function ensureKitchenSeed(): Promise<boolean> {
  seeding ??= (async () => {
    const [p, r] = await Promise.all([
      supabase.from('pantry_items').select('id', { count: 'exact', head: true }),
      supabase.from('recipes').select('id', { count: 'exact', head: true }),
    ])
    if (p.error || r.error || (p.count ?? 0) > 0 || (r.count ?? 0) > 0) return false
    const a = await supabase.from('pantry_items').insert(SEED_PANTRY)
    const b = await supabase.from('recipes').insert(SEED_RECIPES)
    return !a.error || !b.error
  })().finally(() => { setTimeout(() => { seeding = null }, 0) })
  return seeding
}

/** Manda a Por comprar lo que falta, sin repetir lo que ya está pendiente. Devuelve cuántos agregó. */
export async function sendToShopping(names: string[]): Promise<number | null> {
  const { data, error } = await supabase.from('shopping_items').select('name').eq('status', 'pending')
  if (error) return null
  const add = toShop(names, data ?? [])
  if (!add.length) return 0
  const ins = await supabase.from('shopping_items').insert(add.map((name) => ({ name, priority: 2, category: FOOD_CATEGORY, currency: 'GTQ', status: 'pending' })))
  return ins.error ? null : add.length
}

/** Al comprar algo del súper, vuelve a aparecer «en casa» en la despensa. */
export async function restockPantry(name: string) {
  const { data } = await supabase.from('pantry_items').select('id,name').eq('have', false)
  const hit = (data ?? []).find((p) => norm(p.name) === norm(name))
  if (hit) await supabase.from('pantry_items').update({ have: true }).eq('id', hit.id)
}
