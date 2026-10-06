// Bóveda cifrada de extremo a extremo (todo ocurre en el dispositivo).
//
//  clave maestra ──PBKDF2──▶ KEK ──cifra──▶ DK (llave de datos, 256 bits, aleatoria)
//  código de recuperación ──PBKDF2──▶ KEK₂ ──cifra──▶ la misma DK
//  DK ──AES-256-GCM, IV propio por ítem, id del ítem como dato autenticado──▶ cada ítem
//
// El servidor guarda solo: sal, iteraciones, DK cifrada (dos veces) y los ítems cifrados.

const enc = new TextEncoder()
const dec = new TextDecoder()

export const KDF_ITERATIONS = 600_000
export const REC_ITERATIONS = 100_000

export class VaultError extends Error {
  code: 'wrong_key' | 'bad_data'
  constructor(code: 'wrong_key' | 'bad_data') { super(code); this.code = code }
}

export type VaultMeta = {
  version: number
  kdf_salt: string
  kdf_iterations: number
  wrapped_dk_master: string
  rec_salt: string
  rec_iterations: number
  wrapped_dk_recovery: string
}

export type DataKey = { raw: Uint8Array; key: CryptoKey }
export type Field = { label: string; value: string; secret: boolean }
export type ItemPayload = { title: string; url?: string; fields: Field[]; notes?: string }
export type ItemRow = { ciphertext: string; iv: string }

// ───────── base64 ─────────
export const b64 = (b: ArrayBuffer | Uint8Array) => {
  const u = new Uint8Array(b)
  let s = ''
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000))
  return btoa(s)
}
export const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const rand = (n: number) => crypto.getRandomValues(new Uint8Array(n))

// ───────── primitivas ─────────
async function kek(secret: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(secret.normalize('NFKC')), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

async function seal(key: CryptoKey, plain: Uint8Array, aad: string): Promise<{ iv: string; ct: string }> {
  const iv = rand(12)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource, additionalData: enc.encode(aad) as BufferSource }, key, plain as BufferSource)
  return { iv: b64(iv), ct: b64(ct) }
}

async function open(key: CryptoKey, iv: string, ct: string, aad: string): Promise<Uint8Array> {
  try {
    return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) as BufferSource, additionalData: enc.encode(aad) as BufferSource }, key, unb64(ct) as BufferSource))
  } catch {
    throw new VaultError('wrong_key')
  }
}

const pack = (x: { iv: string; ct: string }) => `${x.iv}.${x.ct}`
const unpack = (s: string) => { const [iv, ct] = s.split('.'); if (!iv || !ct) throw new VaultError('bad_data'); return { iv, ct } }

const toDataKey = async (raw: Uint8Array): Promise<DataKey> => ({ raw, key: await crypto.subtle.importKey('raw', raw as BufferSource, 'AES-GCM', false, ['encrypt', 'decrypt']) })

// ───────── código de recuperación ─────────
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ' // Crockford: sin I, L, O, U

export function newRecoveryCode(): string {
  const bytes = rand(20) // 160 bits
  let bits = '', out = ''
  for (const b of bytes) bits += b.toString(2).padStart(8, '0')
  for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)]
  return out.match(/.{4}/g)!.join('-')
}

export const normalizeRecovery = (c: string) => c.toUpperCase().replace(/O/g, '0').replace(/[IL]/g, '1').replace(/[^0-9A-Z]/g, '')

// ───────── bóveda ─────────
type Opts = { iterations?: number; recIterations?: number }

export async function createVault(master: string, opts: Opts = {}): Promise<{ meta: VaultMeta; recoveryCode: string; dk: DataKey }> {
  const raw = rand(32)
  const kdf_iterations = opts.iterations ?? KDF_ITERATIONS
  const rec_iterations = opts.recIterations ?? REC_ITERATIONS
  const kdf_salt = rand(16), rec_salt = rand(16)
  const recoveryCode = newRecoveryCode()
  const [wm, wr] = await Promise.all([
    seal(await kek(master, kdf_salt, kdf_iterations), raw, 'dk:master'),
    seal(await kek(normalizeRecovery(recoveryCode), rec_salt, rec_iterations), raw, 'dk:recovery'),
  ])
  return {
    meta: { version: 1, kdf_salt: b64(kdf_salt), kdf_iterations, wrapped_dk_master: pack(wm), rec_salt: b64(rec_salt), rec_iterations, wrapped_dk_recovery: pack(wr) },
    recoveryCode,
    dk: await toDataKey(raw),
  }
}

