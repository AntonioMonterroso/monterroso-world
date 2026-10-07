import { describe, expect, it } from 'vitest'

import { splitSteps, taskHabits, taskTime } from './focus'
describe('tiempo real de tareas', () => {
  const s = (task: string, m: number) => ({ id: task + m, task, planned_min: 25, actual_min: m, completed: true, distractions: 0, started_at: new Date().toISOString() })
  it('suma rondas por título sin importar mayúsculas', () => {
    expect(taskTime([s('Logo', 25), s('logo ', 20), s('Otra', 10)], 'LOGO')).toEqual({ rounds: 2, minutes: 45 })
  })
  it('no opina con pocas tareas', () => { expect(taskHabits([s('a', 25), s('b', 25)])).toBeNull() })
  it('promedia rondas y minutos por tarea', () => {
    expect(taskHabits([s('a', 25), s('a', 25), s('b', 25), s('c', 25)])).toEqual({ tasks: 3, avgRounds: 1.3, avgMin: 33 })
  })
  it('parte en pasos de 10-25 min parejos', () => {
    expect(splitSteps(20)).toEqual([20])
    expect(splitSteps(60)).toEqual([20, 20, 20])
    expect(splitSteps(70)).toEqual([24, 23, 23])
  })
})
