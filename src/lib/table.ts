import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase'

/** CRUD genérico sobre una tabla con actualización optimista y sincronización en vivo. */
export function useTable<T extends { id: string }>(table: string, order: { col: string; asc?: boolean } = { col: 'created_at', asc: true }) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase.from(table).select('*').order(order.col, { ascending: order.asc ?? true })
    if (error) { setError('No pude cargar los datos.'); setLoading(false); return }
    setError('')
    setRows((data ?? []) as T[])
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, order.col, order.asc])

  useEffect(() => { load() }, [load])
  const loadRef = useRef(load)
  loadRef.current = load
  useEffect(() => {
    const ch = supabase.channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => loadRef.current())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [table])

  const actions = useMemo(() => {
    const fail = (m: string) => { setError(m); loadRef.current() }
    return {
      add: async (v: Omit<T, 'id'>) => {
        const { data, error } = await supabase.from(table).insert(v as never).select().single()
        if (error || !data) { fail('No se pudo crear.'); return null }
        setRows((l) => [...l, data as T])
        return data as T
      },
      update: async (id: string, patch: Partial<Omit<T, 'id'>>) => {
        setRows((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)))
        const { error } = await supabase.from(table).update(patch as never).eq('id', id)
        if (error) fail('No se guardó el cambio.')
      },
      remove: async (id: string) => {
        setRows((l) => l.filter((x) => x.id !== id))
        const { error } = await supabase.from(table).delete().eq('id', id)
        if (error) fail('No se pudo eliminar.')
      },
      clearError: () => setError(''),
    }
  }, [table])

  return { rows, loading, error, ...actions }
}
