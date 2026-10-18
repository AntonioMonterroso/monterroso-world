import { useCallback, useEffect, useMemo } from 'react'
import { DEFAULT_PAGE, SEED_EXTRAS, SEED_PACKAGES, type Extra, type PageData, type Pkg, type Quote } from './quotes'
import { supabase } from './supabase'
import { useTable } from './table'

type PageRow = { id: string; data: Partial<PageData> }

let seeding: Promise<void> | null = null
async function seedOnce() {
  // Solo la primera vez: la página con textos de arranque y los paquetes de ejemplo con los precios acordados
  await supabase.from('quote_page').insert({ data: DEFAULT_PAGE })
  await supabase.from('quote_packages').insert(SEED_PACKAGES)
  await supabase.from('quote_extras').insert(SEED_EXTRAS)
}

/** El catálogo editable: paquetes, extras y los textos de la página pública. */
export function useCatalog() {
  const pkgs = useTable<Pkg>('quote_packages', { col: 'position', asc: true })
  const extras = useTable<Extra>('quote_extras', { col: 'position', asc: true })
  const pageT = useTable<PageRow>('quote_page', { col: 'created_at', asc: true })
  const loading = pkgs.loading || extras.loading || pageT.loading

  useEffect(() => {
    if (loading || pageT.rows.length > 0 || pkgs.rows.length > 0) return
    seeding ??= seedOnce().finally(() => { seeding = null })
    void seeding.then(() => { void pkgs.reload?.(); void extras.reload?.(); void pageT.reload?.() })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, pageT.rows.length, pkgs.rows.length])

  const page: PageData = useMemo(() => ({ ...DEFAULT_PAGE, ...(pageT.rows[0]?.data ?? {}) }), [pageT.rows])
  const savePage = useCallback(async (patch: Partial<PageData>) => {
    const next = { ...page, ...patch }
    const row = pageT.rows[0]
    if (row) await pageT.update(row.id, { data: next }); else await pageT.add({ data: next })
  }, [page, pageT])
  return { pkgs, extras, page, savePage, loading, error: pkgs.error || extras.error || pageT.error }
}

export type Pricing = { page: Partial<PageData>; packages: Pkg[]; extras: Extra[] }
/** Lo publicado, para la página pública de precios (no requiere sesión). */
export async function fetchPricing(): Promise<Pricing | null> {
  const { data, error } = await supabase.rpc('public_pricing')
  if (error || !data) return null
  return data as Pricing
}
export type SharedQuote = Omit<Quote, 'shared' | 'share_token' | 'project_id' | 'number'> & { page: Partial<PageData> }
/** Una propuesta compartida por su enlace secreto. */
export async function fetchQuote(token: string): Promise<SharedQuote | null> {
  const { data, error } = await supabase.rpc('quote_by_token', { t: token })
  if (error || !data) return null
  return data as SharedQuote
}
