import { supabase } from './supabase'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

const b64ToBytes = (s: string) => {
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  const raw = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export type PushStatus = 'unsupported' | 'needs-install' | 'blocked' | 'off' | 'on'

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

export async function pushStatus(): Promise<PushStatus> {
  if (isIOS() && !isStandalone()) return 'needs-install'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window) || !VAPID) return 'unsupported'
  if (Notification.permission === 'denied') return 'blocked'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

async function saveTimezone() {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  const { data } = await supabase.from('settings').select('data').maybeSingle()
  await supabase.from('settings').upsert({ data: { ...(data?.data ?? {}), tz } })
}

export async function enablePush(): Promise<void> {
  if (!VAPID) throw new Error('Falta la llave de avisos.')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('No diste permiso para las notificaciones.')
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID) as BufferSource }))
  const j = sub.toJSON()
  if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) throw new Error('El dispositivo no devolvió una suscripción válida.')
  const { error } = await supabase.from('push_subscriptions').upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_agent: navigator.userAgent.slice(0, 280) }, { onConflict: 'endpoint' })
  if (error) throw new Error('No pude guardar este dispositivo.')
  await saveTimezone()
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
}

export async function sendTest(): Promise<number> {
  const { data, error } = await supabase.functions.invoke('push', { body: { test: true } })
  if (error) throw new Error('No pude enviar la prueba.')
  return (data as { sent?: number })?.sent ?? 0
}

export type Quiet = { start: number; end: number } | null

export async function loadSettings(): Promise<{ tz?: string; quiet?: Quiet }> {
  const { data } = await supabase.from('settings').select('data').maybeSingle()
  return (data?.data ?? {}) as { tz?: string; quiet?: Quiet }
}
export async function saveQuiet(quiet: Quiet): Promise<void> {
  const { data } = await supabase.from('settings').select('data').maybeSingle()
  await supabase.from('settings').upsert({ data: { ...(data?.data ?? {}), quiet } })
}
