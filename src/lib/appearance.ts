import { getSettings, patchSettings } from './settings'

/** Apariencia: claro, oscuro o seguir al teléfono, y una paleta que cambia el tono de la marca y de los fondos.
 *  Los colores de las tres áreas (azul, rosa y verde) nunca cambian. Se guarda en tu usuario y en este dispositivo (para no parpadear al abrir). */
export type Mode = 'claro' | 'oscuro' | 'auto'
export type Appearance = { mode: Mode; palette: string; h: number; s: number; daily: boolean; day?: string }

export const PALETTES: { name: string; h: number; s: number }[] = [
  { name: 'Grafito', h: 0, s: 0 }, { name: 'Océano', h: 205, s: 90 }, { name: 'Bosque', h: 150, s: 70 }, { name: 'Uva', h: 270, s: 80 },
  { name: 'Ámbar', h: 38, s: 100 }, { name: 'Rosa', h: 335, s: 90 }, { name: 'Coral', h: 12, s: 100 },
]
const NAMES = ['Mango', 'Lago', 'Selva', 'Jacaranda', 'Volcán', 'Brisa', 'Cacao', 'Cielo', 'Pitaya', 'Menta']
export const DEFAULT: Appearance = { mode: 'oscuro', palette: 'Grafito', h: 0, s: 0, daily: false }
const KEY = 'mw_appearance'

export function clean(raw: unknown): Appearance {
  const x = (raw ?? {}) as Partial<Appearance>
  const num = (v: unknown, a: number, b: number, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d)
  return {
    mode: x.mode === 'claro' || x.mode === 'oscuro' || x.mode === 'auto' ? x.mode : DEFAULT.mode,
    palette: typeof x.palette === 'string' ? x.palette.slice(0, 40) : DEFAULT.palette,
    h: num(x.h, 0, 360, 0), s: num(x.s, 0, 100, 0), daily: x.daily === true, day: typeof x.day === 'string' ? x.day : undefined,
  }
}

/** Una paleta al azar que cambia solo una vez al día (misma cuenta cada vez que abres ese día). */
export function surprise(seed: number): Pick<Appearance, 'palette' | 'h' | 's' | 'mode'> {
  const r = (n: number) => { const x = Math.sin(seed * 9301 + n * 49297) * 233280; return x - Math.floor(x) }
  return { palette: `${NAMES[Math.floor(r(1) * NAMES.length)]} (sorpresa)`, h: Math.floor(r(2) * 360), s: 60 + Math.floor(r(3) * 40), mode: r(4) < 0.5 ? 'claro' : 'oscuro' }
}
const dayNum = (iso: string) => Math.floor(new Date(iso + 'T12:00:00').getTime() / 86_400_000)

export const isLight = (a: Appearance) => a.mode === 'claro' || (a.mode === 'auto' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches)

export function apply(a: Appearance) {
  const el = document.documentElement
  const light = isLight(a)
  el.dataset.theme = light ? 'claro' : 'oscuro'
  el.classList.toggle('pal', a.palette !== 'Grafito')
  el.style.setProperty('--h', String(a.h)); el.style.setProperty('--s', `${a.s}%`)
  el.style.colorScheme = light ? 'light' : 'dark'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(el).getPropertyValue('--fondo').trim() || (light ? '#f5f5f7' : '#0d0d0f'))
}

export function readLocal(): Appearance { try { return clean(JSON.parse(localStorage.getItem(KEY) ?? 'null')) } catch { return DEFAULT } }
export function saveAppearance(a: Appearance) {
  try { localStorage.setItem(KEY, JSON.stringify(a)) } catch { /* sin almacenamiento */ }
  apply(a)
  void patchSettings({ appearance: a } as never)
}
/** Al abrir: aplica lo guardado en este dispositivo y luego lo de tu usuario; con «sorpréndeme cada día» cambia la paleta una vez al día. */
export async function bootAppearance(today: string) {
  apply(readLocal())
  const s = await getSettings().catch(() => ({}))
  let a = (s as { appearance?: unknown }).appearance ? clean((s as { appearance?: unknown }).appearance) : readLocal()
  if (a.daily && a.day !== today) a = { ...a, ...surprise(dayNum(today)), day: today }
  try { localStorage.setItem(KEY, JSON.stringify(a)) } catch { /* sin almacenamiento */ }
  apply(a)
  if (a.daily) void patchSettings({ appearance: a } as never)
  if (typeof matchMedia !== 'undefined') matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => { if (readLocal().mode === 'auto') apply(readLocal()) })
}
