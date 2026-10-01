export type SermonStatus = 'draft' | 'ready' | 'delivered'
export type Sermon = { id: string; title: string; scripture: string | null; preach_date: string | null; status: SermonStatus; notes: string | null; live_token: string }

export type PhaseKind = 'intro' | 'reading' | 'characters' | 'context' | 'advice' | 'application' | 'closing' | 'other'
export type Phase = { id: string; sermon_id: string; position: number; kind: PhaseKind; title: string; body: string; minutes: number | null }

export type SlideKind = 'title' | 'verse' | 'phrase' | 'image' | 'embed'
export type Slide = { id: string; sermon_id: string; position: number; kind: SlideKind; title: string | null; body: string | null; reference: string | null; url: string | null }

export type NoteKind = 'heard' | 'verse' | 'prayer' | 'message'
export type FaithNote = { id: string; kind: NoteKind; title: string; body: string | null; reference: string | null; speaker: string | null; note_date: string; answered: boolean }

export const PHASES: { kind: PhaseKind; label: string; minutes: number; hint: string }[] = [
  { kind: 'intro', label: 'Introducción', minutes: 5, hint: 'Cómo abres: una historia, una pregunta, algo que conecte.' },
  { kind: 'reading', label: 'Lectura', minutes: 5, hint: 'El pasaje, leído con calma.' },
  { kind: 'characters', label: 'Personajes', minutes: 8, hint: 'Quiénes son y qué les pasa.' },
  { kind: 'context', label: 'Contexto', minutes: 6, hint: 'Cuándo, dónde y por qué se escribió.' },
  { kind: 'advice', label: 'Consejos', minutes: 8, hint: 'Lo que el pasaje enseña, en pocas frases.' },
  { kind: 'application', label: 'Aplicación', minutes: 6, hint: 'Qué hacemos esta semana con esto.' },
  { kind: 'closing', label: 'Cierre', minutes: 4, hint: 'La frase final y la invitación.' },
]
export const phaseLabel = (k: PhaseKind) => PHASES.find((p) => p.kind === k)?.label ?? 'Otro'

export const SLIDE_KINDS: { id: SlideKind; label: string }[] = [
  { id: 'verse', label: 'Versículo' },
  { id: 'phrase', label: 'Frase' },
  { id: 'title', label: 'Título' },
  { id: 'image', label: 'Imagen' },
  { id: 'embed', label: 'Canva o video' },
]

export const NOTE_KINDS: { id: NoteKind; label: string }[] = [
  { id: 'heard', label: 'Prédica escuchada' },
  { id: 'verse', label: 'Versículo' },
  { id: 'prayer', label: 'Petición' },
  { id: 'message', label: 'Mensaje' },
]

export const isHttps = (u: string) => { try { return new URL(u).protocol === 'https:' } catch { return false } }

const EMBED_HOSTS = new Set(['www.canva.com', 'canva.com', 'www.youtube-nocookie.com'])

/** Convierte un enlace de Canva o YouTube en uno incrustable. Devuelve null si el sitio no está permitido. */
export function normalizeEmbed(input: string): string | null {
  let u: URL
  try { u = new URL(input.trim()) } catch { return null }
  if (u.protocol !== 'https:') return null
  const host = u.hostname.toLowerCase()

  if (host === 'canva.com' || host === 'www.canva.com') {
    if (!u.pathname.startsWith('/design/')) return null
    u.hostname = 'www.canva.com'
    u.search = '?embed'
    u.hash = ''
    if (!/\/(view|watch)\/?$/.test(u.pathname)) u.pathname = u.pathname.replace(/\/(edit|view|watch)?\/?$/, '') + '/view'
    return u.toString()
  }

  let id: string | null = null
  if (host === 'youtu.be') id = u.pathname.slice(1)
  else if (host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v')
    else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2]
  } else if (host === 'www.youtube-nocookie.com' && u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2]
  if (id && /^[\w-]{6,20}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`
  return null
}

export const isAllowedEmbed = (u: string) => { try { const x = new URL(u); return x.protocol === 'https:' && EMBED_HOSTS.has(x.hostname) } catch { return false } }

// ───────── Pantalla en vivo ─────────
export type LiveSlide = { kind: SlideKind; title?: string; body?: string; reference?: string; url?: string }
export type LivePayload = { slide: LiveSlide | null; index: number; total: number; brand: { name: string; logo: string | null } }

export const liveChannel = (token: string) => `live:${token}`

const cut = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : undefined)

/** La pantalla pública solo confía en lo que pasa por aquí: textos recortados y enlaces https permitidos. */
export function sanitizePayload(raw: unknown): LivePayload | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const b = (r.brand ?? {}) as Record<string, unknown>
  const brand = { name: cut(b.name, 80) ?? 'Monterroso World', logo: typeof b.logo === 'string' && isHttps(b.logo) ? b.logo.slice(0, 1000) : null }
  const base = { index: Number.isFinite(r.index) ? Number(r.index) : 0, total: Number.isFinite(r.total) ? Number(r.total) : 0, brand }
  if (!r.slide) return { slide: null, ...base }
  const s = r.slide as Record<string, unknown>
  const kind = (['title', 'verse', 'phrase', 'image', 'embed'] as const).find((k) => k === s.kind)
  if (!kind) return null
  const url = typeof s.url === 'string' ? s.url : undefined
  if ((kind === 'verse' || kind === 'phrase') && !(typeof s.body === 'string' && s.body.trim())) return { slide: null, ...base }
  if (kind === 'image' && !(url && isHttps(url))) return { slide: null, ...base }
  if (kind === 'embed' && !(url && isAllowedEmbed(url))) return { slide: null, ...base }
  return { slide: { kind, title: cut(s.title, 200), body: cut(s.body, 4000), reference: cut(s.reference, 120), url: kind === 'image' || kind === 'embed' ? url?.slice(0, 1000) : undefined }, ...base }
}

/** Comandos de voz muy simples para pasar diapositivas. */
export function parseCommand(transcript: string): 'next' | 'prev' | null {
  const words = transcript.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean).slice(-4)
  for (let i = words.length - 1; i >= 0; i--) {
    if (['siguiente', 'adelante', 'proximo', 'sigue'].includes(words[i])) return 'next'
    if (['anterior', 'atras', 'regresa', 'vuelve'].includes(words[i])) return 'prev'
  }
  return null
}
