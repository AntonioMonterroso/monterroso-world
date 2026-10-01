// Desbloqueo con huella o Face ID mediante WebAuthn + extensión PRF.
// La llave de datos se guarda cifrada en este dispositivo con un secreto que solo el autenticador puede reproducir.
import { dataKeyFromRaw, openBytes, sealBytes, b64, unb64, type DataKey } from './vault'

const STORE = 'mw_bio'
const enc = new TextEncoder()
const PRF_SALT = enc.encode('monterroso-world/vault/prf/v1')
type Stored = { credId: string; iv: string; ct: string }

const read = (): Stored | null => { try { const r = localStorage.getItem(STORE); return r ? (JSON.parse(r) as Stored) : null } catch { return null } }

export const bioEnrolled = () => read() !== null
export const removeBio = () => { try { localStorage.removeItem(STORE) } catch { /* sin almacenamiento */ } }

export async function bioSupported(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential || !navigator.credentials) return false
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch { return false }
}

type PrfResults = { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } }

async function prfSecret(credId: Uint8Array | null): Promise<{ secret: CryptoKey; credId: Uint8Array } | null> {
  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const cred = (await navigator.credentials.get({
    publicKey: {
      challenge, rpId: location.hostname, userVerification: 'required', timeout: 60_000,
      allowCredentials: credId ? [{ type: 'public-key', id: credId as BufferSource }] : undefined,
      extensions: { prf: { eval: { first: PRF_SALT } } } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null
  const first = (cred?.getClientExtensionResults() as PrfResults | undefined)?.prf?.results?.first
  if (!cred || !first) return null
  const secret = await crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', first), 'AES-GCM', false, ['encrypt', 'decrypt'])
  return { secret, credId: new Uint8Array(cred.rawId) }
}

/** Registra este dispositivo. Lanza si el autenticador no admite PRF. */
export async function enrollBio(dk: DataKey, userName: string): Promise<void> {
  const created = (await navigator.credentials.create({
    publicKey: {
      rp: { name: 'Monterroso World', id: location.hostname },
      user: { id: crypto.getRandomValues(new Uint8Array(16)), name: userName, displayName: 'Monterroso' },
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      timeout: 60_000,
      extensions: { prf: {} } as AuthenticationExtensionsClientInputs,
    },
  })) as PublicKeyCredential | null
  if (!created) throw new Error('cancelado')
  const credId = new Uint8Array(created.rawId)
  const got = await prfSecret(credId)
  if (!got) throw new Error('prf')
  const s = await sealBytes(got.secret, dk.raw, 'dk:bio')
  localStorage.setItem(STORE, JSON.stringify({ credId: b64(credId), iv: s.iv, ct: s.ct } satisfies Stored))
}

export async function unlockBio(): Promise<DataKey> {
  const st = read()
  if (!st) throw new Error('sin registro')
  const got = await prfSecret(unb64(st.credId))
  if (!got) throw new Error('prf')
  return dataKeyFromRaw(await openBytes(got.secret, st.iv, st.ct, 'dk:bio'))
}
