import { useEffect } from 'react'

/** El "modo" del sistema: decide el tono del acento según dónde estás y qué toca ahora. */
export type Mode = 'dev' | 'music' | 'faith' | 'body' | 'calm'

const KIND_MODE: Record<string, Mode> = {
  work: 'dev', code: 'dev', meeting: 'dev', study: 'dev',
  rehearsal: 'music', church: 'faith', exercise: 'body', rest: 'calm',
}

/** Modo según el tipo de bloque o evento en curso. */
export const modeForKind = (kind?: string | null): Mode | null => (kind ? KIND_MODE[kind] ?? null : null)

/** Modo según la sección donde estás: el acento te acompaña a lo que estás tocando. */
export function modeForRoute(pathname: string): Mode | null {
  const seg = pathname.replace(/^.*\/app\/?/, '').split('/')[0]
  switch (seg) {
    case 'musica': case 'lugares': return 'music'
    case 'pulpito': return 'faith'
    case 'ejercicio': return 'body'
    case 'mente': return 'calm'
    case 'trabajo': case 'compras': case 'dinero': case 'planear': case 'envios': return 'dev'
    default: return null // Hoy, Más, Ajustes…: manda lo que toca ahora
  }
}

/** Sin nada en curso: de noche calma; el resto del día, trabajo. */
export const modeForHour = (h: number): Mode => (h >= 21 || h < 5 ? 'calm' : 'dev')

export function resolveMode(opts: { pathname: string; currentKind?: string | null; hour: number }): Mode {
  return modeForRoute(opts.pathname) ?? modeForKind(opts.currentKind) ?? modeForHour(opts.hour)
}

export function useMode(mode: Mode) {
  useEffect(() => { document.documentElement.dataset.mode = mode }, [mode])
}
