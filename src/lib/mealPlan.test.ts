import { describe, expect, it } from 'vitest'
import { cleanPlan, shoppingFor, weekDays } from './mealPlan'
import type { PantryItem, Recipe } from './kitchen'

const r = (id: string, title: string, ks: string[]): Recipe => ({ id, title, meal: 'almuerzo', minutes: null, servings: null, ingredients: ks.map((k) => ({ n: k, k })), steps: [], tips: null, favorite: false, cooked_count: 0, last_cooked: null })

describe('mealPlan', () => {
  it('semana de lunes a domingo', () => {
    expect(weekDays('2026-11-11')).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'])
    expect(weekDays('2026-11-15', 1)[0]).toBe('2026-11-16')
  })
  it('limpia días viejos y recetas borradas', () => {
    expect(cleanPlan({ '2026-10-01': ['a'], '2026-11-10': ['a', 'zz', 3], bad: ['a'] }, '2026-11-11', new Set(['a']))).toEqual({ '2026-11-10': ['a'] })
  })
  it('arma la lista sin lo que hay ni lo pendiente', () => {
    const recipes = [r('a', 'Pollo guisado', ['Pollo', 'Tomate', 'Cebolla']), r('b', 'Huevos rancheros', ['Huevo', 'Tomate'])]
    const pantry: PantryItem[] = [{ id: '1', name: 'Cebolla', category: 'x', have: true, notes: null }]
    const out = shoppingFor({ '2026-11-10': ['a'], '2026-11-11': ['b'] }, weekDays('2026-11-11'), recipes, pantry, [{ name: 'huevo' }])
    expect(out).toEqual([{ name: 'Pollo', for: ['Pollo guisado'] }, { name: 'Tomate', for: ['Pollo guisado', 'Huevos rancheros'] }])
  })
})
