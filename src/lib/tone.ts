import { useEffect } from 'react'

export type Tone = 'dawn' | 'day' | 'dusk' | 'night'

export function toneForHour(h: number): Tone {
  if (h >= 5 && h < 8) return 'dawn'
  if (h >= 8 && h < 17) return 'day'
  if (h >= 17 && h < 21) return 'dusk'
  return 'night'
}

/** Ajusta el resplandor de la página según la hora del dispositivo. */
export function useTone() {
  useEffect(() => {
    const set = () => { document.documentElement.dataset.tone = toneForHour(new Date().getHours()) }
    set()
    const t = setInterval(set, 60_000)
    return () => clearInterval(t)
  }, [])
}
