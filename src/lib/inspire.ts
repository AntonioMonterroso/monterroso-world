import { normalizeEmbed } from './pulpit'
import { parseVideoUrl } from './learn'

export type InspKind = 'link' | 'image' | 'note'
export type Board = { id: string; name: string }
export type Inspiration = { id: string; board_id: string | null; kind: InspKind; title: string; url: string | null; note: string | null; tags: string[]; image_path: string | null; created_at: string }

export type Trip = { id: string; name: string; start_date: string | null; end_date: string | null; notes: string | null }
export type Place = { id: string; trip_id: string | null; name: string; category: string; status: 'want' | 'visited'; address: string | null; url: string | null; notes: string | null; rating: number | null; visited_on: string | null }
export type ShopItem = { id: string; name: string; priority: 1 | 2 | 3; category: string; price: number | null; currency: string; store: string | null; url: string | null; notes: string | null; status: 'pending' | 'bought'; bought_on: string | null }

export const PLACE_CATEGORIES = ['País o ciudad', 'Restaurante', 'Café', 'Música y estudios', 'Iglesia', 'Tienda', 'Naturaleza', 'Cultura', 'Otro']
export const SHOP_CATEGORIES = ['Instrumento', 'Equipo y tecnología', 'Software', 'Casa', 'Ropa', 'Libros', 'Otro']
export const PRIORITIES: { id: 1 | 2 | 3; label: string; color: string }[] = [
  { id: 1, label: 'Alta', color: 'var(--neg)' },
  { id: 2, label: 'Media', color: 'var(--personal)' },
  { id: 3, label: 'Baja', color: 'var(--ink-faint)' },
]

export type Embed = { src: string; ratio: string | null; height?: number }

/** Convierte un enlace en algo que se pueda incrustar de forma segura. Solo sitios permitidos. */
export function inspirationEmbed(input: string): Embed | null {
  let u: URL
  try { u = new URL(input.trim()) } catch { return null }
  if (u.protocol !== 'https:') return null
  const host = u.hostname.toLowerCase()

  if (host === 'open.spotify.com') {
    const m = /^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{10,30})\/?$/.exec(u.pathname)
    return m ? { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, ratio: null, height: m[1] === 'track' || m[1] === 'episode' ? 152 : 352 } : null
  }
  if (host === 'soundcloud.com' || host === 'www.soundcloud.com') {
    const parts = u.pathname.split('/').filter(Boolean)
    return parts.length >= 2 ? { src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(`https://soundcloud.com${u.pathname}`)}&auto_play=false`, ratio: null, height: 166 } : null
  }
  const v = parseVideoUrl(input)
  if (v?.provider === 'youtube') return { src: `https://www.youtube-nocookie.com/embed/${v.id}?rel=0&modestbranding=1&playsinline=1`, ratio: '16 / 9' }
  if (v?.provider === 'vimeo') return { src: `https://player.vimeo.com/video/${v.id}`, ratio: '16 / 9' }
  const canva = normalizeEmbed(input)
  return canva ? { src: canva, ratio: '16 / 9' } : null
}

/** "#Diseño, logos  referencia" → ['diseño','logos','referencia'] (sin repetir, máximo 12). */
export function normalizeTags(input: string): string[] {
  const seen = new Set<string>()
  for (const raw of input.split(/[,\s]+/)) {
    const t = raw.replace(/^#+/, '').trim().toLowerCase().slice(0, 30)
    if (t) seen.add(t)
    if (seen.size >= 12) break
  }
  return [...seen]
}

export const mapsSearchUrl = (q: string) => (/^https?:\/\//i.test(q) ? q : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`)

const r2 = (n: number) => Math.round(n * 100) / 100

/** Total pendiente por moneda de lo que aún no compras (solo artículos con precio). */
export function pendingTotals(items: Pick<ShopItem, 'status' | 'price' | 'currency'>[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const i of items) if (i.status === 'pending' && i.price) out[i.currency] = r2((out[i.currency] ?? 0) + Number(i.price))
  return out
}

/** Categoría de gasto para registrar la compra en Finanzas. */
export const expenseCategoryFor = (c: string) => (c === 'Instrumento' ? 'Instrumentos' : c === 'Equipo y tecnología' ? 'Equipo y tecnología' : c === 'Software' ? 'Software y servicios' : c === 'Casa' ? 'Casa' : c === 'Libros' ? 'Educación' : 'Otros')

export const sortShopping = <T extends Pick<ShopItem, 'priority' | 'name'>>(items: T[]) => [...items].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name, 'es'))
