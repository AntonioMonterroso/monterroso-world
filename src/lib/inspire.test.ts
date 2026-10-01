import { describe, expect, it } from 'vitest'
import { expenseCategoryFor, inspirationEmbed, mapsSearchUrl, normalizeTags, pendingTotals, sortShopping } from './inspire'

describe('incrustar enlaces', () => {
  it('Spotify, SoundCloud, YouTube, Vimeo y Canva', () => {
    expect(inspirationEmbed('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc')?.src).toBe('https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC')
    expect(inspirationEmbed('https://open.spotify.com/intl-es/playlist/37i9dQZF1DXcBWIGoYBM5M')?.height).toBe(352)
    expect(inspirationEmbed('https://soundcloud.com/artista/cancion')?.src).toContain('w.soundcloud.com/player/')
    expect(inspirationEmbed('https://youtu.be/dQw4w9WgXcQ')?.src).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(inspirationEmbed('https://vimeo.com/76979871')?.src).toBe('https://player.vimeo.com/video/76979871')
    expect(inspirationEmbed('https://www.canva.com/design/DAFabc/xyz/edit')?.src).toContain('/view?embed')
  })
  it('rechaza sitios no permitidos y esquemas peligrosos', () => {
    expect(inspirationEmbed('https://evil.example.com/embed')).toBeNull()
    expect(inspirationEmbed('http://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC')).toBeNull()
    expect(inspirationEmbed('javascript:alert(1)')).toBeNull()
    expect(inspirationEmbed('https://open.spotify.com.evil.com/track/4uLU6hMCjMI75M1A2tKUQC')).toBeNull()
    expect(inspirationEmbed('https://soundcloud.com/solo-usuario')).toBeNull()
  })
})

describe('etiquetas', () => {
  it('limpia, pasa a minúsculas y no repite', () => {
    expect(normalizeTags('#Diseño, logos  referencia, DISEÑO')).toEqual(['diseño', 'logos', 'referencia'])
    expect(normalizeTags('')).toEqual([])
  })
  it('máximo 12', () => {
    expect(normalizeTags(Array.from({ length: 20 }, (_, i) => `t${i}`).join(' '))).toHaveLength(12)
  })
})

describe('compras y lugares', () => {
  it('suma lo pendiente por moneda e ignora lo comprado o sin precio', () => {
    expect(pendingTotals([{ status: 'pending', price: 100.1, currency: 'USD' }, { status: 'pending', price: 0.2, currency: 'USD' }, { status: 'bought', price: 500, currency: 'USD' }, { status: 'pending', price: null, currency: 'USD' }, { status: 'pending', price: 900, currency: 'MXN' }])).toEqual({ USD: 100.3, MXN: 900 })
  })
  it('ordena por prioridad y luego por nombre', () => {
    expect(sortShopping([{ priority: 3, name: 'A' }, { priority: 1, name: 'Z' }, { priority: 1, name: 'B' }]).map((i) => i.name)).toEqual(['B', 'Z', 'A'])
  })
  it('categoría de gasto', () => {
    expect(expenseCategoryFor('Instrumento')).toBe('Instrumentos')
    expect(expenseCategoryFor('Libros')).toBe('Educación')
    expect(expenseCategoryFor('Ropa')).toBe('Otros')
  })
  it('enlace de mapas', () => {
    expect(mapsSearchUrl('Av. Principal 123')).toContain('query=Av.%20Principal%20123')
    expect(mapsSearchUrl('https://maps.app.goo.gl/abc')).toBe('https://maps.app.goo.gl/abc')
  })
})
