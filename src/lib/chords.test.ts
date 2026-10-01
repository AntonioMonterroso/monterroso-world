import { describe, expect, it } from 'vitest'
import { diatonic, parseSheet, semitonesBetween, transposeChord, transposeContent, transposeKey } from './chords'

describe('transposición', () => {
  it('sube un tono manteniendo la calidad', () => {
    expect(transposeChord('Am7', 2, false)).toBe('Bm7')
    expect(transposeChord('Fmaj7', 2, false)).toBe('Gmaj7')
  })
  it('transpone el bajo en acordes con barra', () => {
    expect(transposeChord('D/F#', 2, false)).toBe('E/G#')
    expect(transposeChord('C/E', 3, true)).toBe('Eb/G')
  })
  it('usa bemoles cuando el tono destino los prefiere', () => {
    expect(transposeChord('C', 10, true)).toBe('Bb')
    expect(transposeChord('C', 10, false)).toBe('A#')
  })
  it('da la vuelta a la octava', () => {
    expect(transposeChord('B', 1, false)).toBe('C')
    expect(transposeChord('C', -1, false)).toBe('B')
  })
  it('no toca lo que no es un acorde', () => {
    expect(transposeChord('N.C.', 2, false)).toBe('N.C.')
  })
  it('transpone un texto completo', () => {
    expect(transposeContent('[G]Hola [D/F#]mundo', 2, false)).toBe('[A]Hola [E/G#]mundo')
  })
  it('tonos y distancia', () => {
    expect(transposeKey('Am', 3)).toBe('Cm')
    expect(semitonesBetween('G', 'A')).toBe(2)
    expect(semitonesBetween('A', 'G')).toBe(10)
  })
})

describe('tonos y hoja', () => {
  it('acordes diatónicos mayores y menores', () => {
    expect(diatonic('G')).toEqual(['G', 'Am', 'Bm', 'C', 'D', 'Em', 'F#dim'])
    expect(diatonic('Am')).toEqual(['A', 'Bdim', 'C', 'Dm', 'Em', 'F', 'G'].map((c, i) => (i === 0 ? 'Am' : c)))
  })
  it('separa secciones, notas y acordes sobre la letra', () => {
    const l = parseSheet('# Verso\n// golpe abajo\n[Am]Hola [F]mundo\n\n[C] [G]')
    expect(l[0]).toEqual({ type: 'section', text: 'Verso' })
    expect(l[1]).toEqual({ type: 'note', text: 'golpe abajo' })
    expect(l[2]).toEqual({ type: 'line', segments: [{ chord: 'Am', text: 'Hola ' }, { chord: 'F', text: 'mundo' }] })
    expect(l[3]).toEqual({ type: 'blank' })
    expect(l[4]).toEqual({ type: 'line', segments: [{ chord: 'C', text: ' ' }, { chord: 'G', text: '' }] })
  })
  it('texto antes del primer acorde se conserva', () => {
    const l = parseSheet('Intro [Am]texto')
    expect(l[0]).toEqual({ type: 'line', segments: [{ text: 'Intro ' }, { chord: 'Am', text: 'texto' }] })
  })
})
