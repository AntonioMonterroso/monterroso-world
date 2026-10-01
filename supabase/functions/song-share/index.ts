// Enlace público de solo lectura para una canción o un setlist.
// Devuelve ÚNICAMENTE: título, artista, tono, BPM, compás, capo y la hoja (letra, acordes y, si se permitió, las notas por línea).
// Nunca devuelve notas de voz, notas generales de la canción ni nada más del usuario.
import { createClient } from 'npm:@supabase/supabase-js@2'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

const sha256hex = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((x) => x.toString(16).padStart(2, '0')).join('')

// Lista blanca de campos: lo que no está aquí no sale.
const COLS = 'id,title,artist,song_key,bpm,time_sig,capo,content'
type Song = { id: string; title: string; artist: string | null; song_key: string | null; bpm: number | null; time_sig: string; capo: number; content: string }

const publicSong = (s: Song, notes: boolean) => ({
  title: s.title, artist: s.artist, key: s.song_key, bpm: s.bpm, time_sig: s.time_sig, capo: s.capo,
  content: notes ? s.content : s.content.split('\n').filter((l) => !l.startsWith('//')).join('\n'),
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  if (Number(req.headers.get('content-length') ?? 0) > 2_000) return json({ error: 'too_large' }, 413)

  const body = await req.json().catch(() => null) as { token?: unknown } | null
  const token = body?.token
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32}$/.test(token)) return json({ error: 'invalid' }, 404)

  const { data: link } = await admin.from('song_shares').select('*').eq('token_hash', await sha256hex(token)).maybeSingle()
  if (!link || link.revoked || (link.expires_at && new Date(link.expires_at) < new Date())) return json({ error: 'invalid' }, 404)
  await admin.from('song_shares').update({ last_used_at: new Date().toISOString() }).eq('id', link.id)

  const notes = Boolean(link.include_notes)

  if (link.song_id) {
    const { data: s } = await admin.from('songs').select(COLS).eq('id', link.song_id).eq('user_id', link.user_id).maybeSingle()
    if (!s) return json({ error: 'invalid' }, 404)
    return json({ kind: 'song', includeNotes: notes, songs: [publicSong(s as Song, notes)] })
  }

  const { data: set } = await admin.from('setlists').select('title,event_date,song_ids').eq('id', link.setlist_id).eq('user_id', link.user_id).maybeSingle()
  if (!set) return json({ error: 'invalid' }, 404)
  const ids: string[] = set.song_ids ?? []
  const { data: rows } = ids.length ? await admin.from('songs').select(COLS).eq('user_id', link.user_id).in('id', ids) : { data: [] as Song[] }
  const byId = new Map(((rows ?? []) as Song[]).map((s) => [s.id, s]))
  const songs = ids.map((id) => byId.get(id)).filter((s): s is Song => Boolean(s)).map((s) => publicSong(s, notes))
  return json({ kind: 'setlist', includeNotes: notes, title: set.title, event_date: set.event_date, songs })
})
