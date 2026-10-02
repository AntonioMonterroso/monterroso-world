import { Check, Copy, Link2, Loader2, Mail, Play, Plus, QrCode, Share2, Trash2 } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Sheet from '../../components/Sheet'
import type { Partner, ShareLink, Workout } from '../../lib/fitness'
import { hashPin, newToken, shareUrl, tokenHash } from '../../lib/share'
import { useTable } from '../../lib/table'
import { Empty, ErrorBar, chip } from '../money/shared'
import { PageHeader } from '../../components/ui'

const EXPIRY = [{ label: 'Sin caducidad', days: 0 }, { label: '7 días', days: 7 }, { label: '30 días', days: 30 }, { label: '90 días', days: 90 }]

const state = (l: ShareLink) => (l.revoked ? 'Revocado' : l.expires_at && new Date(l.expires_at) < new Date() ? 'Caducado' : 'Activo')

function NewLink({ partner, workouts, onCreated }: { partner: Partner; workouts: Workout[]; onCreated: (url: string, hasPin: boolean) => void }) {
  const links = useTable<ShareLink>('share_links', { col: 'created_at', asc: false })
  const [sel, setSel] = useState<string[]>(workouts.map((w) => w.id))
  const [canLog, setCanLog] = useState(true)
  const [days, setDays] = useState(0)
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin && !/^\d{4,8}$/.test(pin)) return setErr('El PIN debe tener de 4 a 8 dígitos.')
    setBusy(true); setErr('')
    const token = newToken()
    const p = pin ? await hashPin(pin) : null
    const row = await links.add({ partner_id: partner.id, token_hash: await tokenHash(token), workout_ids: sel, can_log: canLog, expires_at: days ? new Date(Date.now() + days * 86_400_000).toISOString() : null, pin_salt: p?.salt ?? null, pin_hash: p?.hash ?? null, revoked: false, last_used_at: null, created_at: undefined as never })
    setBusy(false)
    if (!row) return setErr('No se pudo crear el enlace.')
    onCreated(shareUrl(token), Boolean(p))
  }

  return (
    <form onSubmit={create} className="grid gap-4">
      {workouts.length > 0 ? (
        <fieldset>
          <legend className="mb-2 text-sm">Rutinas que verá</legend>
          <div className="flex flex-wrap gap-2">{workouts.map((w) => { const on = sel.includes(w.id); return <button key={w.id} type="button" aria-pressed={on} onClick={() => setSel(on ? sel.filter((x) => x !== w.id) : [...sel, w.id])} className="min-h-11 rounded-full border px-4 text-sm" style={chip(on)}>{w.title}</button> })}</div>
        </fieldset>
      ) : <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>Aún no tienes rutinas; podrá registrar entrenamientos libres.</p>}
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-5" checked={canLog} onChange={(e) => setCanLog(e.target.checked)} /> Puede registrar sus entrenamientos (si no, solo ve)</label>
      <fieldset>
        <legend className="mb-2 text-sm">Caduca</legend>
        <div className="flex flex-wrap gap-2">{EXPIRY.map((x) => <button key={x.days} type="button" aria-pressed={days === x.days} onClick={() => setDays(x.days)} className="min-h-11 rounded-full border px-4 text-sm" style={chip(days === x.days)}>{x.label}</button>)}</div>
      </fieldset>
      <label className="grid gap-2 text-sm">PIN (opcional)
        <input className="field" inputMode="numeric" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="4 a 8 dígitos" autoComplete="off" />
        <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>Se lo das aparte. Tras 5 intentos fallidos el enlace se bloquea 15 minutos.</span>
      </label>
      {err && <p role="alert" className="text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
      <button className="btn btn-primary w-fit" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden />} Crear enlace</button>
    </form>
  )
}

function Created({ url, hasPin, partner, onDone }: { url: string; hasPin: boolean; partner: Partner; onDone: () => void }) {
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)
  useEffect(() => { QRCode.toDataURL(url, { margin: 1, width: 280, color: { dark: '#0b1730', light: '#f1ebdd' } }).then(setQr) }, [url])
  const text = `Hola ${partner.name}, aquí está tu panel de entrenamiento: ${url}${hasPin ? ' (te paso el PIN aparte)' : ''}`
  return (
    <div className="grid gap-4">
      <p className="rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, var(--personal) 14%, transparent)' }}>Este enlace se muestra solo ahora. Si lo pierdes, crea uno nuevo y revoca el anterior.</p>
      {qr && <img src={qr} alt="Código QR del enlace para compartir" width={200} height={200} className="mx-auto rounded-lg" />}
      <p className="break-all rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--bg)', color: 'var(--sky)' }}>{url}</p>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-ghost" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* sin permiso */ } }}>{copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {copied ? 'Copiado' : 'Copiar'}</button>
        {typeof navigator.share === 'function' && <button className="btn btn-ghost" onClick={() => navigator.share({ text }).catch(() => {})}><Share2 size={16} aria-hidden /> Compartir</button>}
        <a className="btn btn-ghost" href={`mailto:?subject=${encodeURIComponent('Tu panel de entrenamiento')}&body=${encodeURIComponent(text)}`}><Mail size={16} aria-hidden /> Por correo</a>
      </div>
      <button className="btn btn-primary w-fit" onClick={onDone}>Listo</button>
    </div>
  )
}

