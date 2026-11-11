import { DEFAULT_EXPENSE_CATEGORIES } from './finance'

/** ＋ Anotar entiende frases escritas como hablas, con reglas simples de palabras (sin servicios de pago).
 *  Con el uso aprende tus palabras: si «pollo» siempre lo cambias a Comida, la próxima vez ya lo pone ahí. */
export type Kind = 'gasto' | 'ingreso' | 'cobro' | 'evento' | 'comprar' | 'prestado' | 'promesa' | 'idea' | 'video' | 'enlace' | 'bandeja'
export type Entendido = {
  kind: Kind
  label: string
  amount?: number
  category?: string
  area?: 'web' | 'music' | 'personal'
  title?: string
  date?: string
  startMin?: number
  person?: string
  clientId?: string
  url?: string
  videoId?: string
  eventKind?: 'church' | 'meeting' | 'rehearsal' | 'outing' | 'appointment' | 'work' | 'other'
}
export type Learned = Record<string, { category?: string }>
export type Ctx = { today: string; clients: { id: string; title: string; client?: string | null }[]; learned: Learned }

export const KIND_LABEL: Record<Kind, string> = { gasto: 'Gasto', ingreso: 'Ingreso', cobro: 'Cobro', evento: 'Evento', comprar: 'Por comprar', prestado: 'Cosa prestada', promesa: 'Promesa', idea: 'Idea', video: 'Video', enlace: 'Enlace', bandeja: 'Bandeja' }

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// Palabras de fábrica → categoría de gasto
const WORDS: [RegExp, string][] = [
  [/almuerz|cena|desayun|comida|super|pollo|carne|pan|tortilla|cafe|refac|pizza|hambur|fruta|verdura|leche|huevo|tienda/, 'Comida'],
  [/gasolina|bus|uber|taxi|pasaje|parqueo|transporte|combustible/, 'Transporte'],
  [/luz|agua|renta|alquiler|internet|casa|gas|limpieza|cable|telefono/, 'Casa'],
  [/hosting|dominio|licencia|suscripcion|software|app|netflix|spotify|servidor/, 'Software y servicios'],
  [/laptop|mouse|teclado|cable|monitor|equipo|celular|cargador/, 'Equipo y tecnología'],
  [/guitarra|cuerdas|bateria|piano|pedal|instrumento|baquetas|micro/, 'Instrumentos'],
  [/diezmo|ofrenda|iglesia/, 'Iglesia y ofrendas'],
  [/doctor|medic|farmacia|salud|dentista|consulta/, 'Salud'],
  [/cine|juego|ocio|salida|paseo|bar|concierto/, 'Ocio'],
  [/curso|libro|clase|taller|educacion|estudio/, 'Educación'],
]
const AREA_OF: Record<string, 'web' | 'music' | 'personal'> = { 'Software y servicios': 'web', 'Equipo y tecnología': 'web', Instrumentos: 'music' }

export function categoryFor(text: string, learned: Learned = {}): string {
  const words = norm(text).split(/[^a-z0-9ñ]+/).filter(Boolean)
  for (const w of words) if (learned[w]?.category) return learned[w].category!
  const t = norm(text)
  for (const [re, cat] of WORDS) if (re.test(t)) return cat
  return 'Otros'
}
/** La palabra que se aprende de una frase: la primera con más de 2 letras que no sea un número. */
export const keyWord = (text: string) => norm(text).split(/[^a-z0-9ñ]+/).find((w) => w.length > 2 && !/^\d+$/.test(w)) ?? ''

const DAYS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab']
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const addDays = (s: string, n: number) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d) }

/** «hoy», «mañana», «ayer» o un día de la semana (el próximo). Devuelve la fecha y lo que sobra del texto. */
export function takeDate(text: string, today: string): { date: string | null; rest: string } {
  const t = norm(text)
  let m = t.match(/\b(pasado manana|manana|hoy|ayer)\b/)
  if (m) {
    const off = m[1] === 'pasado manana' ? 2 : m[1] === 'manana' ? 1 : m[1] === 'ayer' ? -1 : 0
    return { date: addDays(today, off), rest: text.replace(new RegExp(m[1].replace('manana', 'ma[ñn]ana'), 'i'), '').replace(/\s+/g, ' ').trim() }
  }
  m = t.match(/\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo|lun|mar|mie|jue|vie|sab|dom)\b/)
  if (m) {
    const want = DAYS.indexOf(m[1].slice(0, 3))
    const cur = new Date(today + 'T12:00:00').getDay()
    const diff = ((want - cur + 7) % 7) || 7
    const re = new RegExp(`\\b${m[1].replace('miercoles', 'mi[eé]rcoles').replace('sabado', 's[aá]bado').replace('mie', 'mi[eé]').replace('sab', 's[aá]b')}\\b`, 'i')
    return { date: addDays(today, diff), rest: text.replace(re, '').replace(/\s+/g, ' ').trim() }
  }
  return { date: null, rest: text }
}

