import { describe, expect, it } from 'vitest'
import { cleanEntries, exerciseNames, firstNumber, progress, sessionsInLast, volume, weightChange, type WorkoutLog } from './fitness'
import { hashPin, isValidToken, newToken, tokenHash, verifyPin } from './share'

const log = (date: string, name: string, weights: number[]): WorkoutLog => ({ id: date, partner_id: null, workout_id: null, session_key: null, title: 'x', performed_on: date, duration_min: null, notes: null, entries: [{ name, sets: weights.map((w) => ({ reps: 8, weight: w })) }] })

describe('ejercicio', () => {
  it('lee el primer número de un rango', () => {
    expect(firstNumber('8-10')).toBe(8)
    expect(firstNumber('12')).toBe(12)
    expect(firstNumber('al fallo')).toBe(10)
  })
  it('volumen de la sesión', () => {
    expect(volume([{ name: 'Press', sets: [{ reps: 10, weight: 40 }, { reps: 8, weight: 50 }] }, { name: 'Plancha', sets: [{ reps: 1, weight: null }] }])).toBe(800)
  })
  it('progreso: mejor peso por sesión, sin distinguir mayúsculas y en orden', () => {
    const p = progress([log('2026-10-10', 'press banca', [60, 70]), log('2026-10-01', 'Press Banca', [50, 55]), log('2026-10-05', 'Sentadilla', [80])], 'Press banca')
    expect(p).toEqual([{ date: '2026-10-01', best: 55 }, { date: '2026-10-10', best: 70 }])
  })
  it('nombres de ejercicios sin repetir', () => {
    expect(exerciseNames([log('2026-10-01', 'Remo', [1]), log('2026-10-02', 'remo ', [1]), log('2026-10-03', 'Curl', [1])])).toEqual(['Curl', 'Remo'])
  })
  it('sesiones de los últimos 7 días', () => {
    expect(sessionsInLast([{ performed_on: '2026-10-01' }, { performed_on: '2026-09-26' }, { performed_on: '2026-09-24' }], '2026-10-01', 7)).toBe(2)
  })
  it('cambio de peso', () => {
    expect(weightChange([{ id: '1', measured_on: '2026-10-01', weight_kg: 80.5, note: null }, { id: '2', measured_on: '2026-09-01', weight_kg: 82, note: null }])).toBe(-1.5)
    expect(weightChange([])).toBeNull()
  })
  it('limpia entradas inválidas o exageradas', () => {
    const r = cleanEntries([{ name: '  Press ', sets: [{ reps: 5000, weight: -3 }, { reps: 'x', weight: 'y' }] }, { name: '', sets: [{ reps: 1 }] }, 'basura', { name: 'Vacío', sets: [] }])
    expect(r).toEqual([{ name: 'Press', sets: [{ reps: 999, weight: 0 }, { reps: 0, weight: null }] }])
  })
})

describe('enlaces para compañeros', () => {
  it('tokens aleatorios, largos y seguros para URL', () => {
    const a = newToken(), b = newToken()
    expect(a).not.toBe(b)
    expect(isValidToken(a)).toBe(true)
    expect(isValidToken('corto')).toBe(false)
    expect(isValidToken('../../etc/passwd'.padEnd(32, 'a'))).toBe(false)
  })
  it('el hash es estable y no revela el token', async () => {
    const t = newToken()
    const h = await tokenHash(t)
    expect(h).toMatch(/^[a-f0-9]{64}$/)
    expect(h).toBe(await tokenHash(t))
    expect(h).not.toContain(t)
  })
  it('el PIN correcto valida y el incorrecto no', async () => {
    const { salt, hash } = await hashPin('4821')
    expect(await verifyPin('4821', salt, hash)).toBe(true)
    expect(await verifyPin('4822', salt, hash)).toBe(false)
  })
})
