/** Cronómetro de horas por trabajo: solo uno corre a la vez y sobrevive si cierras la app (se guarda en el navegador). */
export type Running = { projectId: string; client: string; start: number }
const KEY = 'mw_work_timer'
let mem: Running | null = null

export function readTimer(): Running | null {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as Running) : mem } catch { return mem }
}
export function startTimer(r: Running): void { mem = r; try { localStorage.setItem(KEY, JSON.stringify(r)) } catch { /* sin almacenamiento */ } }
export function stopTimer(): void { mem = null; try { localStorage.removeItem(KEY) } catch { /* sin almacenamiento */ } }

/** Minutos redondeados (mínimo 1) entre el inicio y ahora. */
export const minutesSince = (start: number, now = Date.now()) => Math.max(1, Math.round((now - start) / 60000))
export const fmtHours = (min: number) => { const h = Math.floor(min / 60), m = min % 60; return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min` }
/** Cuánto ganas por hora: lo cobrado entre las horas registradas. */
export const perHour = (received: number, min: number) => (min > 0 ? Math.round((received / (min / 60)) * 100) / 100 : null)
