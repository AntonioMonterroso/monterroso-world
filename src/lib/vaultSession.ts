import { useSyncExternalStore } from 'react'
import type { DataKey } from './vault'

// La llave de datos vive solo en memoria: al recargar o bloquear, desaparece.
let key: DataKey | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

let idle: ReturnType<typeof setTimeout> | undefined
let hiddenAt = 0
let attached = false

export const IDLE_KEY = 'mw_vault_idle'
export const idleMinutes = (): number => { try { const n = Number(localStorage.getItem(IDLE_KEY)); return n >= 1 && n <= 60 ? n : 3 } catch { return 3 } }

function reset() {
  clearTimeout(idle)
  if (key) idle = setTimeout(lockVault, idleMinutes() * 60_000)
}
function onVisibility() {
  if (document.hidden) hiddenAt = Date.now()
  else if (key && hiddenAt && Date.now() - hiddenAt > 60_000) lockVault()
}

function attach() {
  if (attached) return
  attached = true
  ;(['pointerdown', 'keydown', 'scroll'] as const).forEach((e) => window.addEventListener(e, reset, { passive: true }))
  document.addEventListener('visibilitychange', onVisibility)
}

export function unlockVault(k: DataKey) {
  key = k
  attach()
  reset()
  emit()
}

export function lockVault() {
  clearTimeout(idle)
  key = null
  emit()
}

export const getVaultKey = () => key

export function useVaultKey(): DataKey | null {
  return useSyncExternalStore((cb) => { listeners.add(cb); return () => listeners.delete(cb) }, () => key)
}

/** Copia al portapapeles y lo vacía a los 30 s (si el navegador lo permite). */
let clearTimer: ReturnType<typeof setTimeout> | undefined
export async function copySecret(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value)
    clearTimeout(clearTimer)
    clearTimer = setTimeout(() => { navigator.clipboard.writeText('').catch(() => {}) }, 30_000)
    return true
  } catch { return false }
}
