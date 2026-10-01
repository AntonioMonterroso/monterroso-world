import { Briefcase, Church, Circle, Code, Dumbbell, GraduationCap, Moon, Music, Users, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { localISO } from './time'
import { supabase } from './supabase'

export type Kind = 'work' | 'code' | 'rehearsal' | 'church' | 'study' | 'exercise' | 'rest' | 'meeting' | 'other'

export const kindMeta: Record<Kind, { label: string; icon: LucideIcon; color: string }> = {
  work: { label: 'Trabajo', icon: Briefcase, color: 'var(--dev)' },
  code: { label: 'Código', icon: Code, color: 'var(--dev)' },
  rehearsal: { label: 'Ensayo', icon: Music, color: 'var(--music)' },
  church: { label: 'Iglesia', icon: Church, color: 'var(--personal)' },
  study: { label: 'Estudio', icon: GraduationCap, color: 'var(--music)' },
  exercise: { label: 'Ejercicio', icon: Dumbbell, color: 'var(--personal)' },
  rest: { label: 'Descanso', icon: Moon, color: 'var(--ink-faint)' },
  meeting: { label: 'Reunión', icon: Users, color: 'var(--dev)' },
  other: { label: 'Otro', icon: Circle, color: 'var(--ink-soft)' },
}

export type Block = {
  id: string
  title: string
  kind: Kind
  days: number[]
  start_min: number
  end_min: number
  notes: string | null
  active: boolean
}
export type NewBlock = Omit<Block, 'id' | 'active'>

let seeding: Promise<Block[]> | null = null

/** Suscribe a cambios de una tabla y avisa para recargar. */
function useRealtime(table: string, reload: () => void) {
  const ref = useRef(reload)
  ref.current = reload
  useEffect(() => {
    const ch = supabase
      .channel(`rt-${table}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => ref.current())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [table])
}

export function useBlocks() {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('schedule_blocks').select('*').eq('active', true).order('start_min')
    if (error) { setError('No pude cargar el horario.'); setLoading(false); return }
    setError('')
    let rows = (data ?? []) as Block[]

    // Primera vez: horario base de trabajo 8–17, editable. Una sola siembra a la vez.
    if (rows.length === 0) {
      seeding ??= (async () => {
        const { data: s } = await supabase.from('settings').select('data').maybeSingle()
        if ((s?.data as { seeded?: boolean } | undefined)?.seeded) return []
        await supabase.from('settings').upsert({ data: { ...(s?.data ?? {}), seeded: true } })
        const { data: ins } = await supabase.from('schedule_blocks').insert({ title: 'Trabajo', kind: 'work', days: [1, 2, 3, 4, 5], start_min: 480, end_min: 1020 }).select()
        return (ins ?? []) as Block[]
      })().finally(() => { seeding = null })
      rows = await seeding
    }
    setBlocks(rows)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useRealtime('schedule_blocks', load)

  const fail = (msg: string) => { setError(msg); load() }

  const update = async (id: string, patch: Partial<NewBlock>) => {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)))
    const { error } = await supabase.from('schedule_blocks').update(patch).eq('id', id)
    if (error) fail('No se guardó el cambio. Se restauró el bloque.')
  }
  const add = async (b: NewBlock) => {
    const { data, error } = await supabase.from('schedule_blocks').insert(b).select().single()
    if (error || !data) { fail('No se pudo crear el bloque.'); return null }
    setBlocks((bs) => [...bs, data as Block].sort((a, c) => a.start_min - c.start_min))
    return data as Block
  }
  const remove = async (id: string) => {
    setBlocks((bs) => bs.filter((b) => b.id !== id))
    const { error } = await supabase.from('schedule_blocks').delete().eq('id', id)
    if (error) fail('No se pudo eliminar el bloque.')
  }

  return { blocks, loading, error, update, add, remove, clearError: () => setError('') }
}

export type Task = { id: string; title: string; done: boolean }

export function usePriorities() {
  const date = localISO()
  const [tasks, setTasks] = useState<Task[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('tasks').select('id,title,done').eq('priority_date', date).order('created_at')
    if (error) return setError('No pude cargar las prioridades.')
    setError('')
    setTasks((data ?? []) as Task[])
  }, [date])

  useEffect(() => { load() }, [load])
  useRealtime('tasks', load)

  const add = async (title: string) => {
    const { data, error } = await supabase.from('tasks').insert({ title, priority_date: date }).select('id,title,done').single()
    if (error || !data) return setError('No se pudo guardar la prioridad.')
    setTasks((t) => [...t, data as Task])
  }
  const toggle = async (id: string) => {
    const cur = tasks.find((t) => t.id === id)
    if (!cur) return
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, done: !x.done } : x)))
    const { error } = await supabase.from('tasks').update({ done: !cur.done }).eq('id', id)
    if (error) { setError('No se guardó el cambio.'); load() }
  }
  return { tasks, error, add, toggle }
}

export type InboxItem = { id: string; text: string }

export function useInbox() {
  const [items, setItems] = useState<InboxItem[]>([])
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('inbox_items').select('id,text').eq('processed', false).order('created_at', { ascending: false }).limit(5)
    if (error) return setError('No pude cargar la bandeja.')
    setError('')
    setItems((data ?? []) as InboxItem[])
  }, [])

  useEffect(() => { load() }, [load])
  useRealtime('inbox_items', load)

  const add = async (text: string) => {
    const { data, error } = await supabase.from('inbox_items').insert({ text }).select('id,text').single()
    if (error || !data) return setError('No se pudo guardar la captura.')
    setItems((i) => [data as InboxItem, ...i].slice(0, 5))
  }
  return { items, error, add }
}
