import { Download, Fingerprint, Loader2, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import Sheet from '../../components/Sheet'
import { bioEnrolled, bioSupported, enrollBio, removeBio } from '../../lib/bio'
import { supabase } from '../../lib/supabase'
import { IDLE_KEY, idleMinutes, lockVault } from '../../lib/vaultSession'
import { VaultError, createVault, decryptItem, encryptItem, masterStrength, rewrapMaster, rewrapRecovery, unlockWithMaster, type DataKey, type VaultMeta } from '../../lib/vault'
import { RecoveryScreen } from './Gate'

type Props = { open: boolean; onClose: () => void; dk: DataKey; meta: VaultMeta; onMeta: (m: VaultMeta | null) => void; userName: string; count: number }

export default function VaultSettings({ open, onClose, dk, meta, onMeta, userName, count }: Props) {
  const [idle, setIdle] = useState(idleMinutes())
  const [bioOk, setBioOk] = useState(false)
  const [enrolled, setEnrolled] = useState(bioEnrolled())
  const [np, setNp] = useState('')
  const [np2, setNp2] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')
  const [code, setCode] = useState<string | null>(null)
  const [test, setTest] = useState<string[] | null>(null)
  const [word, setWord] = useState('')

  useEffect(() => { if (open) { bioSupported().then(setBioOk); setEnrolled(bioEnrolled()); setMsg(''); setErr(''); setTest(null); setWord('') } }, [open])

  const say = (m: string) => { setMsg(m); setErr('') }
  const fail = (m: string) => { setErr(m); setMsg('') }

  const changeMaster = async (e: React.FormEvent) => {
    e.preventDefault()
    if (np.length < 10) return fail('La nueva clave debe tener al menos 10 caracteres.')
    if (np !== np2) return fail('Las dos claves no coinciden.')
    setBusy('master')
    try {
      const m = await rewrapMaster(dk, np)
      const { error } = await supabase.from('vault_meta').update(m).eq('version', meta.version)
      if (error) throw error
      onMeta({ ...meta, ...m }); setNp(''); setNp2(''); say('Listo. Tu clave maestra cambió. En otros dispositivos usarás la nueva.')
    } catch { fail('No se pudo cambiar la clave.') }
    setBusy('')
  }

  const newRecovery = async () => {
    setBusy('rec')
    try {
      const r = await rewrapRecovery(dk)
      const { error } = await supabase.from('vault_meta').update(r.fields).eq('version', meta.version)
      if (error) throw error
      onMeta({ ...meta, ...r.fields }); setCode(r.recoveryCode)
    } catch { fail('No se pudo generar el código.') }
    setBusy('')
  }

  const enroll = async () => {
    setBusy('bio')
    try { await enrollBio(dk, userName); setEnrolled(true); say('Listo. La próxima vez podrás entrar con huella o Face ID en este dispositivo.') }
    catch (e) { fail((e as Error).message === 'prf' ? 'Este dispositivo no admite desbloqueo biométrico para la bóveda. Sigue usando tu clave maestra.' : 'No se activó. Puedes intentarlo de nuevo.') }
    setBusy('')
  }

  const backup = async () => {
    setBusy('backup')
    const { data, error } = await supabase.from('vault_items').select('*')
    if (error) { setBusy(''); return fail('No pude leer la bóveda.') }
    const blob = new Blob([JSON.stringify({ app: 'monterroso-world-vault', exported_at: new Date().toISOString(), note: 'Todo está cifrado. Solo se abre con tu clave maestra o tu código de recuperación.', meta, items: data }, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `boveda-cifrada-${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(a.href)
    setBusy(''); say('Respaldo descargado. Está cifrado: guárdalo en un lugar seguro.')
  }

  // Diagnóstico en este dispositivo, sin tocar tus datos
  const runTest = async () => {
    setBusy('test'); setTest(null)
    const out: string[] = []
    const t0 = performance.now()
    try {
      out.push(crypto?.subtle ? '✓ Cifrado disponible en este navegador' : '✗ Este navegador no tiene cifrado')
      const v = await createVault('clave-de-prueba-larga', { iterations: 5000, recIterations: 5000 })
      const sample = { title: 'Prueba', fields: [{ label: 'Clave', value: 'ñandú-🔐-123', secret: true }] }
      const row = await encryptItem(v.dk, 'prueba', sample)
      const back = await decryptItem(v.dk, 'prueba', row)
      out.push(back.fields[0].value === sample.fields[0].value ? '✓ Cifrar y descifrar funciona' : '✗ El descifrado no coincide')
      let rejected = false
      try { await unlockWithMaster(v.meta, 'otra-clave') } catch (e) { rejected = e instanceof VaultError }
      out.push(rejected ? '✓ Una clave incorrecta es rechazada' : '✗ Aceptó una clave incorrecta')
      let swapped = false
      try { await decryptItem(v.dk, 'otro-id', row) } catch { swapped = true }
      out.push(swapped ? '✓ Un ítem no se puede mover a otro registro' : '✗ Permitió mover un ítem')
      out.push(`✓ Prueba hecha en ${Math.round(performance.now() - t0)} ms`)
    } catch { out.push('✗ La prueba falló') }
    out.push((await bioSupported()) ? '✓ Este dispositivo tiene huella o Face ID' : '– Sin huella o Face ID disponible aquí')
    out.push(navigator.clipboard ? '✓ Se puede copiar al portapapeles' : '– No se puede copiar automáticamente')
    setTest(out); setBusy('')
  }

  const wipe = async () => {
    setBusy('wipe')
    const a = await supabase.from('vault_items').delete().not('id', 'is', null)
    const b = await supabase.from('vault_meta').delete().eq('version', meta.version)
    removeBio()
    setBusy('')
    if (a.error || b.error) return fail('No se pudo borrar todo.')
    lockVault(); onMeta(null); onClose()
  }

  if (code) return <Sheet open={open} title="Código nuevo" onClose={() => { setCode(null); onClose() }}><RecoveryScreen code={code} onDone={() => setCode(null)} /></Sheet>

  const section = 'grid gap-3 rounded-2xl border p-4'
  const style = { borderColor: 'var(--line-soft)', background: 'var(--bg)' }

  return (
    <Sheet open={open} title="Ajustes de la bóveda" onClose={onClose}>
      <div className="grid gap-4">
        {msg && <p role="status" className="text-sm" style={{ color: 'var(--sky)' }}>{msg}</p>}
        {err && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>{err}</p>}

        <section className={section} style={style}>
          <h3 className="font-semibold">Bloqueo automático</h3>
          <label className="flex items-center gap-3 text-sm">Tras
            <select className="field !w-auto" value={idle} onChange={(e) => { const n = Number(e.target.value); setIdle(n); try { localStorage.setItem(IDLE_KEY, String(n)) } catch { /* sin almacenamiento */ } }}>{[1, 3, 5, 10, 15, 30].map((n) => <option key={n} value={n}>{n} min</option>)}</select> sin usarla</label>
          <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>También se bloquea al recargar la página y al dejar la app en segundo plano más de un minuto.</p>
        </section>

        {bioOk && (
          <section className={section} style={style}>
            <h3 className="flex items-center gap-2 font-semibold"><Fingerprint size={18} aria-hidden /> Huella o Face ID</h3>
            <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>Es por dispositivo. La llave se guarda cifrada aquí y solo tu huella o tu rostro la abren.</p>
            {enrolled ? <button className="btn btn-ghost w-fit" onClick={() => { removeBio(); setEnrolled(false); say('Desactivado en este dispositivo.') }}>Desactivar en este dispositivo</button> : <button className="btn btn-ghost w-fit" onClick={enroll} disabled={busy === 'bio'}>{busy === 'bio' && <Loader2 size={16} className="animate-spin" aria-hidden />} Activar</button>}
          </section>
        )}

        <form className={section} style={style} onSubmit={changeMaster}>
          <h3 className="font-semibold">Cambiar la clave maestra</h3>
          <input className="field" type="password" autoComplete="new-password" placeholder="Nueva clave" aria-label="Nueva clave maestra" value={np} onChange={(e) => setNp(e.target.value)} />
          {np && <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>{masterStrength(np).label}</p>}
          <input className="field" type="password" autoComplete="new-password" placeholder="Repítela" aria-label="Repetir la nueva clave" value={np2} onChange={(e) => setNp2(e.target.value)} />
          <button className="btn btn-ghost w-fit" disabled={busy === 'master' || !np}>{busy === 'master' && <Loader2 size={16} className="animate-spin" aria-hidden />} Cambiar</button>
        </form>

        <section className={section} style={style}>
          <h3 className="font-semibold">Código de recuperación</h3>
          <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>Genera uno nuevo si lo perdiste o lo expusiste. El anterior deja de servir.</p>
          <button className="btn btn-ghost w-fit" onClick={newRecovery} disabled={busy === 'rec'}>{busy === 'rec' && <Loader2 size={16} className="animate-spin" aria-hidden />} Generar código nuevo</button>
        </section>

        <section className={section} style={style}>
          <h3 className="font-semibold">Respaldo cifrado</h3>
          <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>Descarga todo tal como está guardado, cifrado ({count} {count === 1 ? 'elemento' : 'elementos'}). Sin tu clave o tu código no se puede abrir.</p>
          <button className="btn btn-ghost w-fit" onClick={backup} disabled={busy === 'backup'}><Download size={16} aria-hidden /> Descargar respaldo</button>
        </section>

        <section className={section} style={style}>
          <h3 className="font-semibold">Probar la bóveda</h3>
          <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>Revisa que este dispositivo cifra bien. No toca tus datos.</p>
          <button className="btn btn-ghost w-fit" onClick={runTest} disabled={busy === 'test'}>{busy === 'test' && <Loader2 size={16} className="animate-spin" aria-hidden />} Probar</button>
          {test && <ul className="grid gap-1 text-sm" aria-live="polite">{test.map((t) => <li key={t}>{t}</li>)}</ul>}
        </section>

        <section className={section} style={{ ...style, borderColor: 'color-mix(in oklab, #e8a393 40%, transparent)' }}>
          <h3 className="font-semibold" style={{ color: '#e8a393' }}>Borrar la bóveda</h3>
          <p className="text-xs" style={{ color: 'var(--ink-faint)' }}>Elimina todo, sin vuelta atrás. Escribe BORRAR para confirmar.</p>
          <input className="field" value={word} onChange={(e) => setWord(e.target.value)} aria-label="Escribe BORRAR" autoComplete="off" />
          <button className="btn btn-ghost w-fit" style={{ color: '#e8a393' }} disabled={word !== 'BORRAR' || busy === 'wipe'} onClick={wipe}><Trash2 size={16} aria-hidden /> Borrar todo</button>
        </section>
      </div>
    </Sheet>
  )
}
