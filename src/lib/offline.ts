import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/** Sin internet: lo que anotas se guarda en este teléfono y, al volver la conexión, se manda a Pendientes para clasificarlo. */
export type Queued = { id: string; text: string; at: number }
const KEY = 'mw_offline_queue'
const EVT = 'mw-offline-queue'
let mem: Queued[] = []

export function readQueue(): Queued[] { try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as Queued[]) : mem } catch { return mem } }
const write = (q: Queued[]) => { mem = q; try { localStorage.setItem(KEY, JSON.stringify(q)) } catch { /* sin almacenamiento */ } window.dispatchEvent(new Event(EVT)) }

export function enqueue(lines: string[]): void {
  write([...readQueue(), ...lines.map((text) => ({ id: Math.random().toString(36).slice(2, 10), text, at: Date.now() }))])
}

export const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false

/** Manda lo guardado a Pendientes. Lo que falle se queda para el siguiente intento. */
export async function flushQueue(): Promise<number> {
  const q = readQueue()
  if (!q.length || isOffline()) return 0
  const left: Queued[] = []
  let sent = 0
  for (const x of q) {
    const { error } = await supabase.from('inbox_items').insert({ text: x.text })
    if (error) left.push(x); else sent++
  }
  write(left)
  return sent
}

/** Estado de la conexión y cuántas cosas esperan para enviarse; al volver el internet, las envía solas. */
export function useOffline() {
  const [offline, setOffline] = useState(isOffline())
  const [pending, setPending] = useState(() => readQueue().length)
  const [sentMsg, setSentMsg] = useState('')
  useEffect(() => {
    const sync = () => setPending(readQueue().length)
    const goOn = async () => { setOffline(false); const n = await flushQueue(); sync(); if (n) { setSentMsg(`Volvió el internet: mandé ${n} ${n === 1 ? 'cosa' : 'cosas'} a Pendientes.`); setTimeout(() => setSentMsg(''), 6000) } }
    const goOff = () => setOffline(true)
    window.addEventListener('online', goOn); window.addEventListener('offline', goOff); window.addEventListener(EVT, sync)
    if (!isOffline() && readQueue().length) void goOn()
    return () => { window.removeEventListener('online', goOn); window.removeEventListener('offline', goOff); window.removeEventListener(EVT, sync) }
  }, [])
  return { offline, pending, sentMsg }
}
