// Abrir la app con huella o Face ID en lugar del PIN. Usa WebAuthn con verificación del usuario: el teléfono
// pide la huella y solo responde si es la tuya. Igual que el PIN, protege la pantalla de este dispositivo.
import { b64, unb64 } from './vault'
import { bioSupported } from './bio'

const KEY = 'mw_biolock'
const DECLINED = 'mw_biolock_no'

export { bioSupported as bioLockSupported }
export const bioLockEnrolled = () => { try { return localStorage.getItem(KEY) !== null } catch { return false } }
export const bioLockDeclined = () => { try { return localStorage.getItem(DECLINED) === '1' } catch { return false } }
export const declineBioLock = () => { try { localStorage.setItem(DECLINED, '1') } catch { /* sin almacenamiento */ } }
export const removeBioLock = () => { try { localStorage.removeItem(KEY) } catch { /* sin almacenamiento */ } }

/** Registra la huella de este dispositivo. Lanza si se cancela o no se puede. */
export async function enrollBioLock(userName: string): Promise<void> {
  const created = (await navigator.credentials.create({
    publicKey: {
      rp: { name: 'Monterroso World', id: location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: userName, displayName: 'Monterroso' },
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null
  if (!created) throw new Error('cancelado')
  localStorage.setItem(KEY, b64(new Uint8Array(created.rawId)))
  try { localStorage.removeItem(DECLINED) } catch { /* sin almacenamiento */ }
}

/** Pide la huella. Devuelve true solo si el teléfono verificó al usuario. */
export async function verifyBioLock(): Promise<boolean> {
  let id: string | null = null
  try { id = localStorage.getItem(KEY) } catch { /* sin almacenamiento */ }
  if (!id) return false
  try {
    const got = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)), rpId: location.hostname, userVerification: 'required', timeout: 60_000,
        allowCredentials: [{ type: 'public-key', id: unb64(id) as BufferSource }],
      },
    })
    return Boolean(got)
  } catch { return false }
}
