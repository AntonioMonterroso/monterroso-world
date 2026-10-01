// Envía las notificaciones push de Monterroso World.
//  · Modo cron  (cabecera x-cron-secret): revisa alertas vencidas, insistencias y pospuestas.
//  · Modo usuario (JWT): { test: true } manda una prueba a los dispositivos de esa persona.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'
import { occursOn, type Recurrence } from './recur.ts'

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? ''
const APP_URL = Deno.env.get('APP_URL') ?? 'https://antoniomonterroso.github.io/monterroso-world/'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

// ───────── Zona horaria ─────────
function tzOffsetMs(t: number, tz: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(t)).map((x) => [x.type, x.value]))
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(t / 1000) * 1000
}
function zonedToUtc(dateISO: string, minutes: number, tz: string) {
  const [y, m, d] = dateISO.split('-').map(Number)
  const guess = Date.UTC(y, m - 1, d, 0, minutes)
  const off1 = tzOffsetMs(guess, tz)
  const off2 = tzOffsetMs(guess - off1, tz)
  return guess - off2
}
const localDate = (t: number, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t))
const localMinutes = (t: number, tz: string) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(t)).map((x) => [x.type, x.value]))
  return +p.hour * 60 + +p.minute
}
const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

// ───────── Envío ─────────
type Payload = { title: string; body: string; tag: string; url: string; data?: Record<string, string>; actions?: { action: string; title: string }[]; requireInteraction?: boolean }

async function sendToUser(userId: string, payload: Payload) {
  const { data: subs } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', userId)
  let sent = 0
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: 'high' })
      sent++
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) await admin.from('push_subscriptions').delete().eq('id', s.id)
      else console.error('push error', code)
    }
  }
  return sent
}

type EventRow = Recurrence & { id: string; title: string; action: string | null; start_min: number; location: string | null; alerts: number[]; persistent: boolean; checklist: { id: string; text: string }[]; type: string }
type State = { event_id: string; occ_date: string; done: boolean; snoozed_until: string | null }

type BlockRow = { id: string; title: string; kind: string; days: number[]; start_min: number; end_min: number; notes: string | null }
type BlockAlerts = { enabled?: boolean; lead?: number[] }

const blockLead = (a: number) => (a === 0 ? 'Ahora' : a >= 60 && a % 60 === 0 ? `En ${a / 60} h` : `En ${a} min`)
const weekdayOfISO = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay()

function buildBlock(b: BlockRow, date: string, lead: number, next?: BlockRow): Payload {
  const dur = b.end_min - b.start_min
  const lines = [`${fmt(b.start_min)}–${fmt(b.end_min === 1440 ? 0 : b.end_min)} · ${dur >= 60 ? `${Math.floor(dur / 60)} h${dur % 60 ? ` ${dur % 60} min` : ''}` : `${dur} min`}`]
  if (b.notes) lines.push(b.notes.slice(0, 140))
  if (next) lines.push(`Después: ${next.title} a las ${fmt(next.start_min)}`)
  return { title: `${blockLead(lead)}: ${b.title}`, body: lines.join('\n'), tag: `block|${b.id}|${date}`, url: `${APP_URL}app/planear?fecha=${date}` }
}

const alertLabel = (a: number) => (a === 0 ? 'Es ahora' : a >= 1440 ? 'Mañana' : a >= 60 ? `En ${a / 60} h` : `En ${a} min`)

function build(ev: EventRow, date: string, lead: string): Payload {
  const lines = [`${fmt(ev.start_min)}${ev.action ? ` · ${ev.action}` : ''}`]
  if (ev.location) lines.push(ev.location)
  if (ev.checklist.length) lines.push(`Lleva: ${ev.checklist.map((c) => c.text).join(', ')}`)
  return {
    title: `${lead}: ${ev.title}`, body: lines.join('\n'), tag: `${ev.id}|${date}`, url: `${APP_URL}app`,
    data: { e: ev.id, d: date }, actions: [{ action: 'done', title: 'Hecho' }, { action: 'snooze', title: 'Posponer 10 min' }], requireInteraction: ev.persistent,
  }
}

