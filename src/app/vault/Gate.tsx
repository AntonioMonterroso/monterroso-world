import { Check, Copy, Download, Fingerprint, KeyRound, Loader2, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { bioEnrolled, bioSupported, unlockBio } from '../../lib/bio'
import { supabase } from '../../lib/supabase'
import { VaultError, createVault, masterStrength, rewrapMaster, rewrapRecovery, unlockWithMaster, unlockWithRecovery, type DataKey, type VaultMeta } from '../../lib/vault'
import { copySecret, unlockVault } from '../../lib/vaultSession'

const bar = ['#e8a393', '#e8a393', 'var(--personal)', '#8fd1a4', '#8fd1a4']

function Strength({ pw }: { pw: string }) {
  const s = masterStrength(pw)
  return (
    <div aria-live="polite">
      <div className="flex gap-1">{[0, 1, 2, 3].map((i) => <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: pw && i < s.score ? bar[s.score] : 'var(--surface-2)', transition: 'background-color 200ms' }} />)}</div>
      {pw && <p className="mt-1 text-xs" style={{ color: 'var(--ink-faint)' }}>{s.label}. Mejor una frase larga que se pueda recordar.</p>}
    </div>
  )
}

/** Muestra el código de recuperación una sola vez. */
export function RecoveryScreen({ code, onDone }: { code: string; onDone: () => void }) {
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const download = () => {
    const blob = new Blob([`Monterroso World — código de recuperación de la bóveda\n\n${code}\n\nGuárdalo fuera de este dispositivo. Con este código (o con tu clave maestra) se abre la bóveda. Si pierdes ambos, nadie podrá recuperar tus datos.\n`], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'codigo-recuperacion-boveda.txt'
    a.click()
    URL.revokeObjectURL(a.href)
  }
  return (
    <div className="mx-auto max-w-md">
      <ShieldCheck size={36} aria-hidden style={{ color: '#8fd1a4' }} />
      <h1 className="mt-3 font-display text-4xl">Guarda este código</h1>
      <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>Es tu única forma de entrar si olvidas la clave maestra. Se muestra solo ahora. Anótalo en papel o guárdalo en tu gestor de claves, <strong>no</strong> en este mismo teléfono sin respaldo.</p>
      <p className="mt-5 rounded-2xl border px-4 py-5 text-center font-mono text-lg tracking-wider break-all" style={{ borderColor: 'var(--accent)', background: 'var(--bg)' }} aria-label="Código de recuperación">{code}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn btn-ghost" onClick={async () => { if (await copySecret(code)) { setCopied(true); setTimeout(() => setCopied(false), 1800) } }}>{copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {copied ? 'Copiado' : 'Copiar'}</button>
        <button className="btn btn-ghost" onClick={download}><Download size={16} aria-hidden /> Descargar</button>
      </div>
      <label className="mt-6 flex items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={saved} onChange={(e) => setSaved(e.target.checked)} /> Ya lo guardé en un lugar seguro y entiendo que no se vuelve a mostrar.</label>
      <button className="btn btn-primary mt-5" disabled={!saved} onClick={onDone}>Entrar a la bóveda</button>
    </div>
  )
}

/** Crear la bóveda por primera vez. */
export function Setup({ onCreated }: { onCreated: (meta: VaultMeta, code: string, dk: DataKey) => void }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [ack, setAck] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.length < 10) return setErr('Usa al menos 10 caracteres.')
    if (pw !== pw2) return setErr('Las dos claves no coinciden.')
    setBusy(true); setErr('')
    try {
      const { meta, recoveryCode, dk } = await createVault(pw)
      const { error } = await supabase.from('vault_meta').insert(meta)
      if (error) throw error
      onCreated(meta, recoveryCode, dk)
    } catch { setErr('No se pudo crear la bóveda. Revisa tu conexión e intenta de nuevo.') }
    setBusy(false)
  }

  return (
    <form onSubmit={create} className="mx-auto grid max-w-md gap-4">
      <KeyRound size={36} aria-hidden style={{ color: 'var(--accent)' }} />
      <h1 className="font-display text-4xl">Crea tu bóveda</h1>
      <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Tus contraseñas se cifran en este dispositivo antes de subirse. Nadie más las puede leer, ni siquiera yo ni el servidor. Solo tú, con tu clave maestra.</p>
      <label className="grid gap-2 text-sm">Clave maestra<input className="field" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
      <Strength pw={pw} />
      <label className="grid gap-2 text-sm">Repítela<input className="field" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></label>
      <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={ack} onChange={(e) => setAck(e.target.checked)} /> Entiendo que si pierdo la clave maestra y el código de recuperación, nadie puede recuperar mis datos.</label>
      {err && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>{err}</p>}
      <button className="btn btn-primary w-fit" disabled={busy || !ack || !pw}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden />} {busy ? 'Protegiendo…' : 'Crear bóveda'}</button>
    </form>
  )
}

