import { useCallback, useEffect, useState } from 'react'
import { getSettings, patchSettings } from './settings'

/** Lo extra de cada cliente: su WhatsApp (solo para ti, nunca en páginas públicas) y una bitácora con fecha. Vive en tus ajustes. */
export type LogEntry = { id: string; date: string; text: string }
/** Dominio u hosting que le administras al cliente: la fecha vive en Renovaciones (renewalId); aquí, lo que te cuesta y lo que le cobras. */
export type Domain = { id: string; label: string; kind: 'dominio' | 'hosting'; cost: number; charge: number; renewalId: string | null }
export type ClientExtra = { phone?: string; rubro?: string; log?: LogEntry[]; domains?: Domain[]; hours?: TimeLog[] }
/** Horas trabajadas en un trabajo (cronómetro): inicio y minutos. */
export type TimeLog = { id: string; projectId: string; start: string; min: number }
type All = Record<string, ClientExtra>

export const digits = (s: string) => s.replace(/\D/g, '')
/** Un número de Guatemala de 8 dígitos lleva el 502 por delante. */
export const waNumber = (phone: string) => { const d = digits(phone); return d.length === 8 ? `502${d}` : d }
export const cleanAll = (raw: unknown): All => {
  if (!raw || typeof raw !== 'object') return {}
  const out: All = {}
  for (const [k, v] of Object.entries(raw as Record<string, ClientExtra>)) out[k] = { phone: typeof v?.phone === 'string' ? v.phone.slice(0, 30) : undefined, ...(typeof v?.rubro === 'string' ? { rubro: v.rubro.slice(0, 60) } : {}), log: Array.isArray(v?.log) ? v.log.filter((e) => e && typeof e.text === 'string').slice(0, 200) : [], ...(Array.isArray(v?.domains) ? { domains: v.domains.filter((d) => d && typeof d.label === 'string').slice(0, 20) } : {}), ...(Array.isArray(v?.hours) ? { hours: v.hours.filter((h) => h && typeof h.projectId === 'string' && typeof h.min === 'number').slice(-500) } : {}) }
  return out
}

export function useClientExtra(key: string) {
  const [all, setAll] = useState<All>({})
  useEffect(() => { void getSettings().then((s) => setAll(cleanAll((s as { clientExtra?: unknown }).clientExtra))) }, [])
  const save = useCallback((next: All) => { setAll(next); void patchSettings({ clientExtra: next } as never) }, [])
  const cur = all[key] ?? {}
  return {
    phone: cur.phone ?? '',
    rubro: cur.rubro ?? '',
    setRubro: (rubro: string) => save({ ...all, [key]: { ...cur, rubro: rubro.trim() || undefined } }),
    log: [...(cur.log ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    setPhone: (phone: string) => save({ ...all, [key]: { ...cur, phone: phone.trim() || undefined } }),
    addLog: (text: string, date: string) => save({ ...all, [key]: { ...cur, log: [...(cur.log ?? []), { id: Math.random().toString(36).slice(2, 10), date, text: text.trim() }] } }),
    removeLog: (id: string) => save({ ...all, [key]: { ...cur, log: (cur.log ?? []).filter((e) => e.id !== id) } }),
    domains: cur.domains ?? [],
    setDomains: (domains: Domain[]) => save({ ...all, [key]: { ...cur, domains } }),
    hours: cur.hours ?? [],
    addHours: (h: Omit<TimeLog, 'id'>) => save({ ...all, [key]: { ...cur, hours: [...(cur.hours ?? []), { ...h, id: Math.random().toString(36).slice(2, 10) }] } }),
    removeHours: (id: string) => save({ ...all, [key]: { ...cur, hours: (cur.hours ?? []).filter((x) => x.id !== id) } }),
  }
}

/** Los WhatsApp de todos los clientes (para recordar un cobro desde cualquier lista). */
export function useClientPhones(): Record<string, string> {
  const [all, setAll] = useState<All>({})
  useEffect(() => { void getSettings().then((s) => setAll(cleanAll((s as { clientExtra?: unknown }).clientExtra))) }, [])
  return Object.fromEntries(Object.entries(all).filter(([, v]) => v.phone).map(([k, v]) => [k, v.phone as string]))
}
/** Mensaje amable para recordar un pago por WhatsApp. */
export function reminderText(o: { name: string; concept: string; amount: string }) {
  return `Hola ${o.name}, ¿cómo estás? Te recuerdo el pago de ${o.concept} por ${o.amount}. Cuando lo hagas, me avisas por aquí. ¡Gracias!`
}

/** Todo lo extra de todos los clientes (rubro y teléfono), para listas. */
export function useAllClientExtra(): Record<string, ClientExtra> {
  const [all, setAll] = useState<All>({})
  useEffect(() => { void getSettings().then((s) => setAll(cleanAll((s as { clientExtra?: unknown }).clientExtra))) }, [])
  return all
}