export default function Partners() {
  const partners = useTable<Partner>('training_partners', { col: 'created_at', asc: true })
  const links = useTable<ShareLink>('share_links', { col: 'created_at', asc: false })
  const workouts = useTable<Workout>('workouts', { col: 'created_at', asc: true })
  const [open, setOpen] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [created, setCreated] = useState<{ url: string; pin: boolean } | null>(null)
  const [making, setMaking] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [wid, setWid] = useState('')

  const partner = partners.rows.find((p) => p.id === open)
  const mine = useMemo(() => links.rows.filter((l) => l.partner_id === open), [links.rows, open])

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const p = await partners.add({ name: name.trim(), notes: null })
    setName('')
    if (p) setOpen(p.id)
  }

  const close = () => { setOpen(null); setCreated(null); setMaking(false); setConfirm(null) }

  return (
    <div>
      <PageHeader eyebrow="Ejercicio" title="Compañeros" />
      <p className="mt-2 max-w-md text-sm" style={{ color: 'var(--ink-soft)' }}>Comparte un panel con quien entrenas. Sin cuenta ni contraseña: entra con un enlace o un QR y solo ve lo que tú elijas.</p>
      <ErrorBar msg={partners.error || links.error || workouts.error} onClose={partners.clearError} />

      <form onSubmit={add} className="mt-5 flex gap-2">
        <label className="sr-only" htmlFor="np">Nombre del compañero</label>
        <input id="np" className="field" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Nuevo compañero de ejercicio" />
        <button className="btn btn-primary shrink-0"><Plus size={18} aria-hidden /> Agregar</button>
      </form>

      {partners.loading ? <div className="grid h-40 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : partners.rows.length === 0 ? (
        <Empty title="Entrena acompañado" text="Agrega a alguien y genera un enlace con QR. Podrá ver tus rutinas y registrar su progreso desde su teléfono." />
      ) : (
        <ul className="mt-5 grid gap-2">
          {partners.rows.map((p) => (
            <li key={p.id}>
              <button onClick={() => setOpen(p.id)} className="flex min-h-14 w-full items-center justify-between rounded-xl border px-4 py-3 text-left" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
                <span className="font-semibold">{p.name}</span>
                <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>{links.rows.filter((l) => l.partner_id === p.id && state(l) === 'Activo').length} enlaces activos</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={Boolean(partner)} title={partner?.name ?? ''} onClose={close}>
        {partner && (created ? <Created url={created.url} hasPin={created.pin} partner={partner} onDone={() => { setCreated(null); setMaking(false) }} /> : making ? (
          <NewLink partner={partner} workouts={workouts.rows} onCreated={(url, pin) => setCreated({ url, pin })} />
        ) : (
          <div className="grid gap-6">
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={() => setMaking(true)}><QrCode size={16} aria-hidden /> Nuevo enlace y QR</button>
            </div>

            {workouts.rows.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <select className="field !w-auto max-w-full" value={wid} onChange={(e) => setWid(e.target.value)} aria-label="Rutina para entrenar juntos"><option value="">Entrenar juntos…</option>{workouts.rows.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}</select>
                {wid && <Link to={`/app/ejercicio/entrenar/${wid}?con=${partner.id}`} className="btn btn-ghost"><Play size={16} aria-hidden /> Empezar</Link>}
              </div>
            )}

            <section aria-labelledby="enl">
              <h3 id="enl" className="font-display text-xl">Enlaces</h3>
              {mine.length === 0 ? <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>Todavía no hay enlaces.</p> : (
                <ul className="mt-2 grid gap-2">
                  {mine.map((l) => (
                    <li key={l.id} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--bg)' }}>
                      <Link2 size={16} aria-hidden style={{ color: 'var(--ink-faint)' }} />
                      <span className="min-w-0 flex-1">
                        <span className="block" style={{ color: state(l) === 'Activo' ? 'var(--pos)' : 'var(--ink-faint)' }}>{state(l)}{l.can_log ? ' · registra' : ' · solo ve'}{l.pin_hash ? ' · con PIN' : ''}</span>
                        <span className="block text-xs" style={{ color: 'var(--ink-faint)' }}>{l.last_used_at ? `Último uso ${new Date(l.last_used_at).toLocaleDateString('es')}` : 'Sin usar'}{l.expires_at && ` · vence ${new Date(l.expires_at).toLocaleDateString('es')}`}</span>
                      </span>
                      {state(l) === 'Activo' && <button className="min-h-11 px-2 underline" style={{ color: confirm === l.id ? 'var(--neg)' : undefined }} onClick={() => (confirm === l.id ? (links.update(l.id, { revoked: true }), setConfirm(null)) : setConfirm(l.id))}>{confirm === l.id ? '¿Revocar?' : 'Revocar'}</button>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <button className="btn btn-ghost w-fit" style={{ color: confirm === 'del' ? 'var(--neg)' : undefined }} onClick={async () => { if (confirm === 'del') { await partners.remove(partner.id); close() } else setConfirm('del') }}><Trash2 size={16} aria-hidden /> {confirm === 'del' ? '¿Seguro? Se borra también su historial' : 'Eliminar compañero'}</button>
          </div>
        ))}
      </Sheet>
    </div>
  )
}
