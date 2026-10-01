// PIN de la app: solo se guarda un hash local (PBKDF2). Protege la pantalla, no cifra la bóveda.
const KEY = 'mw_pin'
const TRIES = 'mw_pin_tries'
const ITER = 150_000

type Stored = { salt: string; hash: string; length: 4 | 6 }

const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

async function derive(pin: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations: ITER, hash: 'SHA-256' }, base, 256)
}

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Stored) : null
  } catch {
    return null
  }
}

export const hasPin = () => read() !== null
export const pinLength = (): 4 | 6 => read()?.length ?? 4

export async function setPin(pin: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(pin, salt)
  const stored: Stored = { salt: b64(salt), hash: b64(hash), length: pin.length === 6 ? 6 : 4 }
  localStorage.setItem(KEY, JSON.stringify(stored))
  localStorage.removeItem(TRIES)
}

export function clearPin() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(TRIES)
}

type Tries = { fails: number; until: number }
const readTries = (): Tries => {
  try {
    return JSON.parse(localStorage.getItem(TRIES) ?? '') as Tries
  } catch {
    return { fails: 0, until: 0 }
  }
}

/** Segundos de espera restantes por intentos fallidos (0 si puede intentar). */
export const lockedFor = () => Math.max(0, Math.ceil((readTries().until - Date.now()) / 1000))

export async function checkPin(pin: string): Promise<boolean> {
  if (lockedFor() > 0) return false
  const s = read()
  if (!s) return false
  const hash = b64(await derive(pin, unb64(s.salt)))
  if (hash === s.hash) {
    localStorage.removeItem(TRIES)
    return true
  }
  const t = readTries()
  const fails = t.fails + 1
  // Desde el 5.º fallo la espera crece: 30 s, 60 s, 2 min… hasta 15 min
  const wait = fails >= 5 ? Math.min(30 * 2 ** (fails - 5), 900) * 1000 : 0
  localStorage.setItem(TRIES, JSON.stringify({ fails, until: Date.now() + wait }))
  return false
}
