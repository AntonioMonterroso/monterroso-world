import { describe, expect, it } from 'vitest'
import { BACKUP_TABLES, backupName, totalRows } from './backup'

describe('respaldo', () => {
  it('el archivo lleva la fecha y no incluye la bóveda ni las notas de voz', () => {
    expect(backupName(new Date(2026, 10, 11))).toBe('monterroso-world-respaldo-2026-11-11.json')
    expect((BACKUP_TABLES as readonly string[]).some((t) => t.startsWith('vault') || t === 'voice_notes')).toBe(false)
    expect(new Set(BACKUP_TABLES).size).toBe(BACKUP_TABLES.length)
  })
  it('suma las filas', () => { expect(totalRows({ counts: { a: 3, b: 4 } })).toBe(7) })
})
