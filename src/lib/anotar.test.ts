import { describe, expect, it } from 'vitest'
import { categoryFor, entender, keyWord, takeDate, takeTime, youtubeId, type Ctx } from './anotar'

const ctx: Ctx = { today: '2026-11-02', clients: [{ id: 'p1', title: 'Barbería Imperio', client: 'Imperio' }, { id: 'p2', title: 'Pastelería Dulce' }], learned: {} }

describe('Anotar entiende frases', () => {
  it('«Q 45 almuerzo» es un gasto de Comida', () => {
    const e = entender('Q 45 almuerzo', ctx)
    expect(e).toMatchObject({ kind: 'gasto', amount: 45, category: 'Comida', area: 'personal', date: '2026-11-02' })
    expect(e.label).toBe('Gasto · Comida · Q 45.00')
  })
  it('«+Q 300 tocada boda» es un ingreso de Música', () => {
    expect(entender('+Q 300 tocada boda', ctx)).toMatchObject({ kind: 'ingreso', amount: 300, category: 'Tocada', area: 'music' })
  })
  it('«cobré barbería» busca al cliente', () => {
    expect(entender('cobré barbería', ctx)).toMatchObject({ kind: 'cobro', clientId: 'p1' })
    expect(entender('cobré a nadie', ctx).kind).toBe('bandeja')
  })
  it('«ensayo vie 7pm» es un evento el próximo viernes a las 19:00', () => {
    expect(entender('ensayo vie 7pm', ctx)).toMatchObject({ kind: 'evento', title: 'Ensayo', date: '2026-11-06', startMin: 19 * 60, eventKind: 'rehearsal' })
  })
  it('«comprar leche» va a Por comprar', () => {
    expect(entender('comprar leche', ctx)).toMatchObject({ kind: 'comprar', title: 'Leche', category: 'Súper y comida' })
  })
  it('«le presté el cable a Luis» es una cosa prestada', () => {
    expect(entender('le presté el cable a Luis', ctx)).toMatchObject({ kind: 'prestado', title: 'Cable', person: 'Luis' })
  })
  it('«prometer a Ana el viernes» es una promesa con fecha', () => {
    expect(entender('prometer a Ana el viernes', ctx)).toMatchObject({ kind: 'promesa', person: 'Ana', date: '2026-11-06' })
  })
  it('«idea: intro en Re» es una idea de música', () => {
    expect(entender('idea: intro en Re', ctx)).toMatchObject({ kind: 'idea', area: 'music' })
  })
  it('lo demás queda en la bandeja', () => {
    expect(entender('llamar a don Mario por lo del sonido', ctx).kind).toBe('bandeja')
    expect(entender('', ctx).kind).toBe('bandeja')
  })
})

describe('palabras aprendidas', () => {
  it('lo aprendido gana a lo de fábrica', () => {
    expect(categoryFor('pollo', {})).toBe('Comida')
    expect(categoryFor('pollo', { pollo: { category: 'Ocio' } })).toBe('Ocio')
    expect(entender('Q 30 pollo', { ...ctx, learned: { pollo: { category: 'Ocio' } } }).category).toBe('Ocio')
  })
  it('la palabra clave es la primera útil', () => {
    expect(keyWord('Q 30 pollo frito')).toBe('pollo')
    expect(keyWord('de la tienda')).toBe('tienda')
  })
})

describe('fechas y horas', () => {
  it('hoy, mañana, ayer y días', () => {
    expect(takeDate('café mañana', '2026-11-02').date).toBe('2026-11-03')
    expect(takeDate('café ayer', '2026-11-02').date).toBe('2026-11-01')
    expect(takeDate('misa domingo', '2026-11-02').date).toBe('2026-11-08')
    expect(takeDate('nada', '2026-11-02').date).toBeNull()
  })
  it('horas con am, pm o dos puntos', () => {
    expect(takeTime('ensayo 7pm').min).toBe(19 * 60)
    expect(takeTime('reunión 9:30 am').min).toBe(9 * 60 + 30)
    expect(takeTime('culto 19:00').min).toBe(19 * 60)
    expect(takeTime('12 am').min).toBe(0)
    expect(takeTime('compré 3 cosas').min).toBeNull()
  })
})

describe('enlaces', () => {
  it('YouTube va a Videos y lo demás a Links', () => {
    expect(entender('https://youtu.be/dQw4w9WgXcQ', ctx)).toMatchObject({ kind: 'video', videoId: 'dQw4w9WgXcQ' })
    expect(entender('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3', ctx).kind).toBe('video')
    expect(entender('https://www.ejemplo.com/pagina', ctx)).toMatchObject({ kind: 'enlace', title: 'ejemplo.com' })
    expect(youtubeId('https://ejemplo.com')).toBeNull()
  })
})

describe('pagos de clientes', () => {
  it('«Imperio pagó 1500» registra un pago con monto', () => {
    expect(entender('Imperio pagó 1500', ctx)).toMatchObject({ kind: 'cobro', clientId: 'p1', amount: 1500, date: '2026-11-02' })
    expect(entender('me pagó barbería Q 250.50 ayer', ctx)).toMatchObject({ kind: 'cobro', clientId: 'p1', amount: 250.5, date: '2026-11-01' })
    expect(entender('recibí 500 de pastelería dulce', ctx)).toMatchObject({ kind: 'cobro', clientId: 'p2', amount: 500 })
    expect(entender('cobré Q 300 a barbería', ctx)).toMatchObject({ kind: 'cobro', clientId: 'p1', amount: 300 })
  })
  it('sin cliente conocido no inventa nada', () => {
    expect(entender('Pedro pagó 400', ctx).kind).toBe('bandeja')
    expect(entender('cobré barbería', ctx)).toMatchObject({ kind: 'cobro', clientId: 'p1' })
    expect(entender('cobré barbería', ctx).amount).toBeUndefined()
  })
})
