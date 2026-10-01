import { describe, expect, it } from 'vitest'
import { normalizeEmbed, parseCommand, sanitizePayload } from './pulpit'

describe('enlaces incrustables', () => {
  it('Canva: agrega vista y modo embed', () => {
    expect(normalizeEmbed('https://www.canva.com/design/DAFabc123/xyz789/edit')).toBe('https://www.canva.com/design/DAFabc123/xyz789/view?embed')
    expect(normalizeEmbed('https://www.canva.com/design/DAFabc123/xyz789/view?utm_source=link')).toBe('https://www.canva.com/design/DAFabc123/xyz789/view?embed')
  })
  it('YouTube pasa a youtube-nocookie', () => {
    expect(normalizeEmbed('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(normalizeEmbed('https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })
  it('rechaza sitios no permitidos y http', () => {
    expect(normalizeEmbed('https://evil.example.com/design/x')).toBeNull()
    expect(normalizeEmbed('http://www.canva.com/design/a/b/view')).toBeNull()
    expect(normalizeEmbed('javascript:alert(1)')).toBeNull()
    expect(normalizeEmbed('https://www.canva.com.evil.com/design/a/b/view')).toBeNull()
  })
})

describe('contenido de la pantalla pública', () => {
  const brand = { name: 'Mi Iglesia', logo: null }
  it('acepta un versículo y recorta lo excesivo', () => {
    const p = sanitizePayload({ slide: { kind: 'verse', body: 'x'.repeat(9000), reference: 'Juan 3:16' }, index: 1, total: 4, brand })
    expect(p?.slide?.body?.length).toBe(4000)
    expect(p?.slide?.reference).toBe('Juan 3:16')
  })
  it('descarta embeds de sitios no permitidos', () => {
    expect(sanitizePayload({ slide: { kind: 'embed', url: 'https://evil.example.com/x' }, index: 0, total: 1, brand })?.slide).toBeNull()
  })
  it('descarta imágenes sin https y tipos desconocidos', () => {
    expect(sanitizePayload({ slide: { kind: 'image', url: 'http://x.com/a.png' }, index: 0, total: 1, brand })?.slide).toBeNull()
    expect(sanitizePayload({ slide: { kind: 'script', body: 'x' }, index: 0, total: 1, brand })).toBeNull()
  })
  it('un versículo o frase sin texto muestra la pantalla de inicio', () => {
    expect(sanitizePayload({ slide: { kind: 'verse', body: '  ' }, index: 0, total: 1, brand })?.slide).toBeNull()
  })
  it('ignora logos que no son https', () => {
    expect(sanitizePayload({ slide: null, index: 0, total: 0, brand: { name: 'A', logo: 'javascript:alert(1)' } })?.brand.logo).toBeNull()
  })
  it('basura no rompe nada', () => {
    expect(sanitizePayload(null)).toBeNull()
    expect(sanitizePayload('hola')).toBeNull()
  })
})

describe('voz', () => {
  it('reconoce siguiente y anterior', () => {
    expect(parseCommand('muy bien siguiente')).toBe('next')
    expect(parseCommand('Atrás')).toBe('prev')
    expect(parseCommand('pasemos al próximo')).toBe('next')
    expect(parseCommand('nada que ver')).toBeNull()
  })
})
