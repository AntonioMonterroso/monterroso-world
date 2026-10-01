export type SongStatus = 'learning' | 'practicing' | 'ready'

export type Song = {
  id: string
  title: string
  artist: string | null
  song_key: string | null
  bpm: number | null
  time_sig: string
  status: SongStatus
  instruments: string[]
  duration_sec: number | null
  capo: number
  content: string
  notes: string | null
}

export type Setlist = { id: string; title: string; event_date: string | null; notes: string | null; song_ids: string[] }
export type PracticeLog = { id: string; song_id: string | null; instrument: string; minutes: number; practiced_on: string; note: string | null }

export const INSTRUMENTS = [
  { id: 'guitar', label: 'Guitarra' },
  { id: 'drums', label: 'Batería' },
  { id: 'piano', label: 'Piano' },
  { id: 'bass', label: 'Bajo' },
  { id: 'vocals', label: 'Voz' },
  { id: 'production', label: 'Producción' },
]
export const instrumentLabel = (id: string) => INSTRUMENTS.find((i) => i.id === id)?.label ?? id

export const SONG_STATUS: { id: SongStatus; label: string; color: string }[] = [
  { id: 'learning', label: 'Aprendiendo', color: 'var(--personal)' },
  { id: 'practicing', label: 'Practicando', color: 'var(--music)' },
  { id: 'ready', label: 'Lista', color: '#8fd1a4' },
]
export const statusOf = (s: SongStatus) => SONG_STATUS.find((x) => x.id === s)!

export const TIME_SIGS = ['4/4', '3/4', '6/8', '12/8', '2/4', '5/4', '7/8']
export const beatsOf = (sig: string) => Math.max(1, Number(sig.split('/')[0]) || 4)

export const fmtDuration = (sec: number | null) => {
  if (!sec) return '—'
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
export const parseDuration = (v: string): number | null => {
  const m = /^(\d{1,3}):([0-5]\d)$/.exec(v.trim())
  if (m) return Number(m[1]) * 60 + Number(m[2])
  const n = Number(v)
  return v.trim() && !Number.isNaN(n) && n > 0 ? Math.round(n * 60) : null
}

const dayNum = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86_400_000) }

/** Racha: días seguidos con práctica, contando desde hoy (o desde ayer si hoy aún no practicas). */
export function streak(logs: { practiced_on: string }[], today: string): number {
  const days = new Set(logs.map((l) => dayNum(l.practiced_on)))
  let n = dayNum(today)
  if (!days.has(n)) n -= 1
  let s = 0
  while (days.has(n)) { s++; n-- }
  return s
}