/** Desbloquear con clave maestra, huella/Face ID o código de recuperación. */
export function Unlock({ meta, onMetaChanged }: { meta: VaultMeta; onMetaChanged: (m: VaultMeta, newCode?: string) => void }) {
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [bio, setBio] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [code, setCode] = useState('')
  const [np, setNp] = useState('')
  const [np2, setNp2] = useState('')

  useEffect(() => { bioSupported().then((ok) => setBio(ok && bioEnrolled())) }, [])

  const wrap = async (fn: () => Promise<void>) => {
    setBusy(true); setErr('')
    try { await fn() } catch (e) { setErr(e instanceof VaultError ? (forgot ? 'Ese código no es correcto.' : 'La clave maestra no es correcta.') : 'No se pudo completar. Intenta de nuevo.') }
    setBusy(false)
  }

  const withMaster = (e: React.FormEvent) => { e.preventDefault(); void wrap(async () => { unlockVault(await unlockWithMaster(meta, pw)); setPw('') }) }
  const withBio = async () => {
    setBusy(true); setErr('')
    try { unlockVault(await unlockBio()) } catch { setErr('No se pudo con huella o Face ID. Usa tu clave maestra.') }
    setBusy(false)
  }

  const recover = (e: React.FormEvent) => {
    e.preventDefault()
    if (np.length < 10) return setErr('La nueva clave debe tener al menos 10 caracteres.')
    if (np !== np2) return setErr('Las dos claves no coinciden.')
    void wrap(async () => {
      const dk = await unlockWithRecovery(meta, code)
      const [m, r] = await Promise.all([rewrapMaster(dk, np), rewrapRecovery(dk)])
      const next = { ...meta, ...m, ...r.fields }
      const { error } = await supabase.from('vault_meta').update({ ...m, ...r.fields }).eq('version', meta.version)
      if (error) throw error
      onMetaChanged(next, r.recoveryCode)
      unlockVault(dk)
    })
  }

  if (forgot) {
    return (
      <form onSubmit={recover} className="mx-auto grid max-w-md gap-4">
        <h1 className="font-display text-4xl">Recuperar acceso</h1>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Escribe tu código de recuperación y elige una clave maestra nueva. Después te daré un código nuevo; el anterior deja de servir.</p>
        <label className="grid gap-2 text-sm">Código de recuperación<input className="field font-mono" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="XXXX-XXXX-…" /></label>
        <label className="grid gap-2 text-sm">Nueva clave maestra<input className="field" type="password" autoComplete="new-password" value={np} onChange={(e) => setNp(e.target.value)} /></label>
        <Strength pw={np} />
        <label className="grid gap-2 text-sm">Repítela<input className="field" type="password" autoComplete="new-password" value={np2} onChange={(e) => setNp2(e.target.value)} /></label>
        {err && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>{err}</p>}
        <div className="flex gap-3">
          <button className="btn btn-primary" disabled={busy || !code}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden />} Recuperar</button>
          <button type="button" className="btn btn-ghost" onClick={() => { setForgot(false); setErr('') }}>Volver</button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={withMaster} className="mx-auto grid max-w-md gap-4">
      <KeyRound size={36} aria-hidden style={{ color: 'var(--accent)' }} />
      <h1 className="font-display text-4xl">Bóveda bloqueada</h1>
      <label className="grid gap-2 text-sm">Clave maestra<input className="field" type="password" autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></label>
      {err && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>{err}</p>}
      <div className="flex flex-wrap gap-3">
        <button className="btn btn-primary" disabled={busy || !pw}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden />} Desbloquear</button>
        {bio && <button type="button" className="btn btn-ghost" onClick={() => void withBio()} disabled={busy}><Fingerprint size={18} aria-hidden /> Huella o Face ID</button>}
      </div>
      <button type="button" className="min-h-11 w-fit text-sm underline" style={{ color: 'var(--ink-soft)' }} onClick={() => { setForgot(true); setErr('') }}>Olvidé mi clave maestra</button>
    </form>
  )
}
