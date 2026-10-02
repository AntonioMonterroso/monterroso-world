export type ExitKind = 'work' | 'rehearsal' | 'gig' | 'church' | 'gym' | 'client' | 'other'
export type ExitItem = { id: string; text: string; forgot: number }
export type ExitList = { id: string; name: string; kind: ExitKind; items: ExitItem[]; position: number }

export const EXIT_KINDS: Record<ExitKind, string> = { work: 'Trabajo', rehearsal: 'Ensayo', gig: 'Tocada', church: 'Iglesia', gym: 'Gimnasio', client: 'Cliente', other: 'Otra' }

const it = (text: string): Omit<ExitItem, 'id'> => ({ text, forgot: 0 })
export const SEEDS: { name: string; kind: ExitKind; items: string[] }[] = [
  { name: 'Trabajo', kind: 'work', items: ['Laptop y cargador', 'Audífonos', 'Llaves', 'Cartera y celular', 'Botella de agua'] },
  { name: 'Ensayo', kind: 'rehearsal', items: ['Guitarra y cable', 'Pedales y fuente', 'Baquetas', 'Afinador', 'Letras o acordes', 'Cargador del celular'] },
  { name: 'Tocada', kind: 'gig', items: ['Instrumento y estuche', 'Cables de repuesto', 'Pedalera', 'Cuerdas y baquetas de repuesto', 'Repertorio impreso', 'Ropa de la tocada', 'Efectivo para el parqueo'] },
  { name: 'Iglesia', kind: 'church', items: ['Biblia', 'Libreta', 'Laptop o USB con la presentación', 'Cable HDMI', 'Ofrenda'] },
  { name: 'Gimnasio', kind: 'gym', items: ['Ropa deportiva', 'Toalla', 'Botella de agua', 'Audífonos', 'Candado'] },
  { name: 'Cliente', kind: 'client', items: ['Laptop y cargador', 'Cotización o contrato', 'Acceso al proyecto', 'Tarjeta de presentación'] },
]
export const seedItems = (texts: string[]): ExitItem[] => texts.map((t, i) => ({ id: `s${i}-${Math.random().toString(36).slice(2, 6)}`, ...it(t) }))

/** Qué lista conviene según el tipo de bloque o evento que viene. */
export function exitKindFor(kind?: string | null): ExitKind | null {
  switch (kind) {
    case 'rehearsal': return 'rehearsal'
    case 'church': return 'church'
    case 'exercise': return 'gym'
    case 'work': case 'meeting': return 'work'
    case 'appointment': return 'client'
    default: return null
  }
}

/** Las que más olvidas, primero, para que no se te pasen. */
export const oftenForgotten = (l: ExitList) => l.items.filter((i) => i.forgot >= 2).map((i) => i.text)

export const newItem = (text: string): ExitItem => ({ id: `i-${Math.random().toString(36).slice(2, 9)}`, text: text.trim(), forgot: 0 })