async function processUser(userId: string, now: number) {
  const [{ data: st }, { data: events }, { data: states }, { data: logs }] = await Promise.all([
    admin.from('settings').select('data').eq('user_id', userId).maybeSingle(),
    admin.from('events').select('*').eq('user_id', userId).eq('active', true),
    admin.from('occurrence_state').select('event_id,occ_date,done,snoozed_until').eq('user_id', userId),
    admin.from('notification_log').select('id,event_id,occ_date,kind,sent_at,nag_count').eq('user_id', userId).gte('sent_at', new Date(now - 3 * 86_400_000).toISOString()),
  ])
  const settings = (st?.data ?? {}) as { tz?: string; quiet?: { start: number; end: number } | null; blockAlerts?: BlockAlerts }
  const tz = settings.tz || 'UTC'
  const quiet = settings.quiet
  const m = localMinutes(now, tz)
  const inQuiet = quiet ? (quiet.start < quiet.end ? m >= quiet.start && m < quiet.end : m >= quiet.start || m < quiet.end) : false

  const stateMap = new Map(((states ?? []) as State[]).map((s) => [`${s.event_id}|${s.occ_date}`, s]))
  const logMap = new Map((logs ?? []).map((l) => [`${l.event_id}|${l.occ_date}|${l.kind}`, l]))
  const dates = [...new Set([-1, 0, 1].map((d) => localDate(now + d * 86_400_000, tz)))]
  let count = 0

  for (const ev of (events ?? []) as EventRow[]) {
    for (const date of dates) {
      if (!occursOn(ev, date)) continue
      const state = stateMap.get(`${ev.id}|${date}`)
      if (state?.done) continue
      const start = zonedToUtc(date, ev.start_min, tz)

      const claim = async (kind: string) => {
        const { error } = await admin.from('notification_log').insert({ user_id: userId, event_id: ev.id, occ_date: date, kind })
        return !error // si ya existía (duplicado), no se reenvía
      }

      // 1) Alertas antes del evento
      for (const a of ev.alerts ?? []) {
        const fireAt = start - a * 60_000
        if (now < fireAt || now >= fireAt + 20 * 60_000) continue
        if (inQuiet && !ev.persistent) continue
        const kind = `alert:${a}`
        if (logMap.has(`${ev.id}|${date}|${kind}`)) continue
        if (await claim(kind)) count += await sendToUser(userId, build(ev, date, alertLabel(a)))
      }

      // 2) Insistir hasta que se confirme (cada 10 min, máx. 6 veces, durante la primera hora)
      if (ev.persistent && now >= start && now < start + 60 * 60_000) {
        const prev = logMap.get(`${ev.id}|${date}|nag`)
        if (!prev) {
          if (await claim('nag')) count += await sendToUser(userId, build(ev, date, 'Pendiente'))
        } else if (prev.nag_count < 6 && now - new Date(prev.sent_at).getTime() >= 10 * 60_000) {
          await admin.from('notification_log').update({ nag_count: prev.nag_count + 1, sent_at: new Date(now).toISOString() }).eq('id', prev.id)
          count += await sendToUser(userId, build(ev, date, 'Pendiente'))
        }
      }

      // 3) Pospuesto
      if (state?.snoozed_until) {
        const t = new Date(state.snoozed_until).getTime()
        if (t <= now && now - t < 60 * 60_000) {
          await admin.from('occurrence_state').update({ snoozed_until: null }).eq('event_id', ev.id).eq('occ_date', date)
          count += await sendToUser(userId, build(ev, date, 'Recordatorio'))
        }
      }
    }
  }

  // 4) Bloques del horario: avisan al empezar (o antes), según Ajustes
  const ba = settings.blockAlerts ?? {}
  if (ba.enabled !== false && !inQuiet) {
    const leads = ba.lead?.length ? ba.lead : [0]
    const [{ data: blocks }, { data: blogs }] = await Promise.all([
      admin.from('schedule_blocks').select('id,title,kind,days,start_min,end_min,notes').eq('user_id', userId).eq('active', true).eq('notify', true),
      admin.from('block_notification_log').select('block_id,occ_date,kind').eq('user_id', userId).gte('sent_at', new Date(now - 3 * 86_400_000).toISOString()),
    ])
    const sentBlocks = new Set((blogs ?? []).map((l) => `${l.block_id}|${l.occ_date}|${l.kind}`))
    const all = (blocks ?? []) as BlockRow[]
    for (const date of dates) {
      const wd = weekdayOfISO(date)
      const today = all.filter((b) => b.days.includes(wd)).sort((a, b) => a.start_min - b.start_min)
      for (const [i, b] of today.entries()) {
        const start = zonedToUtc(date, b.start_min, tz)
        for (const lead of leads) {
          const fireAt = start - lead * 60_000
          if (now < fireAt || now >= fireAt + 20 * 60_000) continue
          const kind = `alert:${lead}`
          if (sentBlocks.has(`${b.id}|${date}|${kind}`)) continue
          const { error } = await admin.from('block_notification_log').insert({ user_id: userId, block_id: b.id, occ_date: date, kind })
          if (!error) count += await sendToUser(userId, buildBlock(b, date, lead, today[i + 1]))
        }
      }
    }
  }
  return count
}

async function runCron() {
  const now = Date.now()
  const { data } = await admin.from('push_subscriptions').select('user_id')
  const users = [...new Set((data ?? []).map((r) => r.user_id as string))]
  let sent = 0
  for (const u of users) {
    try { sent += await processUser(u, now) } catch (e) { console.error('user error', (e as Error).message) }
  }
  return { users: users.length, sent }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (CRON_SECRET && req.headers.get('x-cron-secret') === CRON_SECRET) return json(await runCron())

  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  const { data } = token ? await admin.auth.getUser(token) : { data: { user: null } }
  if (!data.user) return json({ error: 'unauthorized' }, 401)
  const body = await req.json().catch(() => ({}))
  if (body?.test) {
    const sent = await sendToUser(data.user.id, { title: 'Monterroso World', body: 'Los avisos funcionan en este dispositivo.', tag: 'test', url: `${APP_URL}app` })
    return json({ sent })
  }
  return json({ error: 'bad request' }, 400)
})
