// Notas de voz: se graban comprimidas (Opus cuando se puede), con tope de duración y tamaño.
export const MAX_SECONDS = 180
export const MAX_BYTES = 3 * 1024 * 1024
export const BITRATE = 32_000
export const SOFT_CAP_BYTES = 150 * 1024 * 1024 // tope orientativo para no llenar el plan gratuito

export type VoiceNote = { id: string; song_id: string | null; title: string; duration_sec: number; size_bytes: number; mime: string; audio_path: string; created_at: string }

const ALLOWED = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg']

export function pickMime(): string | null {
  if (typeof MediaRecorder === 'undefined') return null
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((m) => MediaRecorder.isTypeSupported(m)) ?? null
}

/** "audio/webm;codecs=opus" → "audio/webm". Algunos navegadores etiquetan el audio WebM como video/webm. */
export function baseMime(m: string): string {
  const b = m.split(';')[0].trim().toLowerCase()
  const fixed = b === 'video/webm' ? 'audio/webm' : b === 'video/mp4' ? 'audio/mp4' : b
  return ALLOWED.includes(fixed) ? fixed : 'audio/webm'
}

export const extFor = (mime: string) => (mime === 'audio/mp4' ? 'm4a' : mime === 'audio/ogg' ? 'ogg' : mime === 'audio/mpeg' ? 'mp3' : 'webm')

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export const usageTotal = (notes: Pick<VoiceNote, 'size_bytes'>[]) => notes.reduce((a, n) => a + n.size_bytes, 0)
export const usageLevel = (bytes: number): 'ok' | 'warn' | 'full' => (bytes >= SOFT_CAP_BYTES ? 'full' : bytes >= SOFT_CAP_BYTES * 0.8 ? 'warn' : 'ok')

export type Recording = { blob: Blob; seconds: number; mime: string }
export type Recorder = { stop: () => Promise<Recording>; cancel: () => void }

/** Empieza a grabar. `onTick` recibe los segundos; al llegar al tope se detiene sola y llama a `onLimit`. */
export async function startRecording(onTick: (s: number) => void, onLimit: () => void): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } })
  const mime = pickMime()
  let rec: MediaRecorder
  try { rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: BITRATE } : { audioBitsPerSecond: BITRATE }) }
  catch { stream.getTracks().forEach((t) => t.stop()); throw new Error('unsupported') }

  const chunks: Blob[] = []
  const t0 = performance.now()
  let cancelled = false
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
  const release = () => stream.getTracks().forEach((t) => t.stop())

  const tick = setInterval(() => {
    const s = Math.floor((performance.now() - t0) / 1000)
    onTick(Math.min(s, MAX_SECONDS))
    if (s >= MAX_SECONDS && rec.state === 'recording') { onLimit(); rec.stop() }
  }, 250)

  const done = new Promise<Recording>((resolve, reject) => {
    rec.onstop = () => {
      clearInterval(tick); release()
      if (cancelled) return reject(new Error('cancelled'))
      const type = baseMime(rec.mimeType || mime || 'audio/webm')
      const blob = new Blob(chunks, { type })
      const seconds = Math.max(1, Math.min(MAX_SECONDS, Math.round((performance.now() - t0) / 1000)))
      if (blob.size > MAX_BYTES) return reject(new Error('too_big'))
      if (blob.size === 0) return reject(new Error('empty'))
      resolve({ blob, seconds, mime: type })
    }
    rec.onerror = () => { clearInterval(tick); release(); reject(new Error('record')) }
  })
  rec.start(500)

  return {
    stop: () => { if (rec.state === 'recording') rec.stop(); return done },
    cancel: () => { cancelled = true; if (rec.state === 'recording') rec.stop(); else { clearInterval(tick); release() } done.catch(() => {}) },
  }
}
