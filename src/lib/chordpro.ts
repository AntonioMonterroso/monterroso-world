/** Convierte una canción pegada (ChordPro o «acordes arriba de la letra») al formato de la app:
 *  `# Sección`, `// nota` y acordes entre corchetes dentro de la letra. */
export type Imported = { title: string; artist: string | null; key: string | null; bpm: number | null; timeSig: string | null; capo: number; content: string }

const CHORD_TOKEN = /^\(?[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|M)?\d*(?:sus\d*|add\d+|maj\d*|b\d+|#\d+)*(?:\/[A-G][#b]?)?\)?$/
const isChordToken = (t: string) => CHORD_TOKEN.test(t)
/** Una línea solo de acordes (al menos uno), como «Am   F   C   G». */
export const isChordLine = (line: string) => {
  const toks = line.trim().split(/\s+/).filter(Boolean)
  return toks.length > 0 && toks.every((t) => isChordToken(t) || t === '|' || t === '-')
    && toks.some((t) => isChordToken(t))
}

/** Mete los acordes de la línea de arriba dentro de la letra, en la misma columna. */
export function mergeChordLine(chords: string, lyric: string): string {
  const marks: { at: number; c: string }[] = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(chords))) if (isChordToken(m[0])) marks.push({ at: m.index, c: m[0].replace(/[()]/g, '') })
  let out = lyric.padEnd(Math.max(lyric.length, (marks.at(-1)?.at ?? 0)), ' ')
  for (const k of [...marks].reverse()) out = `${out.slice(0, k.at)}[${k.c}]${out.slice(k.at)}`
  return out.replace(/\s+$/, '')
}

const SECTION_WORDS = /^(intro|verso|verse|estrofa|coro|chorus|pre-?coro|pre-?chorus|puente|bridge|final|outro|interludio|instrumental|tag|solo)\b/i
const SECTION_FROM_DIRECTIVE: Record<string, string> = { soc: 'Coro', start_of_chorus: 'Coro', sov: 'Verso', start_of_verse: 'Verso', sob: 'Puente', start_of_bridge: 'Puente' }

export function importSong(raw: string): Imported {
  const meta: Imported = { title: '', artist: null, key: null, bpm: null, timeSig: null, capo: 0, content: '' }
  const out: string[] = []
  const lines = raw.replace(/\r\n?/g, '\n').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\s+$/, '')
    const dir = /^\s*\{\s*([a-z_]+)\s*(?::\s*(.*?))?\s*\}\s*$/i.exec(line)
    if (dir) {
      const k = dir[1].toLowerCase(), v = (dir[2] ?? '').trim()
      if (k === 'title' || k === 't') meta.title = v
      else if (k === 'artist' || k === 'subtitle' || k === 'st') meta.artist = v || null
      else if (k === 'key') meta.key = v || null
      else if (k === 'tempo') meta.bpm = Number(v) || null
      else if (k === 'time') meta.timeSig = v || null
      else if (k === 'capo') meta.capo = Number(v) || 0
      else if (k === 'comment' || k === 'c' || k === 'ci' || k === 'comment_italic') out.push(SECTION_WORDS.test(v) ? `# ${v}` : `// ${v}`)
      else if (SECTION_FROM_DIRECTIVE[k]) out.push(`# ${v || SECTION_FROM_DIRECTIVE[k]}`)
      continue // eoc, eov y demás directivas no se muestran
    }
    if (!line.trim()) { out.push(''); continue }
    const bare = line.trim().replace(/^\[|\]$/g, '').replace(/:$/, '')
    if (SECTION_WORDS.test(bare) && bare.split(/\s+/).length <= 3 && !/\[[A-G]/.test(line)) { out.push(`# ${bare}`); continue }
    if (isChordLine(line)) {
      const nextLine = lines[i + 1]
      if (nextLine !== undefined && nextLine.trim() && !isChordLine(nextLine) && !/^\s*\{/.test(nextLine)) { out.push(mergeChordLine(line, nextLine.replace(/\s+$/, ''))); i++ }
      else out.push(line.trim().split(/\s+/).filter(isChordToken).map((c) => `[${c.replace(/[()]/g, '')}]`).join(' '))
      continue
    }
    out.push(line)
  }
  // Sin título: la primera línea de texto que no sea sección ni acordes
  if (!meta.title) {
    const ix = out.findIndex((l) => l.trim() && !l.startsWith('#') && !l.startsWith('//') && !l.includes('['))
    if (ix >= 0 && ix < 3) { meta.title = out[ix].trim(); out.splice(ix, 1) }
  }
  meta.content = out.join('\n').replace(/^\n+/, '').replace(/\n{3,}/g, '\n\n').trimEnd()
  return meta
}
