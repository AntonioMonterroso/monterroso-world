import { describe, expect, it } from 'vitest'
import { guessKey, missing, norm, parseIngredients, rankRecipes, toShop } from './kitchen'
import { scaleLine } from './kitchen'
import { SEED_PANTRY, SEED_RECIPES } from './kitchenSeed'

const pantry = [{ name: 'Huevos', have: true }, { name: 'Tomate', have: false }, { name: 'Sal', have: true }]

describe('cocina', () => {
  it('compara sin tildes ni mayúsculas', () => { expect(norm('  Brócoli  Verde ')).toBe('brocoli verde') })
  it('lo que falta ignora opcionales e ingredientes sin control', () => {
    const r = { ingredients: [{ n: '2 huevos', k: 'Huevos' }, { n: 'tomate', k: 'tomate' }, { n: 'Leche', k: 'Leche' }, { n: 'cilantro', k: 'Cilantro', opt: true }, { n: 'agua', k: null }] }
    expect(missing(r, pantry)).toEqual(['tomate', 'Leche'])
  })
  it('ordena primero lo que se puede hacer ya', () => {
    const a = { title: 'B', favorite: false, ingredients: [{ n: 'x', k: 'Leche' }] }
    const b = { title: 'A', favorite: false, ingredients: [{ n: 'x', k: 'Huevos' }] }
    expect(rankRecipes([a, b], pantry).map((x) => x.r.title)).toEqual(['A', 'B'])
  })
  it('reconoce el ingrediente de una línea escrita a mano', () => {
    const p = [{ name: 'Aceite de oliva virgen' }, { name: 'Aceite' }, { name: 'Ajo' }]
    expect(guessKey('2 cdas de aceite de oliva virgen', p)).toBe('Aceite de oliva virgen')
    expect(guessKey('Ajo picado', p)).toBe('Ajo')
    expect(guessKey('Leche', p)).toBeNull()
  })
  it('al editar conserva el ingrediente de las líneas que no cambiaron', () => {
    const out = parseIngredients('Leche\nAjo (opcional)', [{ name: 'Ajo' }], [{ n: 'Leche', k: 'Leche' }])
    expect(out).toEqual([{ n: 'Leche', k: 'Leche' }, { n: 'Ajo', k: 'Ajo', opt: true }])
  })
  it('no repite lo que ya está en Por comprar', () => { expect(toShop(['Leche', 'Limón', 'leche'], [{ name: 'Limón' }])).toEqual(['Leche']) })
  it('recetario inicial: despensa sin repetidos y casi todo con lo que hay', () => {
    const names = SEED_PANTRY.map((p) => norm(p.name))
    expect(new Set(names).size).toBe(names.length)
    expect(SEED_RECIPES.length).toBeGreaterThanOrEqual(40)
    const ready = rankRecipes(SEED_RECIPES.map((r) => ({ ...r, favorite: false })), SEED_PANTRY).filter((x) => x.miss.length === 0)
    expect(ready.length).toBeGreaterThanOrEqual(35)
    // Solo pueden faltar cosas que de verdad no estaban en la lista (leche, limón…)
    const extra = new Set(SEED_RECIPES.flatMap((r) => r.ingredients.filter((i) => i.k && !names.includes(norm(i.k))).map((i) => i.k)))
    expect([...extra].sort()).toEqual(['Chile guaque', 'Leche', 'Lechuga', 'Limón', 'Papa'])
  })
})

describe('porciones', () => {
  it('ajusta la cantidad del inicio de la línea', () => {
    expect(scaleLine('2 tazas de arroz', 1.5)).toBe('3 tazas de arroz')
    expect(scaleLine('1/2 cebolla', 2)).toBe('1 cebolla')
    expect(scaleLine('1 1/2 libras de pollo', 2)).toBe('3 libras de pollo')
    expect(scaleLine('3 huevos', 0.5)).toBe('1 1/2 huevos')
    expect(scaleLine('Sal al gusto', 2)).toBe('Sal al gusto')
    expect(scaleLine('2 tazas', 1)).toBe('2 tazas')
  })
})
