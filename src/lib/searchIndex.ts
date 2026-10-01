import { supabase } from './supabase'

export type Hit = { id: string; type: string; title: string; sub?: string; to: string }

export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Busca sin distinguir mayúsculas ni acentos. Todas las palabras deben aparecer; el título pesa más que el detalle. */
export function searchHits<T extends { title: string; sub?: string }>(items: T[], query: string, limit = 12): T[] {
  const tokens = norm(query).split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return []
  const scored: { item: T; score: number }[] = []
  for (const item of items) {
    const title = norm(item.title)
    const sub = norm(item.sub ?? '')
    let score = 0
    let ok = true
    for (const t of tokens) {
      if (title.startsWith(t)) score += 4
      else if (title.includes(` ${t}`)) score += 3
      else if (title.includes(t)) score += 2
      else if (sub.includes(t)) score += 1
      else { ok = false; break }
    }
    if (ok) scored.push({ item, score })
  }
  return scored.sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'es')).slice(0, limit).map((s) => s.item)
}

type Source = { type: string; table: string; select: string; map: (r: Record<string, unknown>) => Omit<Hit, 'type'> | null }
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const cut = (v: unknown, n = 80) => str(v)?.slice(0, n)

const SOURCES: Source[] = [
  { type: 'Canción', table: 'songs', select: 'id,title,artist', map: (r) => ({ id: String(r.id), title: String(r.title), sub: cut(r.artist), to: `/app/musica/cancion/${r.id}` }) },
  { type: 'Setlist', table: 'setlists', select: 'id,title', map: (r) => ({ id: String(r.id), title: String(r.title), to: `/app/musica/setlists?s=${r.id}` }) },
  { type: 'Trabajo', table: 'projects', select: 'id,title,client', map: (r) => ({ id: String(r.id), title: String(r.title), sub: cut(r.client), to: `/app/trabajo?abrir=${r.id}` }) },
  { type: 'Evento', table: 'events', select: 'id,title,action', map: (r) => ({ id: String(r.id), title: String(r.title), sub: cut(r.action), to: `/app/planear/agenda?e=${r.id}` }) },
  { type: 'Prédica', table: 'sermons', select: 'id,title,scripture', map: (r) => ({ id: String(r.id), title: String(r.title), sub: cut(r.scripture), to: `/app/pulpito/predica/${r.id}` }) },
  { type: 'Nota de fe', table: 'faith_notes', select: 'id,title,body,reference', map: (r) => ({ id: String(r.id), title: String(r.title), sub: [cut(r.reference, 40), cut(r.body, 120)].filter(Boolean).join(' · ') || undefined, to: `/app/pulpito/notas?n=${r.id}` }) },
  { type: 'Video', table: 'videos', select: 'id,title,topic', map: (r) => ({ id: String(r.id), title: String(r.title), sub: cut(r.topic), to: `/app/descubrir/video/${r.id}` }) },
  { type: 'Link', table: 'links', select: 'id,title,url,description', map: (r) => ({ id: String(r.id), title: String(r.title), sub: [cut(r.description, 80), cut(String(r.url).replace(/^https?:\/\/(www\.)?/, ''), 60)].filter(Boolean).join(' · ') || undefined, to: `/app/descubrir/links?q=${encodeURIComponent(String(r.title))}` }) },
  { type: 'Inspiración', table: 'inspirations', select: 'id,title,note,tags', map: (r) => ({ id: String(r.id), title: String(r.title), sub: [cut(r.note, 80), Array.isArray(r.tags) && r.tags.length ? (r.tags as string[]).map((t) => `#${t}`).join(' ') : undefined].filter(Boolean).join(' · ') || undefined, to: '/app/descubrir/inspiracion' }) },
  { type: 'Lugar', table: 'places', select: 'id,name,category,address', map: (r) => ({ id: String(r.id), title: String(r.name), sub: [cut(r.category, 40), cut(r.address, 60)].filter(Boolean).join(' · ') || undefined, to: '/app/descubrir/lugares' }) },
  { type: 'Por comprar', table: 'shopping_items', select: 'id,name,category,store', map: (r) => ({ id: String(r.id), title: String(r.name), sub: [cut(r.category, 40), cut(r.store, 60)].filter(Boolean).join(' · ') || undefined, to: '/app/descubrir/compras' }) },
  { type: 'Nota de voz', table: 'voice_notes', select: 'id,title', map: (r) => ({ id: String(r.id), title: String(r.title), to: '/app/musica/ideas' }) },
  { type: 'Rutina diaria', table: 'routines', select: 'id,name', map: (r) => ({ id: String(r.id), title: String(r.name), to: `/app/mente/rutinas/${r.id}` }) },
  { type: 'Rutina', table: 'workouts', select: 'id,title', map: (r) => ({ id: String(r.id), title: String(r.title), to: `/app/ejercicio/rutina/${r.id}` }) },
  { type: 'Compañero', table: 'training_partners', select: 'id,name', map: (r) => ({ id: String(r.id), title: String(r.name), to: '/app/ejercicio/companeros' }) },
  { type: 'Hábito', table: 'habits', select: 'id,name', map: (r) => ({ id: String(r.id), title: String(r.name), to: '/app/mente' }) },
  { type: 'Prioridad', table: 'tasks', select: 'id,title', map: (r) => ({ id: String(r.id), title: String(r.title), to: '/app' }) },
  { type: 'Captura', table: 'inbox_items', select: 'id,text', map: (r) => ({ id: String(r.id), title: String(r.text).slice(0, 100), to: '/app' }) },
  { type: 'Préstamo', table: 'loans', select: 'id,person,note', map: (r) => ({ id: String(r.id), title: String(r.person), sub: cut(r.note), to: '/app/dinero/prestamos' }) },
  { type: 'Suscripción', table: 'subscriptions', select: 'id,name', map: (r) => ({ id: String(r.id), title: String(r.name), to: '/app/dinero/suscripciones' }) },
  { type: 'Meta', table: 'savings_goals', select: 'id,title', map: (r) => ({ id: String(r.id), title: String(r.title), to: '/app/dinero/metas' }) },
  { type: 'Movimiento', table: 'fin_transactions', select: 'id,category,note,tx_date', map: (r) => ({ id: String(r.id), title: `${r.category}${r.note ? ` · ${String(r.note).slice(0, 60)}` : ''}`, sub: str(r.tx_date), to: '/app/dinero/movimientos' }) },
]

/** Trae títulos de tus datos para buscar. Cada fuente que falle se ignora. */
export async function loadIndex(): Promise<Hit[]> {
  const results = await Promise.allSettled(SOURCES.map(async (s) => {
    const { data, error } = await supabase.from(s.table).select(s.select).limit(400)
    if (error || !data) return [] as Hit[]
    return (data as unknown as Record<string, unknown>[]).map((r) => s.map(r)).filter((x): x is Omit<Hit, 'type'> => x !== null).map((x) => ({ ...x, type: s.type }))
  }))
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
}
