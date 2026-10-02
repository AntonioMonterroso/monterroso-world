import type { Place, Trip } from './inspire'
import { dayNum } from './recur'

export type OutingKind = 'travel' | 'food' | 'coffee' | 'nature' | 'church' | 'shop' | 'music' | 'culture' | 'other'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Qué tipo de salida es, a partir de la categoría que escribiste. Un país o un viaje vuela; un restaurante se come. */
export function outingKind(category: string): OutingKind {
  const c = norm(category)
  if (/\b(pais|paises|ciudad|viaje|destino|vacaciones|isla|playa)\b/.test(c)) return 'travel'
  if (/(restaurante|comida|pizza|hamburguesa|taco|antojo|parrilla|cena|almuerzo)/.test(c)) return 'food'
  if (/(cafe|cafeteria|postre|helado|panaderia)/.test(c)) return 'coffee'
  if (/(naturaleza|parque|volcan|montana|lago|senderismo)/.test(c)) return 'nature'
  if (/(iglesia|templo|culto|retiro)/.test(c)) return 'church'
  if (/(tienda|mercado|centro comercial|compras)/.test(c)) return 'shop'
  if (/(musica|estudio|concierto|ensayo)/.test(c)) return 'music'
  if (/(cultura|museo|teatro|galeria|historia)/.test(c)) return 'culture'
  return 'other'
}

export const KIND_LABEL: Record<OutingKind, string> = {
  travel: 'Viaje', food: 'Para comer', coffee: 'Café y postres', nature: 'Naturaleza', church: 'Iglesia', shop: 'Compras', music: 'Música', culture: 'Cultura', other: 'Salida',
}

export type Outing =
  | { type: 'trip'; id: string; title: string; kind: 'travel'; start: string | null; end: string | null; when: string; urgent: boolean; place?: undefined }
  | { type: 'place'; id: string; title: string; kind: OutingKind; place: Place; when: string; urgent: false }

/** Texto de cuenta regresiva de un viaje. */
export function tripWhen(t: Pick<Trip, 'start_date' | 'end_date'>, today: string): { text: string; urgent: boolean; rank: number } {
  const now = dayNum(today)
  const s = t.start_date ? dayNum(t.start_date) : null
  const e = t.end_date ? dayNum(t.end_date) : s
  if (s !== null && e !== null && now >= s && now <= e) return { text: '¡Estás de viaje!', urgent: true, rank: 0 }
  if (s !== null && s >= now) {
    const d = s - now
    return { text: d === 0 ? 'Sale hoy' : d === 1 ? 'Sale mañana' : d <= 30 ? `Faltan ${d} días` : d < 60 ? `Faltan ${Math.round(d / 7)} semanas` : `Faltan ${Math.round(d / 30)} meses`, urgent: d <= 7, rank: 1 + d }
  }
  if (s !== null && e !== null && now > e) return { text: 'Ya pasó', urgent: false, rank: 99999 }
  return { text: 'Sin fecha todavía', urgent: false, rank: 5000 }
}

/** Salidas candidatas para Hoy, en orden de interés: viaje en curso o próximo, y luego lugares por visitar (rotan cada día). */
export function outingCandidates(places: Place[], trips: Trip[], today: string): Outing[] {
  const tripItems = trips
    .map((t) => ({ t, w: tripWhen(t, today) }))
    .filter((x) => x.w.rank < 99999)
    .sort((a, b) => a.w.rank - b.w.rank)
    .map(({ t, w }): Outing => ({ type: 'trip', id: t.id, title: t.name, kind: 'travel', start: t.start_date, end: t.end_date, when: w.text, urgent: w.urgent }))

  const want = places.filter((p) => p.status === 'want')
  // Los países y ciudades por conocer también vuelan; rotamos la lista con el día para que no sea siempre el mismo lugar.
  const offset = want.length ? dayNum(today) % want.length : 0
  const rotated = [...want.slice(offset), ...want.slice(0, offset)]
  const placeItems = rotated.map((p): Outing => ({ type: 'place', id: p.id, title: p.name, kind: outingKind(p.category), place: p, when: KIND_LABEL[outingKind(p.category)], urgent: false }))
  return [...tripItems, ...placeItems]
}
