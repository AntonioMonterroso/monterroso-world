import { describe, expect, it } from 'vitest'
import { looksSame, similarPairs } from './catSimilar'

describe('looksSame', () => {
  it('detecta plurales, tildes y agregados', () => {
    expect(looksSame('Comida', 'comidas')).toBe(true)
    expect(looksSame('Super', 'Súper')).toBe(true)
    expect(looksSame('Gasolina', 'Gasolina carro')).toBe(true)
    expect(looksSame('Transporte', 'Transprte')).toBe(true)
  })
  it('no junta cosas distintas', () => {
    expect(looksSame('Casa', 'Cosa')).toBe(false)
    expect(looksSame('Salud', 'Ocio')).toBe(false)
  })
})

describe('similarPairs', () => {
  it('pone primero la más usada', () => {
    expect(similarPairs(['Comidas', 'Ocio', 'Comida'], (n) => (n === 'Comida' ? 10 : 1))).toEqual([['Comida', 'Comidas']])
  })
})
