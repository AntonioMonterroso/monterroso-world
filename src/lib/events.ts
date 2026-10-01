import { Briefcase, CalendarCheck, Church, Circle, MapPin, Music, Stethoscope, Users, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { occurrences, type Recurrence, type Repeat } from './recur'
import { supabase } from './supabase'

export type EventKind = 'church' | 'meeting' | 'rehearsal' | 'outing' | 'appointment' | 'work' | 'other'

export const eventKinds: Record<EventKind, { label: string; icon: LucideIcon; color: string }> = {
  church: { label: 'Iglesia', icon: Church, color: 'var(--personal)' },
  meeting: { label: 'Reunión', icon: Users, color: 'var(--dev)' },
  rehearsal: { label: 'Ensayo / tocada', icon: Music, color: 'var(--music)' },
  outing: { label: 'Salida', icon: MapPin, color: 'var(--personal)' },
  appointment: { label: 'Cita', icon: Stethoscope, color: 'var(--music)' },
  work: { label: 'Trabajo', icon: Briefcase, color: 'var(--dev)' },
  other: { label: 'Otro', icon: Circle, color: 'var(--ink-soft)' },
}
export const reminderMeta = { label: 'Recordatorio', icon: CalendarCheck, color: 'var(--brass)' }

export type CheckItem = { id: string; text: string }

export type EventRow = Recurrence & {
  id: string
  type: 'event' | 'reminder'
  title: string
  action: string | null
  kind: EventKind
  start_min: number
  end_min: number | null
  repeat: Repeat
  location: string | null
  contact: string | null
  link: string | null
  notes: string | null
  alerts: number[]
  persistent: boolean
  checklist: CheckItem[]
  active: boolean
}
export type NewEvent = Omit<EventRow, 'id' | 'active'>

export type OccState = { done: boolean; checked: string[] }
export type Occurrence = { event: EventRow; date: string; state: OccState }

export const ALERT_OPTIONS = [
  { min: 1440, label: '1 día' },
  { min: 180, label: '3 h' },
  { min: 60, label: '1 h' },
  { min: 30, label: '30 min' },
  { min: 10, label: '10 min' },
  { min: 0, label: 'A la hora' },
]

export const mapsUrl = (loc: string) =>
  /^https?:\/\//i.test(loc) ? loc : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(loc)}`

export function useEvents() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [states, setStates] = useState<Record<string, OccState>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const [e, s] = await Promise.all([
      supabase.from('events').select('*').eq('active', true).order('start_date'),
      supabase.from('occurrence_state').select('event_id,occ_date,done,checked'),
    ])
    if (e.error || s.error) { setError('No pude cargar los eventos.'); setLoading(false); return }
    setError('')
    setEvents((e.data ?? []) as EventRow[])
    const map: Record<string, OccState> = {}
    for (const r of (s.data ?? []) as { event_id: string; occ_date: string; done: boolean; checked: string[] }[]) map[`${r.event_id}|${r.occ_date}`] = { done: r.done, checked: r.checked }
    setStates(map)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const loadRef = useRef(load)
  loadRef.current = load
  useEffect(() => {
    const ch = supabase.channel(`rt-events-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => loadRef.current())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'occurrence_state' }, () => loadRef.current())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [])

  const fail = (msg: string) => { setError(msg); load() }

  const add = async (v: NewEvent) => {
    const { data, error } = await supabase.from('events').insert(v).select().single()
    if (error || !data) { fail('No se pudo crear.'); return null }
    setEvents((l) => [...l, data as EventRow])
    return data as EventRow
  }
  const update = async (id: string, patch: Partial<NewEvent>) => {
    setEvents((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)))
    const { error } = await supabase.from('events').update(patch).eq('id', id)
    if (error) fail('No se guardó el cambio.')
  }
  const remove = async (id: string) => {
    setEvents((l) => l.filter((x) => x.id !== id))
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) fail('No se pudo eliminar.')
  }
  const skip = async (ev: EventRow, date: string) => update(ev.id, { exceptions: [...ev.exceptions, date] })

  const setState = async (id: string, date: string, patch: Partial<OccState>) => {
    const key = `${id}|${date}`
    const next: OccState = { ...(states[key] ?? { done: false, checked: [] }), ...patch }
    setStates((m) => ({ ...m, [key]: next }))
    const { error } = await supabase.from('occurrence_state').upsert({ event_id: id, occ_date: date, ...next }, { onConflict: 'event_id,occ_date' })
    if (error) fail('No se guardó el avance.')
  }

  const between = useCallback((from: string, to: string): Occurrence[] => {
    const out: Occurrence[] = []
    for (const ev of events) for (const date of occurrences(ev, from, to)) out.push({ event: ev, date, state: states[`${ev.id}|${date}`] ?? { done: false, checked: [] } })
    return out.sort((a, b) => a.date.localeCompare(b.date) || a.event.start_min - b.event.start_min)
  }, [events, states])

  return useMemo(() => ({ events, loading, error, add, update, remove, skip, setState, between, clearError: () => setError('') }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, states, loading, error, between])
}
