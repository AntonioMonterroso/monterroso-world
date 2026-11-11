import { describe, expect, it } from 'vitest'
import { importSong, isChordLine, mergeChordLine } from './chordpro'

describe('importSong', () => {
  it('lee ChordPro con metadatos y secciones', () => {
    const s = importSong('{title: Cuán grande es Él}\n{artist: Tradicional}\n{key: G}\n{tempo: 72}\n{soc}\n[G]Mi corazón [C]entona\n{eoc}\n{c: Repetir 2 veces}')
    expect(s.title).toBe('Cuán grande es Él')
    expect(s.artist).toBe('Tradicional')
    expect(s.key).toBe('G')
    expect(s.bpm).toBe(72)
    expect(s.content).toBe('# Coro\n[G]Mi corazón [C]entona\n// Repetir 2 veces')
  })
  it('mete los acordes de arriba dentro de la letra', () => {
    expect(mergeChordLine('Am      F', 'Hola mundo bonito')).toBe('[Am]Hola mun[F]do bonito')
    const s = importSong('Mi canción\n\nCoro:\nG       D\nAleluya cantaré')
    expect(s.title).toBe('Mi canción')
    expect(s.content).toBe('# Coro\n[G]Aleluya [D]cantaré')
  })
  it('reconoce líneas de solo acordes', () => {
    expect(isChordLine('Am  F  C/E  G7')).toBe(true)
    expect(isChordLine('A la orilla del mar')).toBe(false)
  })
})
