import { supabase } from './supabase'

const BUCKET = 'inspiration'
export const MAX_SIDE = 1600

// En desarrollo con servidor falso no hay almacenamiento real: se guarda en memoria.
const mem = new Map<string, string>()
const mocked = () => import.meta.env.DEV && typeof localStorage !== 'undefined' && Boolean(localStorage.getItem('mw_mock'))

/** Reduce la imagen antes de subirla (lado máximo 1600 px, JPEG): ahorra datos y espacio. */
export async function compressImage(file: File, maxSide = MAX_SIDE, quality = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * scale)), h = Math.max(1, Math.round(bmp.height * scale))
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const g = c.getContext('2d')!
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h)
  g.drawImage(bmp, 0, 0, w, h)
  bmp.close?.()
  const blob: Blob | null = await new Promise((r) => c.toBlob(r, 'image/jpeg', quality))
  if (!blob) throw new Error('compress')
  return blob
}

export async function uploadImage(userId: string | undefined, file: File): Promise<string> {
  const blob = await compressImage(file)
  const path = `${userId ?? 'dev'}/${crypto.randomUUID()}.jpg`
  if (mocked()) { mem.set(path, URL.createObjectURL(blob)); return path }
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: false })
  if (error) throw error
  return path
}

export async function removeImage(path: string): Promise<void> {
  if (mocked()) { mem.delete(path); return }
  await supabase.storage.from(BUCKET).remove([path])
}

/** Enlaces temporales (1 hora) para mostrar imágenes privadas. */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  if (mocked()) { for (const p of paths) { const u = mem.get(p); if (u) out[p] = u } return out }
  if (paths.length === 0) return out
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
  for (const d of data ?? []) if (d.path && d.signedUrl) out[d.path] = d.signedUrl
  return out
}
