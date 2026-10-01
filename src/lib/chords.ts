const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const IDX: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11, 'B#': 0 }

const FLAT_KEYS = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'])
export const prefersFlats = (key: string | null | undefined) => (key ? FLAT_KEYS.has(key) : false)

const noteAt = (i: number, flats: boolean) => (flats ? FLAT : SHARP)[((i % 12) + 12) % 12]

const CHORD_RE = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/

/** Transpone un acorde (Am7, F#m/C#, Bbmaj7…) por `semis` semitonos. Si no es un acorde, lo devuelve igual. */
export function transposeChord(chord: string, semis: number, flats: boolean): string {
  const m = CHORD_RE.exec(chord.trim())
  if (!m || IDX[m[1]] === undefined) return chord
  const root = noteAt(IDX[m[1]] + semis, flats)
  const bass = m[3] && IDX[m[3]] !== undefined ? `/${noteAt(IDX[m[3]] + semis, flats)}` : ''
  return `${root}${m[2]}${bass}`
}

export const transposeKey = (key: string, semis: number, flats?: boolean) => {
  const m = /^([A-G][#b]?)(m?)$/.exec(key)
  if (!m || IDX[m[1]] === undefined) return key
  return `${noteAt(IDX[m[1]] + semis, flats ?? prefersFlats(key))}${m[2]}`
}

/** Semitonos entre dos tonos (el más corto hacia arriba: 0–11). */
export const semitonesBetween = (from: string, to: string) => {
  const a = IDX[from.replace(/m$/, '')], b = IDX[to.replace(/m$/, '')]
  return a === undefined || b === undefined ? 0 : (((b - a) % 12) + 12) % 12
}

export const KEYS = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']

/** Acordes diatónicos del tono (mayor o menor natural). */
export function diatonic(key: string): string[] {
  const minor = key.endsWith('m')
  const root = IDX[key.replace(/m$/, '')]
  if (root === undefined) return []
  const flats = prefersFlats(key)
  const steps = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11]
  const quality = minor ? ['m', 'dim', '', 'm', 'm', '', ''] : ['', 'm', 'm', '', '', 'm', 'dim']
  return steps.map((s, i) => `${noteAt(root + s, flats)}${quality[i]}`)
}

export type Segment = { chord?: string; text: string }
export type SheetLine =
  | { type: 'section'; text: string }
  | { type: 'note'; text: string }
  | { type: 'blank' }
  | { type: 'line'; segments: Segment[] }

/** Formato: `# Sección`, `// nota`, y acordes entre corchetes dentro de la letra: `[Am]Hola [F]mundo`. */
export function parseSheet(content: string): SheetLine[] {
  return content.split('\n').map((raw): SheetLine => {
    const line = raw.replace(/\s+$/, '')
    if (!line.trim()) return { type: 'blank' }
    if (line.startsWith('#')) return { type: 'section', text: line.replace(/^#+\s*/, '') }
    if (line.startsWith('//')) return { type: 'note', text: line.replace(/^\/\/\s*/, '') }
    const segments: Segment[] = []
    const re = /\[([^\]]+)\]/g
    let last = 0
    let m: RegExpExecArray | null
    let pending: string | undefined
    while ((m = re.exec(line))) {
      const before = line.slice(last, m.index)
      if (before || pending) segments.push({ chord: pending, text: before })
      else if (last === 0 && m.index === 0) { /* empieza con acorde */ }
      pending = m[1]
      last = m.index + m[0].length
    }
    segments.push({ chord: pending, text: line.slice(last) })
    return { type: 'line', segments: segments.filter((s) => s.chord || s.text) }
  })
}

/** Aplica la transposición a todos los acordes del texto. */
export function transposeContent(content: string, semis: number, flats: boolean): string {
  if (!semis) return content
  return content.replace(/\[([^\]]+)\]/g, (_, c: string) => `[${transposeChord(c, semis, flats)}]`)
}

export const MAJOR_ROOTS = KEYS
