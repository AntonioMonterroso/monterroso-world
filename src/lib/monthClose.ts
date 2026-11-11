import { getSettings, patchSettings } from './settings'

/** Cierre del mes: una foto de cómo terminó (lo que entró, salió, se ahorró y quedó por cobrar). Se guarda en tus ajustes. */
export type Close = { month: string; income: number; expense: number; left: number; saved: number; pending: number; clients: number; paidClients: number; closedAt: string }
const r2 = (n: number) => Math.round(n * 100) / 100

export function buildClose(o: { month: string; income: number; expense: number; saved: number; pending: number; clients: number; paidClients: number; now?: Date }): Close {
  const d = o.now ?? new Date()
  return { month: o.month, income: r2(o.income), expense: r2(o.expense), left: r2(o.income - o.expense), saved: r2(o.saved), pending: r2(o.pending), clients: o.clients, paidClients: o.paidClients, closedAt: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
}
/** Una frase amable que resume cómo te fue (nunca regaña). */
export function closeNote(c: Close): string {
  if (c.income === 0 && c.expense === 0) return 'Mes sin movimientos registrados.'
  if (c.left > 0) return `Te sobraron ${c.left.toFixed(2)} quetzales este mes${c.saved > 0 ? ` y apartaste ${c.saved.toFixed(2)} para tu ahorro` : ''}. ¡Buen cierre!`
  if (c.left === 0) return 'Cerraste justo en cero. El próximo mes vemos cómo apartar algo.'
  return 'Este mes gastaste más de lo que entró. Revisa en qué se fue y ajusta el plan del próximo.'
}
export const cleanCloses = (raw: unknown): Record<string, Close> => {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, Close> = {}
  for (const [k, v] of Object.entries(raw as Record<string, Close>)) if (/^\d{4}-\d{2}$/.test(k) && v && typeof v.income === 'number') out[k] = v
  return out
}
export const loadCloses = async () => cleanCloses(((await getSettings()) as { monthCloses?: unknown }).monthCloses)
export const saveClose = async (c: Close) => { const all = await loadCloses(); await patchSettings({ monthCloses: { ...all, [c.month]: c } } as never) }
