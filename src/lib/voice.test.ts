import { describe, expect, it } from 'vitest'
import { SOFT_CAP_BYTES, baseMime, extFor, fmtBytes, fmtClock, usageLevel, usageTotal } from './voice'

describe('notas de voz', () => {
  it('normaliza el tipo de audio', () => {
    expect(baseMime('audio/webm;codecs=opus')).toBe('audio/webm')
    expect(baseMime('video/webm;codecs=opus')).toBe('audio/webm')
    expect(baseMime('audio/mp4')).toBe('audio/mp4')
    expect(baseMime('application/x-evil')).toBe('audio/webm')
  })
  it('extensión del archivo', () => {
    expect(extFor('audio/webm')).toBe('webm')
    expect(extFor('audio/mp4')).toBe('m4a')
  })
  it('formatos legibles', () => {
    expect(fmtBytes(512)).toBe('512 B')
    expect(fmtBytes(2048)).toBe('2 KB')
    expect(fmtBytes(3 * 1024 * 1024)).toBe('3.0 MB')
    expect(fmtClock(75)).toBe('1:15')
    expect(fmtClock(5)).toBe('0:05')
  })
  it('medidor de espacio avisa al 80% y al llenarse', () => {
    expect(usageTotal([{ size_bytes: 100 }, { size_bytes: 50 }])).toBe(150)
    expect(usageLevel(0)).toBe('ok')
    expect(usageLevel(SOFT_CAP_BYTES * 0.8)).toBe('warn')
    expect(usageLevel(SOFT_CAP_BYTES)).toBe('full')
  })
})
