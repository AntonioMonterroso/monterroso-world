import { describe, expect, it } from 'vitest'
import { norm, searchHits } from './searchIndex'

const items = [
  { title: 'Cuán grande es Él', sub: 'Himno' },
  { title: 'Sitio Panadería Luna', sub: 'Panadería Luna' },
  { title: 'Practicar guitarra', sub: undefined },
  { title: 'Luna de octubre', sub: 'Canción' },
  { title: 'Renovar dominio', sub: 'cliente Luna' },
]

describe('búsqueda', () => {
  it('ignora mayúsculas y acentos', () => {
    expect(norm('Cuán GRANDE')).toBe('cuan grande')
    expect(searchHits(items, 'CUAN grande').map((i) => i.title)).toEqual(['Cuán grande es Él'])
    expect(searchHits(items, 'panaderia').length).toBe(1)
  })
  it('todas las palabras deben aparecer', () => {
    expect(searchHits(items, 'luna octubre').map((i) => i.title)).toEqual(['Luna de octubre'])
    expect(searchHits(items, 'luna zzz')).toEqual([])
  })
  it('lo que empieza con la palabra va primero y el detalle pesa menos', () => {
    const r = searchHits(items, 'luna').map((i) => i.title)
    expect(r[0]).toBe('Luna de octubre')
    expect(r).toContain('Renovar dominio') // coincide solo por el detalle
    expect(r.indexOf('Renovar dominio')).toBeGreaterThan(r.indexOf('Sitio Panadería Luna'))
  })
  it('respeta el límite y la consulta vacía no devuelve nada', () => {
    expect(searchHits(items, 'a', 2).length).toBe(2)
    expect(searchHits(items, '   ')).toEqual([])
  })
})
