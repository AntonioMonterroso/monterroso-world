import { describe, expect, it } from 'vitest'
import { advanceReview, dueReviews, finishedThisWeek, fmtTs, hostOf, parseStart, parseTs, parseVideoUrl, startReviews, thumbUrl, type Video } from './learn'

describe('enlaces de video', () => {
  it('YouTube en todas sus formas', () => {
    const id = 'dQw4w9WgXcQ'
    for (const u of [`https://www.youtube.com/watch?v=${id}`, `https://youtu.be/${id}`, `https://youtube.com/shorts/${id}`, `https://www.youtube.com/embed/${id}`, `https://m.youtube.com/watch?v=${id}&list=PL1`, `https://www.youtube-nocookie.com/embed/${id}`, `https://www.youtube.com/live/${id}`]) {
      expect(parseVideoUrl(u)?.id, u).toBe(id)
    }
  })
  it('lee el tiempo de inicio', () => {
    expect(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ?t=90')?.start).toBe(90)
    expect(parseStart('1m30s')).toBe(90)
    expect(parseStart('1h2m3s')).toBe(3723)
    expect(parseStart('xyz')).toBe(0)
  })
  it('Vimeo', () => {
    expect(parseVideoUrl('https://vimeo.com/76979871')).toMatchObject({ provider: 'vimeo', id: '76979871' })
    expect(parseVideoUrl('https://player.vimeo.com/video/76979871')?.id).toBe('76979871')
  })
  it('rechaza sitios ajenos y basura', () => {
    expect(parseVideoUrl('https://evil.example.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(parseVideoUrl('https://www.youtube.com.evil.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(parseVideoUrl('javascript:alert(1)')).toBeNull()
    expect(parseVideoUrl('https://www.youtube.com/watch?v=corto')).toBeNull()
    expect(parseVideoUrl('hola')).toBeNull()
  })
  it('miniatura solo para YouTube', () => {
    expect(thumbUrl({ provider: 'youtube', video_id: 'abc12345678' })).toContain('abc12345678')
    expect(thumbUrl({ provider: 'vimeo', video_id: '123456' })).toBeNull()
  })
})

describe('marcas de tiempo', () => {
  it('formatea y lee', () => {
    expect(fmtTs(83)).toBe('1:23')
    expect(fmtTs(3723)).toBe('1:02:03')
    expect(parseTs('1:23')).toBe(83)
    expect(parseTs('1:02:03')).toBe(3723)
    expect(parseTs('83')).toBe(83)
    expect(parseTs('1:75')).toBeNull()
    expect(parseTs('abc')).toBeNull()
    expect(parseTs('')).toBeNull()
  })
})

describe('repaso espaciado', () => {
  it('primer repaso al día siguiente', () => {
    expect(startReviews('2026-10-01')).toEqual({ review_step: 0, next_review: '2026-10-02' })
  })
  it('avanza por 1, 3, 7, 21 y 60 días y termina', () => {
    expect(advanceReview(0, '2026-10-02')).toEqual({ review_step: 1, next_review: '2026-10-05' })
    expect(advanceReview(2, '2026-10-12')).toEqual({ review_step: 3, next_review: '2026-11-02' })
    expect(advanceReview(4, '2027-01-01')).toEqual({ review_step: 5, next_review: null })
  })
  it('lista los repasos que tocan hoy o están atrasados', () => {
    const v = (id: string, next: string | null): Video => ({ id, provider: 'youtube', video_id: 'x', title: id, topic: null, status: 'done', start_sec: 0, finished_on: null, review_step: 0, next_review: next, created_at: '' })
    expect(dueReviews([v('a', '2026-10-01'), v('b', '2026-10-05'), v('c', null), v('d', '2026-09-28')], '2026-10-01').map((x) => x.id)).toEqual(['d', 'a'])
  })
  it('videos terminados esta semana', () => {
    expect(finishedThisWeek([{ finished_on: '2026-09-28' }, { finished_on: '2026-10-01' }, { finished_on: '2026-09-27' }, { finished_on: null }], '2026-10-01')).toBe(2)
  })
})

describe('links', () => {
  it('muestra solo el dominio', () => { expect(hostOf('https://www.ejemplo.com/ruta?x=1')).toBe('ejemplo.com') })
})
