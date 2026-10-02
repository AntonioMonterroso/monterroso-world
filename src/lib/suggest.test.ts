import { describe, expect, it } from 'vitest'
import { modeForHour, modeForKind, modeForRoute, resolveMode } from './context'
import { suggest, type SuggestInput } from './suggest'

const base: SuggestInput = { nowMin: 10 * 60, current: null, next: null, priorities: { open: 3, total: 3 }, overdue: [], followUps: [], toSend: [], habitsPending: [], routine: null, inbox: 0 }
const ids = (i: Partial<SuggestInput>, n = 3) => suggest({ ...base, ...i }, n).map((s) => s.id)

describe('suggest', () => {
  it('lo vencido va primero', () => {
    const r = suggest({ ...base, overdue: [{ id: 'e1', title: 'Enviar factura', minsLate: 30 }], followUps: [{ id: 'd1', title: 'Cotización' }] })
    expect(r[0].id).toBe('ov-e1')
    expect(r[0].tone).toBe('urgent')
  })
  it('avisa del siguiente bloque solo cuando está cerca y no hay uno en curso', () => {
    expect(ids({ next: { title: 'Ensayo', startMin: 10 * 60 + 10 } })).toContain('next-block')
    expect(ids({ next: { title: 'Ensayo', startMin: 12 * 60 } })).not.toContain('next-block')
    expect(ids({ current: { title: 'Trabajo', endMin: 17 * 60 }, next: { title: 'Ensayo', startMin: 10 * 60 + 5 } })).not.toContain('next-block')
  })
  it('por la mañana pide elegir las prioridades; luego, avanzarlas', () => {
    expect(ids({ priorities: { open: 0, total: 1 } })).toContain('pick-priorities')
    expect(ids({ nowMin: 15 * 60, priorities: { open: 2, total: 2 } })).toContain('do-priorities')
    expect(ids({ nowMin: 15 * 60, priorities: { open: 2, total: 2 } })).not.toContain('pick-priorities')
  })
  it('una rutina a medias o sin empezar aparece', () => {
    expect(suggest({ ...base, routine: { id: 'r', name: 'Mi mañana', started: false } })[0].title).toBe('Mi mañana')
    expect(suggest({ ...base, routine: { id: 'r', name: 'Mi mañana', started: true } }).some((s) => s.title.startsWith('Termina'))).toBe(true)
  })
  it('los hábitos pesan más de noche', () => {
    const day = suggest({ ...base, habitsPending: [{ id: 'h', name: 'Estirar' }] }).find((s) => s.id === 'habit')!
    const night = suggest({ ...base, nowMin: 20 * 60, habitsPending: [{ id: 'h', name: 'Estirar' }] }).find((s) => s.id === 'habit')!
    expect(night.score).toBeGreaterThan(day.score)
  })
  it('respeta el límite y, sin nada, dice que todo está al día', () => {
    expect(suggest({ ...base, priorities: { open: 0, total: 3 } })[0].id).toBe('free')
    const many = suggest({ ...base, overdue: [{ id: 'a', title: 'a', minsLate: 5 }, { id: 'b', title: 'b', minsLate: 5 }], followUps: [{ id: 'c', title: 'c' }], inbox: 4 }, 2)
    expect(many).toHaveLength(2)
  })
})

describe('suggest con lista de salida', () => {
  it('avisa cuando falta poco para salir', () => {
    expect(suggest({ ...base, exitList: { id: 'l1', name: 'Ensayo', mins: 30 } }).map((x) => x.id)).toContain('exit-l1')
    const r = suggest({ ...base, exitList: { id: 'l1', name: 'Ensayo', mins: 30 } }).find((x) => x.id === 'exit-l1')!
    expect(r.to).toContain('lista=l1')
  })
  it('no molesta si falta mucho', () => {
    expect(suggest({ ...base, exitList: { id: 'l1', name: 'Ensayo', mins: 120 } }).map((x) => x.id)).not.toContain('exit-l1')
  })
})

describe('context', () => {
  it('la sección manda sobre el bloque en curso', () => {
    expect(resolveMode({ pathname: '/monterroso-world/app/musica', currentKind: 'work', hour: 10 })).toBe('music')
    expect(resolveMode({ pathname: '/monterroso-world/app', currentKind: 'church', hour: 10 })).toBe('faith')
    expect(resolveMode({ pathname: '/monterroso-world/app', currentKind: null, hour: 23 })).toBe('calm')
    expect(resolveMode({ pathname: '/monterroso-world/app/ajustes', currentKind: null, hour: 11 })).toBe('dev')
  })
  it('mapea tipos y horas', () => {
    expect(modeForKind('rehearsal')).toBe('music')
    expect(modeForKind('otra-cosa')).toBeNull()
    expect(modeForRoute('/monterroso-world/app/ejercicio/historial')).toBe('body')
    expect(modeForHour(4)).toBe('calm')
    expect(modeForHour(9)).toBe('dev')
  })
})
