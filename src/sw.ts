/// <reference lib="webworker" />
// Service worker: caché de la app + notificaciones push.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> }

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL(`${import.meta.env.BASE_URL}index.html`)))

self.addEventListener('install', () => { self.skipWaiting() })
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()) })

type PushData = {
  title: string
  body?: string
  tag?: string
  url?: string
  data?: Record<string, string>
  actions?: { action: string; title: string }[]
  requireInteraction?: boolean
}

self.addEventListener('push', (event) => {
  let p: PushData = { title: 'Monterroso World' }
  try { if (event.data) p = { ...p, ...(event.data.json() as PushData) } } catch { p.body = event.data?.text() }
  const base = `${import.meta.env.BASE_URL}`
  event.waitUntil(
    self.registration.showNotification(p.title, {
      body: p.body,
      tag: p.tag,
      icon: `${base}icon-192.png`,
      badge: `${base}badge-96.png`,
      data: { url: p.url ?? self.registration.scope, ...(p.data ?? {}) },
      actions: p.actions,
      requireInteraction: p.requireInteraction,
    } as NotificationOptions),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const d = (event.notification.data ?? {}) as { url?: string; e?: string; d?: string }
  const url = new URL(d.url ?? self.registration.scope, self.location.origin)
  if ((event.action === 'done' || event.action === 'snooze') && d.e && d.d) {
    url.searchParams.set('act', event.action)
    url.searchParams.set('e', d.e)
    url.searchParams.set('d', d.d)
  }
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const open = all.find((c) => c.url.startsWith(self.registration.scope))
    if (open) {
      await open.focus()
      if (url.search) await open.navigate(url.href)
    } else {
      await self.clients.openWindow(url.href)
    }
  })())
})
