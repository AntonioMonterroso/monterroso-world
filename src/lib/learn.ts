import { dayNum, isoFromNum } from './recur'
import { weekStart } from './habits'

export type Provider = 'youtube' | 'vimeo'
export type VideoStatus = 'queue' | 'watching' | 'done'
export type Video = { id: string; provider: Provider; video_id: string; title: string; topic: string | null; status: VideoStatus; start_sec: number; finished_on: string | null; review_step: number; next_review: string | null; created_at: string }
export type VideoNote = { id: string; video_id: string; at_sec: number; body: string }
export type LinkRow = { id: string; url: string; title: string; category: string; description: string | null; favorite: boolean; portfolio: boolean; image_url: string | null; created_at: string }

export const STATUS: { id: VideoStatus; label: string; color: string }[] = [
  { id: 'queue', label: 'Por ver', color: 'var(--ink-soft)' },
  { id: 'watching', label: 'Viendo', color: 'var(--music)' },
  { id: 'done', label: 'Visto', color: 'var(--pos)' },
]

export const LINK_CATEGORIES = ['Desarrollo', 'Diseño', 'Música', 'Herramientas', 'Clientes', 'Referencias', 'Iglesia', 'Personal', 'Otros']

// ───────── enlaces de video ─────────
const YT_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com', 'youtube-nocookie.com'])

/** "1m30s", "90s" o "90" → segundos. */
export function parseStart(t: string | null): number {
  if (!t) return 0
  const m = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/.exec(t.trim())
  if (!m) return 0
  return Math.min(86400, Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0))
}

export function parseVideoUrl(input: string): { provider: Provider; id: string; start: number } | null {
  let u: URL
  try { u = new URL(input.trim()) } catch { return null }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const host = u.hostname.toLowerCase()
  const start = parseStart(u.searchParams.get('t') ?? u.searchParams.get('start'))

  if (YT_HOSTS.has(host)) {
    let id: string | null = null
    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0]
    else if (u.pathname === '/watch') id = u.searchParams.get('v')
    else { const m = /^\/(embed|shorts|live|v)\/([\w-]{11})/.exec(u.pathname); if (m) id = m[2] }
    return id && /^[\w-]{11}$/.test(id) ? { provider: 'youtube', id, start } : null
  }
  if (host === 'vimeo.com' || host === 'www.vimeo.com' || host === 'player.vimeo.com') {
    const m = /(?:^\/video\/|^\/)(\d{5,12})(?:\/|$)/.exec(u.pathname)
    return m ? { provider: 'vimeo', id: m[1], start } : null
  }
  return null
}

export const thumbUrl = (v: Pick<Video, 'provider' | 'video_id'>) => (v.provider === 'youtube' ? `https://i.ytimg.com/vi/${v.video_id}/mqdefault.jpg` : null)
export const embedUrl = (v: Pick<Video, 'provider' | 'video_id' | 'start_sec'>) =>
  v.provider === 'youtube' ? `https://www.youtube-nocookie.com/embed/${v.video_id}?rel=0&modestbranding=1&playsinline=1${v.start_sec ? `&start=${v.start_sec}` : ''}` : `https://player.vimeo.com/video/${v.video_id}${v.start_sec ? `#t=${v.start_sec}s` : ''}`

// ───────── marcas de tiempo ─────────
export function fmtTs(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`
}

/** "1:23", "1:02:03" o "83" → segundos. Devuelve null si no es válido. */
export function parseTs(v: string): number | null {
  const t = v.trim()
  if (!t) return null
  const parts = t.split(':')
  if (parts.length > 3 || parts.some((p) => !/^\d{1,2}$|^\d+$/.test(p))) return null
  const nums = parts.map(Number)
  if (parts.length > 1 && nums.slice(1).some((n) => n > 59)) return null
  return nums.reduce((a, n) => a * 60 + n, 0)
}

// ───────── repaso espaciado ─────────
export const REVIEW_DAYS = [1, 3, 7, 21, 60]
const addDays = (iso: string, d: number) => isoFromNum(dayNum(iso) + d)

/** Al marcar un video como visto: primer repaso al día siguiente. */
export const startReviews = (today: string) => ({ review_step: 0, next_review: addDays(today, REVIEW_DAYS[0]) })

/** Al repasar: pasa al siguiente intervalo; tras el último, ya no hay más. */
export function advanceReview(step: number, today: string): { review_step: number; next_review: string | null } {
  const next = step + 1
  return { review_step: next, next_review: next < REVIEW_DAYS.length ? addDays(today, REVIEW_DAYS[next]) : null }
}

export const dueReviews = (videos: Video[], today: string) => videos.filter((v) => v.next_review && v.next_review <= today).sort((a, b) => (a.next_review ?? '').localeCompare(b.next_review ?? ''))

/** Videos terminados en la semana en curso (lunes a domingo). */
export function finishedThisWeek(videos: Pick<Video, 'finished_on'>[], today: string): number {
  const start = dayNum(weekStart(today))
  return videos.filter((v) => v.finished_on && dayNum(v.finished_on) >= start && dayNum(v.finished_on) <= start + 6).length
}

export const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url } }
