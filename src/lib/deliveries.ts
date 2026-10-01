import { dayNum, isoFromNum } from './recur'

export type DeliveryKind = 'quote' | 'proposal' | 'invoice' | 'file' | 'song' | 'message' | 'other'
export type DeliveryChannel = 'email' | 'whatsapp' | 'message' | 'call' | 'other'
export type DeliveryStatus = 'to_send' | 'sent' | 'seen' | 'replied' | 'paid' | 'closed'

export type Delivery = {
  id: string; title: string; recipient: string | null; kind: DeliveryKind; channel: DeliveryChannel; status: DeliveryStatus
  sent_at: string | null; follow_up_date: string | null; event_id: string | null; project_id: string | null; notes: string | null; created_at: string
}

export const KINDS: Record<DeliveryKind, string> = { quote: 'Cotización', proposal: 'Propuesta', invoice: 'Factura', file: 'Archivo', song: 'Canción', message: 'Mensaje', other: 'Otro' }
export const CHANNELS: Record<DeliveryChannel, string> = { email: 'Correo', whatsapp: 'WhatsApp', message: 'Mensaje', call: 'Llamada', other: 'Otro' }
export const STATUSES: { id: DeliveryStatus; label: string }[] = [
  { id: 'to_send', label: 'Por enviar' }, { id: 'sent', label: 'Enviado' }, { id: 'seen', label: 'Visto' },
  { id: 'replied', label: 'Respondido' }, { id: 'paid', label: 'Pagado' }, { id: 'closed', label: 'Cerrado' },
]
export const statusLabel = (s: DeliveryStatus) => STATUSES.find((x) => x.id === s)!.label

/** Esperando respuesta: ya lo mandaste y aún no te contestan. */
export const isWaiting = (d: Delivery) => d.status === 'sent' || d.status === 'seen'
export const isOpen = (d: Delivery) => d.status === 'to_send' || isWaiting(d)
/** Toca dar seguimiento: sigue esperando y la fecha ya llegó. */
export const followUpDue = (d: Delivery, today: string) => isWaiting(d) && d.follow_up_date !== null && d.follow_up_date <= today
export const addDays = (iso: string, n: number) => isoFromNum(dayNum(iso) + n)
export const daysSince = (iso: string | null, today: string) => (iso ? dayNum(today) - dayNum(iso.slice(0, 10)) : 0)

/** Siguiente paso natural del envío, con el texto del botón. */
export function nextStep(s: DeliveryStatus): { to: DeliveryStatus; label: string } | null {
  switch (s) {
    case 'to_send': return { to: 'sent', label: 'Ya lo envié' }
    case 'sent': return { to: 'seen', label: 'Lo vieron' }
    case 'seen': return { to: 'replied', label: 'Respondieron' }
    default: return null
  }
}

export type LogKind = { text: string; tone: 'alert' | 'nag' | 'snooze' }
/** Traduce el tipo guardado por la función `push` ("alert:10", "nag", "snooze"). */
export function describeLog(kind: string): LogKind {
  if (kind === 'nag') return { text: 'Insistí hasta que lo confirmes', tone: 'nag' }
  if (kind === 'snooze') return { text: 'Pospuesto y vuelto a avisar', tone: 'snooze' }
  const m = /^alert:(\d+)$/.exec(kind)
  if (!m) return { text: 'Aviso', tone: 'alert' }
  const n = Number(m[1])
  if (n === 0) return { text: 'Aviso a la hora', tone: 'alert' }
  if (n >= 1440 && n % 1440 === 0) return { text: `Aviso ${n / 1440} ${n === 1440 ? 'día' : 'días'} antes`, tone: 'alert' }
  if (n >= 60 && n % 60 === 0) return { text: `Aviso ${n / 60} h antes`, tone: 'alert' }
  return { text: `Aviso ${n} min antes`, tone: 'alert' }
}
