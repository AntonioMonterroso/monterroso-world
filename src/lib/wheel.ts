/** Ruleta de decisiones: matemática del giro. Se elige primero el resultado (al azar, parejo) y luego se gira hasta él. */
export const sliceSize = (n: number) => 360 / Math.max(1, n)

/** Índice que señala la flecha de arriba cuando la rueda ha girado `rotation` grados en sentido horario. */
export function winnerAt(rotation: number, n: number): number {
  const s = sliceSize(n)
  const pointer = (((360 - (rotation % 360)) % 360) + 360) % 360
  return Math.min(n - 1, Math.floor(pointer / s))
}

/** Rotación final que deja el centro de la porción `index` bajo la flecha, dando `spins` vueltas completas. */
export function targetRotation(current: number, index: number, n: number, spins = 5, jitter = 0): number {
  const s = sliceSize(n)
  const center = (index + 0.5) * s + jitter * s * 0.35
  const delta = ((((-center - current) % 360) + 360) % 360)
  return current + spins * 360 + delta
}

export const pickIndex = (n: number, rnd = Math.random()) => Math.min(n - 1, Math.floor(rnd * n))

export type Wheel = { id: string; name: string; options: string[]; source?: 'tasks' }
export const DEFAULT_WHEELS: Wheel[] = [
  { id: 'cena', name: '¿Qué ceno?', options: ['Pizza', 'Tacos', 'Pollo asado', 'Pasta', 'Hamburguesa', 'Sopa'] },
  { id: 'practica', name: '¿Qué practico?', options: ['Guitarra', 'Batería', 'Piano', 'Producción', 'Teoría'] },
  { id: 'tarea', name: '¿Qué tarea abro?', options: [], source: 'tasks' },
]
