// Enlaces para compañeros. El token viaja en el enlace; en la base solo se guarda su hash.
const b64url = (b: Uint8Array) => btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const b64 = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)))
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

/** 192 bits aleatorios, seguros para usar en una URL. */
export const newToken = () => b64url(crypto.getRandomValues(new Uint8Array(24)))

export async function tokenHash(token: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('')
}

export const PIN_ITERATIONS = 150_000

async function derive(pin: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations: PIN_ITERATIONS, hash: 'SHA-256' }, base, 256)
}

export async function hashPin(pin: string): Promise<{ salt: string; hash: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return { salt: b64(salt), hash: b64(await derive(pin, salt)) }
}
export async function verifyPin(pin: string, salt: string, hash: string): Promise<boolean> {
  return b64(await derive(pin, unb64(salt))) === hash
}

export const shareUrl = (token: string) => `${location.origin}${import.meta.env.BASE_URL}share/${token}`
export const isValidToken = (t: string) => /^[A-Za-z0-9_-]{32}$/.test(t)
