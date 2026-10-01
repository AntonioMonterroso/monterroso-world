import { describe, expect, it } from 'vitest'
import { VaultError, b64, createVault, decryptItem, encryptItem, masterStrength, normalizeRecovery, newRecoveryCode, rewrapMaster, rewrapRecovery, unlockWithMaster, unlockWithRecovery, unb64 } from './vault'

const fast = { iterations: 1000, recIterations: 1000 }
const payload = { title: 'Banco', url: 'https://banco.example', fields: [{ label: 'Contraseña', value: 'sup3r-secreta ñ 🔐', secret: true }], notes: 'nota' }

describe('bóveda: claves', () => {
  it('abre con la clave maestra correcta y rechaza la incorrecta', async () => {
    const { meta } = await createVault('mi clave larga y segura', fast)
    await expect(unlockWithMaster(meta, 'mi clave larga y segura')).resolves.toBeTruthy()
    await expect(unlockWithMaster(meta, 'otra clave')).rejects.toBeInstanceOf(VaultError)
  })

  it('el código de recuperación abre la misma bóveda, aunque se escriba distinto', async () => {
    const { meta, recoveryCode, dk } = await createVault('clave maestra uno', fast)
    const row = await encryptItem(dk, 'id-1', payload)
    const viaRec = await unlockWithRecovery(meta, recoveryCode.toLowerCase().replace(/-/g, ' '))
    expect(await decryptItem(viaRec, 'id-1', row)).toEqual(payload)
    await expect(unlockWithRecovery(meta, 'AAAA-BBBB-CCCC-DDDD-EEEE-FFFF-GGGG-HHHH')).rejects.toBeInstanceOf(VaultError)
  })

  it('el código de recuperación tiene 160 bits y formato legible', () => {
    const c = newRecoveryCode()
    expect(c).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/)
    expect(normalizeRecovery(c)).toHaveLength(32)
    expect(newRecoveryCode()).not.toBe(c)
  })

  it('cambiar la clave maestra no pierde los ítems y la anterior deja de servir', async () => {
    const { meta, dk } = await createVault('clave vieja muy larga', fast)
    const row = await encryptItem(dk, 'x', payload)
    const next = { ...meta, ...(await rewrapMaster(dk, 'clave nueva muy larga', 1000)) }
    expect(await decryptItem(await unlockWithMaster(next, 'clave nueva muy larga'), 'x', row)).toEqual(payload)
    await expect(unlockWithMaster(next, 'clave vieja muy larga')).rejects.toBeInstanceOf(VaultError)
  })

  it('un código de recuperación nuevo invalida el anterior', async () => {
    const { meta, recoveryCode, dk } = await createVault('clave maestra dos', fast)
    const { recoveryCode: nuevo, fields } = await rewrapRecovery(dk, 1000)
    const next = { ...meta, ...fields }
    await expect(unlockWithRecovery(next, nuevo)).resolves.toBeTruthy()
    await expect(unlockWithRecovery(next, recoveryCode)).rejects.toBeInstanceOf(VaultError)
  })
})

describe('bóveda: ítems', () => {
  it('cifra y descifra con acentos y emoji', async () => {
    const { dk } = await createVault('clave de prueba larga', fast)
    expect(await decryptItem(dk, 'a', await encryptItem(dk, 'a', payload))).toEqual(payload)
  })

  it('el texto cifrado no contiene el secreto', async () => {
    const { dk } = await createVault('clave de prueba larga', fast)
    const row = await encryptItem(dk, 'a', payload)
    const plain = new TextDecoder().decode(unb64(row.ciphertext))
    expect(plain).not.toContain('sup3r')
    expect(row.ciphertext).not.toContain('Banco')
  })

  it('cada cifrado usa un IV distinto', async () => {
    const { dk } = await createVault('clave de prueba larga', fast)
    const rows = await Promise.all(Array.from({ length: 20 }, () => encryptItem(dk, 'a', payload)))
    expect(new Set(rows.map((r) => r.iv)).size).toBe(20)
    expect(new Set(rows.map((r) => r.ciphertext)).size).toBe(20)
  })

  it('un ítem no se puede pasar a otro id (dato autenticado)', async () => {
    const { dk } = await createVault('clave de prueba larga', fast)
    const row = await encryptItem(dk, 'item-A', payload)
    await expect(decryptItem(dk, 'item-B', row)).rejects.toBeInstanceOf(VaultError)
  })

  it('detecta datos alterados', async () => {
    const { dk } = await createVault('clave de prueba larga', fast)
    const row = await encryptItem(dk, 'a', payload)
    const bytes = unb64(row.ciphertext)
    bytes[0] ^= 1
    await expect(decryptItem(dk, 'a', { ...row, ciphertext: b64(bytes) })).rejects.toBeInstanceOf(VaultError)
  })

  it('con otra bóveda no se puede abrir', async () => {
    const a = await createVault('clave de prueba larga', fast)
    const b = await createVault('clave de prueba larga', fast)
    const row = await encryptItem(a.dk, 'a', payload)
    await expect(decryptItem(b.dk, 'a', row)).rejects.toBeInstanceOf(VaultError)
  })
})

describe('clave maestra', () => {
  it('estima la fortaleza', () => {
    expect(masterStrength('abc').score).toBe(0)
    expect(masterStrength('contraseña1').score).toBeLessThan(3)
    expect(masterStrength('caballo bateria guitarra piano 2026').score).toBe(4)
  })
})