export async function unlockWithMaster(meta: VaultMeta, master: string): Promise<DataKey> {
  const { iv, ct } = unpack(meta.wrapped_dk_master)
  return toDataKey(await open(await kek(master, unb64(meta.kdf_salt), meta.kdf_iterations), iv, ct, 'dk:master'))
}

export async function unlockWithRecovery(meta: VaultMeta, code: string): Promise<DataKey> {
  const { iv, ct } = unpack(meta.wrapped_dk_recovery)
  return toDataKey(await open(await kek(normalizeRecovery(code), unb64(meta.rec_salt), meta.rec_iterations), iv, ct, 'dk:recovery'))
}

/** Nueva clave maestra: solo se vuelve a cifrar la llave de datos; los ítems no cambian. */
export async function rewrapMaster(dk: DataKey, newMaster: string, iterations = KDF_ITERATIONS): Promise<Pick<VaultMeta, 'kdf_salt' | 'kdf_iterations' | 'wrapped_dk_master'>> {
  const salt = rand(16)
  return { kdf_salt: b64(salt), kdf_iterations: iterations, wrapped_dk_master: pack(await seal(await kek(newMaster, salt, iterations), dk.raw, 'dk:master')) }
}

/** Código de recuperación nuevo (el anterior deja de servir). */
export async function rewrapRecovery(dk: DataKey, recIterations = REC_ITERATIONS): Promise<{ recoveryCode: string; fields: Pick<VaultMeta, 'rec_salt' | 'rec_iterations' | 'wrapped_dk_recovery'> }> {
  const code = newRecoveryCode()
  const salt = rand(16)
  return { recoveryCode: code, fields: { rec_salt: b64(salt), rec_iterations: recIterations, wrapped_dk_recovery: pack(await seal(await kek(normalizeRecovery(code), salt, recIterations), dk.raw, 'dk:recovery')) } }
}

// ───────── ítems ─────────
export async function encryptItem(dk: DataKey, id: string, payload: ItemPayload): Promise<ItemRow> {
  const s = await seal(dk.key, enc.encode(JSON.stringify(payload)), `item:${id}`)
  return { ciphertext: s.ct, iv: s.iv }
}

export async function decryptItem(dk: DataKey, id: string, row: ItemRow): Promise<ItemPayload> {
  const plain = await open(dk.key, row.iv, row.ciphertext, `item:${id}`)
  try { return JSON.parse(dec.decode(plain)) as ItemPayload } catch { throw new VaultError('bad_data') }
}

// ───────── utilidades ─────────
/** Estimación sencilla para guiar al elegir la clave maestra. */
export function masterStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length
  const words = pw.trim().split(/\s+/).length
  let score = 0
  if (pw.length >= 10) score++
  if (pw.length >= 14) score++
  if (classes >= 3 || words >= 4) score++
  if (pw.length >= 20 || (words >= 4 && pw.length >= 16)) score++
  const s = Math.min(4, score) as 0 | 1 | 2 | 3 | 4
  return { score: s, label: ['Muy corta', 'Débil', 'Aceptable', 'Buena', 'Excelente'][s] }
}

export const CATEGORIES = [
  { id: 'password', label: 'Contraseñas' },
  { id: 'email', label: 'Correos' },
  { id: 'client', label: 'Clientes' },
  { id: 'api', label: 'Claves y API' },
  { id: 'bank', label: 'Cuentas bancarias' },
  { id: 'note', label: 'Notas' },
] as const
export type Category = (typeof CATEGORIES)[number]['id']

export const TEMPLATES: Record<Category, Field[]> = {
  password: [{ label: 'Usuario', value: '', secret: false }, { label: 'Contraseña', value: '', secret: true }],
  email: [{ label: 'Correo', value: '', secret: false }, { label: 'Contraseña', value: '', secret: true }],
  client: [
    { label: 'Cliente', value: '', secret: false }, { label: 'Correo', value: '', secret: false }, { label: 'Contraseña', value: '', secret: true },
    { label: 'URL de la base de datos', value: '', secret: false }, { label: 'Anon key', value: '', secret: false }, { label: 'Contraseña de la base de datos', value: '', secret: true },
  ],
  api: [{ label: 'Servicio', value: '', secret: false }, { label: 'Clave', value: '', secret: true }],
  bank: [{ label: 'Banco', value: '', secret: false }, { label: 'Número de cuenta', value: '', secret: true }],
  note: [],
}

export { seal as sealBytes, open as openBytes, toDataKey as dataKeyFromRaw }
