import { describe, expect, it } from 'vitest'
import { RUBROS, bodyForRubro, rubroFor } from './rubros'
import { bodyFor } from './quotes'

describe('rubros', () => {
  it('reconoce el rubro por el texto', () => {
    expect(rubroFor('Barbería')?.id).toBe('barberia')
    expect(rubroFor('Pastelería Doña Rosa')?.id).toBe('comida')
    expect(rubroFor('Despacho contable')?.id).toBe('oficina')
    expect(rubroFor('')).toBeNull()
  })
  it('agrega la sección del rubro al inicio', () => {
    const b = bodyForRubro(bodyFor('citas'), RUBROS[0])
    expect(b.intro).toContain('reserven su cita')
    expect(b.sections[0].title).toBe('Lo que tu barbería necesita')
    expect(b.sections.length).toBe(bodyFor('citas').sections.length + 1)
  })
})
