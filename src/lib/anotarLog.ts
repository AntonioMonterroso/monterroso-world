import { supabase } from './supabase'

/** Una fila creada por Anotar: con eso basta para deshacerla después. */
export type Ref = { table: string; id: string }
export type LogEntry = { at: number; text: string; label: string; refs: Ref[]; undone?: boolean }

const KEY = 'mw_anotar_log'
let mem: Record<string, LogEntry[]> = {}

const load = (): Record<string, LogEntry[]> => {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as Record<string, LogEntry[]>) : mem } catch { return mem }
}
const store = (v: Record<string, LogEntry[]>) => { mem = v; try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* sin almacenamiento */ } }

/** Lo anotado en un día, lo más reciente primero. Solo se guardan los últimos 7 días. */
export function logOf(day: string): LogEntry[] {
  return [...(load()[day] ?? [])].sort((a, b) => b.at - a.at)
}

export function pushLog(day: string, e: LogEntry): void {
  const all = load()
  const keep = Object.keys(all).sort().slice(-6)
  const next: Record<string, LogEntry[]> = {}
  for (const k of keep) next[k] = all[k]
  next[day] = [...(next[day] ?? []), e].slice(-60)
  store(next)
}

export function markUndone(day: string, at: number): void {
  const all = load()
  all[day] = (all[day] ?? []).map((x) => (x.at === at ? { ...x, undone: true } : x))
  store(all)
}

/** Borra todo lo que creó una anotación (en orden inverso, por si una depende de otra). */
export async function undoRefs(refs: Ref[]): Promise<void> {
  for (const r of [...refs].reverse()) await supabase.from(r.table).delete().eq('id', r.id)
}
