import { describe, expect, it } from 'vitest'
import { CAPTURE_LABEL, classifyCapture, focusStats, mmss, pickDopamine, remainingSeconds } from './focus'
import { streak, weekDone, weekStart, type HabitLog } from './habits'

const log = (habit_id: string, day: string): HabitLog => ({ id: habit_id + day, habit_id, day })

describe('semanas', () => {
  it('el lunes de la semana', () => {
    expect(weekStart('2026-10-01')).toBe('2026-09-28') // jueves → lunes
    expect(weekStart('2026-09-28')).toBe('2026-09-28')
    expect(weekStart('2026-10-04')).toBe('2026-09-28') // domingo pertenece a la semana que empezó el lunes
  })
  it('cuenta lo hecho esta semana', () => {
    expect(weekDone('a', [log('a', '2026-09-28'), log('a', '2026-10-01'), log('a', '2026-09-27'), log('b', '2026-09-29')], '2026-10-01')).toBe(2)
  })
})

describe('racha de hábitos', () => {
  const daily = { id: 'a', target_per_week: 7 }
  it('diaria: días seguidos, sin romperse si hoy aún no lo haces', () => {
    expect(streak(daily, [log('a', '2026-09-30'), log('a', '2026-09-29'), log('a', '2026-09-28')], '2026-10-01')).toEqual({ count: 3, unit: 'días' })
  })
  it('diaria: se corta con un día vacío', () => {
    expect(streak(daily, [log('a', '2026-10-01'), log('a', '2026-09-29')], '2026-10-01').count).toBe(1)
  })
  it('semanal: cuenta semanas que cumplieron la meta', () => {
    const h = { id: 'a', target_per_week: 2 }
    const logs = [log('a', '2026-09-28'), log('a', '2026-09-29'), log('a', '2026-09-21'), log('a', '2026-09-22'), log('a', '2026-09-14')]
    expect(streak(h, logs, '2026-10-01')).toEqual({ count: 2, unit: 'semanas' }) // esta (2) y la pasada (2); la anterior solo 1
  })
  it('semanal: la semana en curso sin cumplir todavía no rompe la racha', () => {
    const h = { id: 'a', target_per_week: 3 }
    const logs = [log('a', '2026-09-21'), log('a', '2026-09-22'), log('a', '2026-09-23'), log('a', '2026-09-28')]
    expect(streak(h, logs, '2026-10-01').count).toBe(1)
  })
  it('sin registros es cero', () => {
    expect(streak(daily, [], '2026-10-01').count).toBe(0)
  })
})

describe('captura durante el enfoque', () => {
  it('etiqueta lo que anotas', () => {
    expect(classifyCapture('Llamar al cliente de la panadería')).toBe('task')
    expect(classifyCapture('tengo que renovar el dominio')).toBe('task')
    expect(classifyCapture('¿Y si usamos Supabase?')).toBe('question')
    expect(classifyCapture('Me preocupa el cobro de octubre')).toBe('worry')
    expect(classifyCapture('https://ejemplo.com/referencia')).toBe('link')
    expect(classifyCapture('Qué tal una canción en 6/8')).toBe('idea')
    expect(classifyCapture('El cielo está bonito')).toBe('note')
    expect(CAPTURE_LABEL.task).toBe('Tarea')
  })
})

describe('temporizador y pausas', () => {
  it('segundos restantes nunca negativos', () => {
    expect(remainingSeconds(10_500, 10_000)).toBe(1)
    expect(remainingSeconds(10_000, 10_500)).toBe(0)
    expect(mmss(125)).toBe('02:05')
  })
  it('elige opciones distintas del menú de pausas', () => {
    const r = pickDopamine(['a', 'b', 'c', 'a', ' '], 3, () => 0.5)
    expect(new Set(r).size).toBe(r.length)
    expect(r.length).toBe(3)
    expect(pickDopamine([], 3)).toEqual([])
  })
  it('estadísticas de enfoque', () => {
    const at = (d: Date) => d.toISOString()
    const noon = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0)
    const s = [
      { id: '1', task: null, planned_min: 25, actual_min: 25, completed: true, distractions: 2, started_at: at(noon(2026, 10, 1)) },
      { id: '2', task: null, planned_min: 25, actual_min: 20, completed: false, distractions: 4, started_at: at(noon(2026, 9, 29)) },
      { id: '3', task: null, planned_min: 25, actual_min: 25, completed: true, distractions: 0, started_at: at(noon(2026, 9, 1)) },
    ]
    expect(focusStats(s, '2026-10-01')).toEqual({ todayMin: 25, weekMin: 45, weekSessions: 2, avgDistractions: 3 })
  })
})
