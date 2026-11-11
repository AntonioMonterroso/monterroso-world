import { useCallback, useEffect, useState } from 'react'
import { getSettings, patchSettings } from './settings'

/** Foto del recibo de cada movimiento: la imagen va al almacenamiento privado y aquí solo queda qué foto es de qué movimiento. */
export type TxPhotos = Record<string, string>
export const cleanPhotos = (raw: unknown): TxPhotos => {
  if (!raw || typeof raw !== 'object') return {}
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).filter(([k, v]) => typeof k === 'string' && typeof v === 'string' && v.length < 300)) as TxPhotos
}

export function useTxPhotos() {
  const [all, setAll] = useState<TxPhotos>({})
  useEffect(() => { void getSettings().then((s) => setAll(cleanPhotos((s as { txPhotos?: unknown }).txPhotos))) }, [])
  const set = useCallback((txId: string, path: string | null) => {
    setAll((cur) => { const next = { ...cur }; if (path) next[txId] = path; else delete next[txId]; void patchSettings({ txPhotos: next } as never); return next })
  }, [])
  return { all, set }
}
