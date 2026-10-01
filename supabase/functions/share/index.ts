// Panel de compañeros: acceso por enlace secreto, sin cuenta.
// Solo devuelve lo que el dueño compartió (rutinas elegidas y el historial de ESE compañero) y,
// si lo permitió, registra entrenamientos de ese compañero. Nada más es alcanzable desde aquí.
import { createClient } from 'npm:@supabase/supabase-js@2'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })

const sha256hex = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((x) => x.toString(16).padStart(2, '0')).join('')
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function verifyPin(pin: string, salt: string, hash: string) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(salt), iterations: 150_000, hash: 'SHA-256' }, base, 256)
  const a = b64(bits)
  if (a.length !== hash.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ hash.charCodeAt(i)
  return diff === 0
}

type SetEntry = { reps: number; weight: number | null }
type Entry = { name: string; sets: SetEntry[] }
function cleanEntries(raw: unknown): Entry[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, 40).map((e): Entry | null => {
    if (!e || typeof e !== 'object') return null
    const name = typeof e.name === 'string' ? e.name.trim().slice(0, 120) : ''
    const sets = Array.isArray(e.sets) ? e.sets.slice(0, 20).map((s: { reps?: unknown; weight?: unknown }) => ({ reps: Math.min(999, Math.max(0, Math.round(Number(s?.reps) || 0))), weight: s?.weight == null || Number.isNaN(Number(s.weight)) ? null : Math.min(2000, Math.max(0, Number(s.weight))) })) : []
    return name && sets.length ? { name, sets } : null
  }).filter((x): x is Entry => x !== null)
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method' }, 405)
  if (Number(req.headers.get('content-length') ?? 0) > 60_000) return json({ error: 'too_large' }, 413)

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  const token = body?.token
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{32}$/.test(token)) return json({ error: 'invalid' }, 404)

  const { data: link } = await admin.from('share_links').select('*').eq('token_hash', await sha256hex(token)).maybeSingle()
  if (!link || link.revoked || (link.expires_at && new Date(link.expires_at) < new Date())) return json({ error: 'invalid' }, 404)

  // PIN opcional, con bloqueo tras 5 intentos fallidos
  if (link.pin_hash) {
    if (link.locked_until && new Date(link.locked_until) > new Date()) return json({ error: 'locked' }, 429)
    const pin = body?.pin
    if (typeof pin !== 'string' || !/^\d{4,8}$/.test(pin)) return json({ error: 'pin_required' }, 401)
    if (!(await verifyPin(pin, link.pin_salt, link.pin_hash))) {
      const fails = (link.failed_attempts ?? 0) + 1
      await admin.from('share_links').update(fails >= 5 ? { failed_attempts: 0, locked_until: new Date(Date.now() + 15 * 60_000).toISOString() } : { failed_attempts: fails }).eq('id', link.id)
      return json({ error: 'pin_wrong' }, 401)
    }
    if (link.failed_attempts) await admin.from('share_links').update({ failed_attempts: 0 }).eq('id', link.id)
  }
  await admin.from('share_links').update({ last_used_at: new Date().toISOString() }).eq('id', link.id)

  const { data: partner } = await admin.from('training_partners').select('name').eq('id', link.partner_id).eq('user_id', link.user_id).maybeSingle()
  if (!partner) return json({ error: 'invalid' }, 404)

  if (body?.action === 'get') {
    const ids: string[] = link.workout_ids ?? []
    const [{ data: workouts }, { data: items }, { data: logs }] = await Promise.all([
      ids.length ? admin.from('workouts').select('id,title,notes').eq('user_id', link.user_id).in('id', ids) : Promise.resolve({ data: [] }),
      ids.length ? admin.from('workout_items').select('workout_id,position,name,sets,reps,weight,rest_sec,notes').eq('user_id', link.user_id).in('workout_id', ids).order('position') : Promise.resolve({ data: [] }),
      admin.from('workout_logs').select('id,title,performed_on,duration_min,entries,notes').eq('user_id', link.user_id).eq('partner_id', link.partner_id).order('performed_on', { ascending: false }).limit(60),
    ])
    return json({
      partner: { name: partner.name }, canLog: Boolean(link.can_log),
      workouts: (workouts ?? []).map((w) => ({ ...w, items: (items ?? []).filter((i) => i.workout_id === w.id).map(({ workout_id: _w, ...i }) => i) })),
      logs: logs ?? [],
    })
  }

  if (body?.action === 'log') {
    if (!link.can_log) return json({ error: 'read_only' }, 403)
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 200) : ''
    const entries = cleanEntries(body.entries)
    if (!title || entries.length === 0) return json({ error: 'bad_request' }, 400)

    const workoutId = typeof body.workout_id === 'string' && (link.workout_ids ?? []).includes(body.workout_id) ? body.workout_id : null
    const today = new Date()
    const day = typeof body.performed_on === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.performed_on) ? body.performed_on : isoDay(today)
    if (day > isoDay(new Date(today.getTime() + 86_400_000)) || day < isoDay(new Date(today.getTime() - 7 * 86_400_000))) return json({ error: 'bad_date' }, 400)
    const duration = Number.isInteger(body.duration_min) && Number(body.duration_min) >= 1 && Number(body.duration_min) <= 600 ? Number(body.duration_min) : null
    const notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim().slice(0, 1000) : null

    // Tope diario para que un enlace filtrado no llene la base
    const { count } = await admin.from('workout_logs').select('id', { count: 'exact', head: true }).eq('user_id', link.user_id).eq('partner_id', link.partner_id).gte('created_at', new Date(Date.now() - 86_400_000).toISOString())
    if ((count ?? 0) >= 20) return json({ error: 'rate_limited' }, 429)

    const { error } = await admin.from('workout_logs').insert({ user_id: link.user_id, partner_id: link.partner_id, workout_id: workoutId, title, performed_on: day, duration_min: duration, entries, notes })
    if (error) return json({ error: 'save_failed' }, 500)
    return json({ ok: true })
  }

  return json({ error: 'bad_request' }, 400)
})
