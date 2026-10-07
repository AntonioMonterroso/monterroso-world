import { localISO } from './time'

export type CaptureKind = 'task' | 'question' | 'worry' | 'idea' | 'link' | 'note'

const VERBS = ['llamar', 'enviar', 'mandar', 'comprar', 'revisar', 'pagar', 'terminar', 'escribir', 'agendar', 'hacer', 'cambiar', 'arreglar', 'pedir', 'buscar', 'preparar', 'recordar', 'responder', 'actualizar', 'subir', 'publicar', 'cobrar']

/** Etiqueta automática de lo que anotas mientras te concentras. Es una suposición: puedes cambiarla después. */
export function classifyCapture(text: string): CaptureKind {
  const t = text.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (/https?:\/\/|www\./.test(t)) return 'link'
  if (t.endsWith('?') || t.startsWith('¿')) return 'question'
  if (/preocup|miedo|ansios|estres|nervios|angusti/.test(t)) return 'worry'
  if (/^(tengo que|debo|hay que|no olvidar|acordarme de|falta)\b/.test(t) || VERBS.includes(t.split(/\s+/)[0])) return 'task'
  if (/\b(idea|podria|que tal|y si)\b/.test(t)) return 'idea'
  return 'note'
}

export const CAPTURE_LABEL: Record<CaptureKind, string> = { task: 'Tarea', question: 'Pregunta', worry: 'Preocupación', idea: 'Idea', link: 'Enlace', note: 'Nota' }

export const remainingSeconds = (endAt: number, now: number) => Math.max(0, Math.ceil((endAt - now) / 1000))
export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export type FocusSession = { id: string; task: string | null; planned_min: number; actual_min: number; completed: boolean; distractions: number; started_at: string }

/** Minutos enfocados hoy y en los últimos 7 días, y distracciones promedio por sesión. */
export function focusStats(sessions: FocusSession[], today = localISO()) {
  const day = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86_400_000) }
  const t = day(today)
  let todayMin = 0, weekMin = 0, weekSessions = 0, dist = 0
  for (const s of sessions) {
    const n = t - day(localISO(new Date(s.started_at)))
    if (n === 0) todayMin += s.actual_min
    if (n >= 0 && n < 7) { weekMin += s.actual_min; weekSessions++; dist += s.distractions }
  }
  return { todayMin, weekMin, weekSessions, avgDistractions: weekSessions ? Math.round((dist / weekSessions) * 10) / 10 : 0 }
}

export const DEFAULT_DOPAMINE = ['Estirarme 2 minutos', 'Tomar agua', 'Escuchar una canción', 'Mirar por la ventana', 'Caminar un poco', 'Tocar algo en la guitarra', 'Respirar profundo 5 veces']

/** Elige `n` opciones distintas del menú de pausas. */
export function pickDopamine(items: string[], n = 3, rand: () => number = Math.random): string[] {
  const pool = [...new Set(items.map((x) => x.trim()).filter(Boolean))]
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]] }
  return pool.slice(0, n)
}

const norm = (t: string) => t.trim().toLowerCase()

/** Lo que ya le has dedicado a una tarea (mismo título), sumando todas las rondas. */
export function taskTime(sessions: FocusSession[], title: string) {
  const k = norm(title)
  if (!k) return { rounds: 0, minutes: 0 }
  const mine = sessions.filter((s) => s.task && norm(s.task) === k && s.actual_min > 0)
  return { rounds: mine.length, minutes: mine.reduce((a, s) => a + s.actual_min, 0) }
}

/** Cuánto suele tomarte una tarea: promedio de rondas y minutos por título (solo tareas con 2+ rondas cuentan como "largas"). */
export function taskHabits(sessions: FocusSession[]) {
  const by = new Map<string, number[]>()
  for (const s of sessions) if (s.task && s.actual_min > 0) by.set(norm(s.task), [...(by.get(norm(s.task)) ?? []), s.actual_min])
  const tasks = [...by.values()]
  if (tasks.length < 3) return null
  const avgRounds = tasks.reduce((a, t) => a + t.length, 0) / tasks.length
  const avgMin = tasks.reduce((a, t) => a + t.reduce((x, y) => x + y, 0), 0) / tasks.length
  return { tasks: tasks.length, avgRounds: Math.round(avgRounds * 10) / 10, avgMin: Math.round(avgMin) }
}

/** Parte un tiempo largo en pasos de 10–25 min, parejos. */
export function splitSteps(totalMin: number): number[] {
  if (totalMin <= 25) return [Math.max(1, totalMin)]
  const n = Math.ceil(totalMin / 25)
  const base = Math.floor(totalMin / n)
  const extra = totalMin - base * n
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0))
}
