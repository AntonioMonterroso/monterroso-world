import { useCallback, useEffect, useMemo } from 'react'
import { DEFAULT_AREAS, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, type Kind } from './finance'
import { supabase } from './supabase'
import { useTable } from './table'

export type FinArea = { id: string; key: string; name: string; color: string; position: number }
export type FinCategory = { id: string; kind: Kind; name: string; position: number }

/** Colores que se pueden elegir para un área. Son tonos del sistema, así que siempre combinan. */
export const AREA_COLORS: { id: string; label: string }[] = [
  { id: 'var(--dev)', label: 'Latón' },
  { id: 'var(--music)', label: 'Celeste' },
  { id: 'var(--personal)', label: 'Arcilla' },
  { id: '#93c9a6', label: 'Verde' },
  { id: '#b9a6d9', label: 'Lila' },
  { id: '#e0a59a', label: 'Coral' },
  { id: '#e3c07a', label: 'Ámbar' },
  { id: '#7fc4c4', label: 'Turquesa' },
]

let seeding: Promise<void> | null = null

/** Primera vez: siembra las áreas y categorías base. Una sola siembra a la vez y nunca de nuevo. */
async function seedOnce() {
  const { data: s } = await supabase.from('settings').select('data').maybeSingle()
  const cur = (s?.data ?? {}) as { finTaxSeeded?: boolean }
  if (cur.finTaxSeeded) return
  await supabase.from('settings').upsert({ data: { ...cur, finTaxSeeded: true } })
  await supabase.from('fin_areas').insert(DEFAULT_AREAS.map((a, i) => ({ ...a, position: i + 1 })))
  await supabase.from('fin_categories').insert([
    ...DEFAULT_EXPENSE_CATEGORIES.map((name, i) => ({ kind: 'expense', name, position: i + 1 })),
    ...DEFAULT_INCOME_CATEGORIES.map((name, i) => ({ kind: 'income', name, position: i + 1 })),
  ])
}

const slug = () => `a_${Math.random().toString(36).slice(2, 8)}`
const norm = (s: string) => s.trim().toLowerCase()

/** Áreas y categorías de dinero del usuario, con todo lo necesario para crearlas, renombrarlas y ordenarlas. */
export function useTaxonomy() {
  const areasDb = useTable<FinArea>('fin_areas', { col: 'position', asc: true })
  const catsDb = useTable<FinCategory>('fin_categories', { col: 'position', asc: true })
  const loading = areasDb.loading || catsDb.loading

  useEffect(() => {
    if (loading || areasDb.rows.length > 0 || catsDb.rows.length > 0) return
    seeding ??= seedOnce().finally(() => { seeding = null })
    seeding.then(() => { areasDb.reload(); catsDb.reload() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, areasDb.rows.length, catsDb.rows.length])

  const areas = areasDb.rows
  const categories = catsDb.rows
  const cats = useCallback((kind: Kind) => categories.filter((c) => c.kind === kind), [categories])

  /** Si el área no existe (p. ej. se borró), igual se muestra con su clave. */
  const areaMeta = useCallback((key: string): { key: string; name: string; color: string } => areas.find((a) => a.key === key) ?? { key, name: key, color: 'var(--ink-faint)' }, [areas])

  const ensureCategory = useCallback(async (kind: Kind, raw: string): Promise<string> => {
    const name = raw.trim()
    if (!name) return ''
    const hit = categories.find((c) => c.kind === kind && norm(c.name) === norm(name))
    if (hit) return hit.name
    await catsDb.add({ kind, name, position: (categories.filter((c) => c.kind === kind).at(-1)?.position ?? 0) + 1 })
    return name
  }, [categories, catsDb])

  const addArea = useCallback(async (raw: string, color?: string): Promise<string> => {
    const name = raw.trim()
    if (!name) return ''
    const hit = areas.find((a) => norm(a.name) === norm(name))
    if (hit) return hit.key
    const key = slug()
    await areasDb.add({ key, name, color: color ?? AREA_COLORS[areas.length % AREA_COLORS.length].id, position: (areas.at(-1)?.position ?? 0) + 1 })
    return key
  }, [areas, areasDb])

  /** Renombra una categoría y actualiza todo lo que ya la usa (movimientos, presupuestos, suscripciones). */
  const renameCategory = useCallback(async (c: FinCategory, name: string) => {
    const next = name.trim()
    if (!next || next === c.name) return
    await catsDb.update(c.id, { name: next })
    await supabase.from('fin_transactions').update({ category: next }).eq('category', c.name).eq('kind', c.kind)
    if (c.kind === 'expense') {
      await supabase.from('fin_budgets').update({ category: next }).eq('category', c.name)
      await supabase.from('subscriptions').update({ category: next }).eq('category', c.name)
    }
  }, [catsDb])

  /** Mueve una posición arriba o abajo dentro de su lista. */
  const move = useCallback(async <T extends { id: string; position: number }>(list: T[], i: number, d: -1 | 1, db: { update: (id: string, p: { position: number }) => Promise<void> }) => {
    const a = list[i], b = list[i + d]
    if (!a || !b) return
    await Promise.all([db.update(a.id, { position: b.position }), db.update(b.id, { position: a.position })])
  }, [])

  return useMemo(() => ({
    loading, error: areasDb.error || catsDb.error, clearError: () => { areasDb.clearError(); catsDb.clearError() },
    areas, categories, cats, areaMeta, ensureCategory, addArea, renameCategory,
    areasDb, catsDb, move,
  }), [loading, areasDb, catsDb, areas, categories, cats, areaMeta, ensureCategory, addArea, renameCategory, move])
}