/** «7pm», «7:30 pm», «19:00», «a las 7». */
export function takeTime(text: string): { min: number | null; rest: string } {
  const m = text.match(/(?:\ba las\s+)?\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|h|hrs)?\b/i)
  if (!m) return { min: null, rest: text }
  const suffix = (m[3] ?? '').toLowerCase().replace(/\./g, '')
  const hasClock = Boolean(m[2]) || Boolean(suffix) || /a las/i.test(m[0])
  if (!hasClock) return { min: null, rest: text }
  let h = Number(m[1]); const mi = Number(m[2] ?? 0)
  if (suffix === 'pm' && h < 12) h += 12
  if (suffix === 'am' && h === 12) h = 0
  if (h > 23 || mi > 59) return { min: null, rest: text }
  return { min: h * 60 + mi, rest: text.replace(m[0], '').replace(/\s+/g, ' ').trim() }
}

const eventKind = (t: string): Entendido['eventKind'] => { const n = norm(t); return /ensayo/.test(n) ? 'rehearsal' : /iglesia|culto|servicio|misa/.test(n) ? 'church' : /reunion|junta|llamada/.test(n) ? 'meeting' : /doctor|cita|dentista/.test(n) ? 'appointment' : 'other' }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const money = (n: number) => `Q ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** El identificador de un video de YouTube a partir de su enlace. */
export function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/))([A-Za-z0-9_-]{4,20})/)
  return m ? m[1] : null
}

export function entender(raw: string, ctx: Ctx): Entendido {
  const text = raw.trim().replace(/\s+/g, ' ')
  const bandeja: Entendido = { kind: 'bandeja', label: 'Bandeja · lo clasificas después', title: text }
  if (!text) return bandeja
  const t = norm(text)

  // Pegar un enlace lo guarda en Privado › Guardado: YouTube a Videos y lo demás a Links
  if (/^https?:\/\/\S+$/i.test(text)) {
    const id = youtubeId(text)
    if (id) return { kind: 'video', url: text, videoId: id, title: 'Video de YouTube', label: 'Video · Guardado › Aprender' }
    let host = text
    try { host = new URL(text).hostname.replace(/^www\./, '') } catch { /* deja el texto */ }
    return { kind: 'enlace', url: text, title: host, label: `Enlace · Guardado › Links` }
  }

  // +Q 300 tocada boda → ingreso; Q 45 almuerzo → gasto
  let m = text.match(/^\+\s*q?\s*(\d+(?:[.,]\d+)?)\s*(.*)$/i)
  if (m) {
    const amount = Number(m[1].replace(',', '.')); const desc = m[2] || 'Ingreso'
    const music = /tocada|toque|concierto|ensayo|clase de guitarra|clase de piano|bateria|produccion|musica/.test(norm(desc))
    const web = /web|pagina|sitio|cliente|hosting|proyecto|mensualidad/.test(norm(desc))
    const category = music ? (/clase/.test(norm(desc)) ? 'Clases' : /produccion/.test(norm(desc)) ? 'Producción musical' : 'Tocada') : web ? 'Proyecto web' : 'Otros'
    const area = music ? 'music' : web ? 'web' : 'personal'
    return { kind: 'ingreso', amount, category, area, title: cap(desc), date: ctx.today, label: `Ingreso · ${music ? 'Música' : web ? 'Trabajo' : 'Personal'} · ${money(amount)}` }
  }
  m = text.match(/^q\s*(\d+(?:[.,]\d+)?)\s+(.+)$/i) ?? text.match(/^(\d+(?:[.,]\d+)?)\s*q\s+(.+)$/i)
  if (m) {
    const amount = Number(m[1].replace(',', '.')); const { date, rest } = takeDate(m[2], ctx.today)
    const category = categoryFor(rest, ctx.learned)
    return { kind: 'gasto', amount, category, area: AREA_OF[category] ?? 'personal', title: cap(rest || category), date: date ?? ctx.today, label: `Gasto · ${category} · ${money(amount)}` }
  }

  // «Imperio pagó 1500», «me pagó barbería Q 250 ayer», «recibí 500 de Imperio», «cobré Q 300 a barbería»: un pago con monto
  if (/\b(pago|pagaron|recibi|cobre)\b/.test(t) && /\d/.test(text)) {
    const num = text.match(/(?:q\s*)?(\d+(?:[.,]\d{1,2})?)/i)
    if (num) {
      const amount = Number(num[1].replace(',', '.'))
      const { date, rest } = takeDate(text.replace(num[0], ' '), ctx.today)
      const who = norm(rest).replace(/\b(me|pago|pagaron|recibi|cobre|de|del|a|el|la|q|quetzales)\b/g, ' ').replace(/\s+/g, ' ').trim()
      const hit = who ? ctx.clients.find((c) => norm(c.title).includes(who) || who.includes(norm(c.title)) || (c.client && (norm(c.client).includes(who) || who.includes(norm(c.client))))) : undefined
      if (hit && amount > 0) return { kind: 'cobro', clientId: hit.id, title: hit.title, amount, date: date ?? ctx.today, label: `Pago · ${hit.title} · ${money(amount)}${date && date !== ctx.today ? ` · ${date}` : ''}` }
    }
  }

  // cobré barbería
  m = text.match(/^cobr[eé]\s+(?:a\s+|de\s+)?(.+)$/i)
  if (m) {
    const q = norm(m[1])
    const hit = ctx.clients.find((c) => norm(c.title).includes(q) || q.includes(norm(c.title)) || (c.client && (norm(c.client).includes(q) || q.includes(norm(c.client)))))
    if (hit) return { kind: 'cobro', clientId: hit.id, title: hit.title, label: `Cobro · ${hit.title}` }
  }

  // comprar leche
  m = text.match(/^comprar\s+(.+)$/i)
  if (m) return { kind: 'comprar', title: cap(m[1]), category: 'Súper y comida', label: `Por comprar · ${cap(m[1])}` }

  // le presté el cable a Luis · me prestó
  m = text.match(/prest[eé]\s+(?:el |la |los |las |mi |mis |un |una )?(.+?)\s+a\s+(.+)$/i)
  if (m) return { kind: 'prestado', title: cap(m[1]), person: cap(m[2]), label: `Cosa prestada · ${cap(m[1])} → ${cap(m[2])}` }

  // prometer a Ana el viernes · le dije a Ana que …
  m = text.match(/^(?:prometer|prometi|prometí|le dije)\s+(?:a\s+)?(.+)$/i)
  if (m) {
    const { date, rest } = takeDate(m[1], ctx.today)
    const pm = rest.match(/^([A-ZÁÉÍÓÚÑ][\wáéíóúñ]+)\s*(.*)$/)
    const person = pm?.[1]; const what = (pm?.[2] ?? '').replace(/^(que|el|la)\s+/i, '') || rest
    return { kind: 'promesa', title: cap(person ? `${person}: ${what}`.replace(/: $/, '') : rest), person, date: date ?? undefined, label: `Promesa${person ? ` a ${person}` : ''}${date ? ` · ${date}` : ''}` }
  }

  // idea: intro en Re
  m = text.match(/^idea:?\s+(.+)$/i)
  if (m && /tono|acorde|intro|coro|verso|melodia|riff|ritmo|cancion|re |mi |sol |la |do |fa |si /.test(norm(m[1]) + ' ')) return { kind: 'idea', title: cap(m[1]), area: 'music', label: 'Idea · Música' }

  // ensayo vie 7pm → evento (necesita día u hora)
  const d = takeDate(text, ctx.today); const tm = takeTime(d.rest)
  if ((d.date || tm.min !== null) && !/^q\s*\d/.test(t)) {
    const title = tm.rest.replace(/\b(a|el|de la|de)\s*$/i, '').trim()
    if (title) {
      const when = [d.date === ctx.today ? 'hoy' : d.date, tm.min !== null ? `${String(Math.floor(tm.min / 60)).padStart(2, '0')}:${String(tm.min % 60).padStart(2, '0')}` : null].filter(Boolean).join(' ')
      return { kind: 'evento', title: cap(title), date: d.date ?? ctx.today, startMin: tm.min ?? 9 * 60, eventKind: eventKind(title), label: `Evento · ${when}` }
    }
  }
  return bandeja
}

export const EXPENSE_CATEGORIES = DEFAULT_EXPENSE_CATEGORIES
/** Tipos entre los que se puede cambiar con un toque en el chip. */
export const SWITCHABLE: Kind[] = ['gasto', 'ingreso', 'evento', 'comprar', 'promesa', 'bandeja']
