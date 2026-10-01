import { Check, Copy, Eye, Mail, Share2 } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useMemo, useState } from 'react'
import Sheet from '../../components/Sheet'
import { newToken, tokenHash } from '../../lib/share'
import { useTable } from '../../lib/table'
import { Loader2 } from 'lucide-react'
import { chip } from '../money/shared'

export type SongShare = { id: string; song_id: string | null; setlist_id: string | null; token_hash: string; include_notes: boolean; expires_at: string | null; revoked: boolean; last_used_at: string | null; created_at: string }

const EXPIRY = [{ label: 'Sin caducidad', days: 0 }, { label: '7 días', days: 7 }, { label: '30 días', days: 30 }]
const state = (l: SongShare) => (l.revoked ? 'Revocado' : l.expires_at && new Date(l.expires_at) < new Date() ? 'Caducado' : 'Activo')
const publicUrl = (token: string) => `${location.origin}${import.meta.env.BASE_URL}cancion/${token}`

/** Enlace público de solo lectura para una canción o un setlist. Nunca incluye notas de voz. */
export default function ShareSheet({ open, onClose, kind, id, title }: { open: boolean; onClose: () => void; kind: 'song' | 'setlist'; id: string; title: string }) {
  const db = useTable<SongShare>('song_shares', { col: 'created_at', asc: false })
  const [notes, setNotes] = useState(true)
  const [days, setDays] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [made, setMade] = useState<string | null>(null)
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirm, setConfirm] = useState<string | null>(null)

  const mine = useMemo(() => db.rows.filter((l) => (kind === 'song' ? l.song_id === id : l.setlist_id === id)), [db.rows, kind, id])

  useEffect(() => { if (open) { setMade(null); setErr(''); setConfirm(null) } }, [open])
  useEffect(() => { if (made) QRCode.toDataURL(made, { margin: 1, width: 260, color: { dark: '#0b1730', light: '#f1ebdd' } }).then(setQr) }, [made])

  const create = async () => {
    setBusy(true); setErr('')
    const token = newToken()
    const row = await db.add({ song_id: kind === 'song' ? id : null, setlist_id: kind === 'setlist' ? id : null, token_hash: await tokenHash(token), include_notes: notes, expires_at: days ? new Date(Date.now() + days * 86_400_000).toISOString() : null, revoked: false, last_used_at: null, created_at: undefined as never })
    setBusy(false)
    if (!row) return setErr('No se pudo crear el enlace.')
    setMade(publicUrl(token))
  }

  const text = `${title}: letra y acordes → ${made ?? ''}`

  return (
    <Sheet open={open} title={`Compartir ${kind === 'song' ? 'canción' : 'setlist'}`} onClose={onClose}>
      {made ? (
        <div className="grid gap-4">
          <p className="rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, var(--personal) 14%, transparent)' }}>Este enlace se muestra solo ahora. Si lo pierdes, crea uno nuevo y revoca el anterior.</p>
          {qr && <img src={qr} alt="Código QR del enlace" width={190} height={190} className="mx-auto rounded-lg" />}
          <p className="break-all rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--bg)', color: 'var(--sky)' }}>{made}</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-ghost" onClick={async () => { try { await navigator.clipboard.writeText(made); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* sin permiso */ } }}>{copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {copied ? 'Copiado' : 'Copiar'}</button>
            {typeof navigator.share === 'function' && <button className="btn btn-ghost" onClick={() => navigator.share({ text }).catch(() => {})}><Share2 size={16} aria-hidden /> Compartir</button>}
            <a className="btn btn-ghost" href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`}><Mail size={16} aria-hidden /> Correo</a>
          </div>
          <button className="btn btn-primary w-fit" onClick={() => setMade(null)}>Listo</button>
        </div>
      ) : (
        <div className="grid gap-5">
          <p className="flex items-start gap-2 text-sm" style={{ color: 'var(--ink-soft)' }}><Eye size={16} aria-hidden className="mt-0.5 shrink-0" /> Quien tenga el enlace verá la letra y los acordes de “{title}” en solo lectura, y podrá transponer, agrandar y imprimir. <strong style={{ color: 'var(--ink)' }}>Tus notas de voz nunca se comparten.</strong></p>
          <label className="flex min-h-11 items-start gap-3 text-sm"><input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={notes} onChange={(e) => setNotes(e.target.checked)} /> Incluir mis notas por línea (golpes, tablatura, producción)</label>
          <fieldset><legend className="mb-2 text-sm">Caduca</legend><div className="flex flex-wrap gap-2">{EXPIRY.map((x) => <button key={x.days} type="button" aria-pressed={days === x.days} onClick={() => setDays(x.days)} className="min-h-11 rounded-full border px-4 text-sm" style={chip(days === x.days)}>{x.label}</button>)}</div></fieldset>
          {err && <p role="alert" className="text-sm" style={{ color: '#e8a393' }}>{err}</p>}
          <button className="btn btn-primary w-fit" onClick={create} disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden />} Crear enlace</button>

          <section aria-labelledby="enlaces-c">
            <h3 id="enlaces-c" className="font-display text-xl">Enlaces creados</h3>
            {mine.length === 0 ? <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>Todavía no hay.</p> : (
              <ul className="mt-2 grid gap-2">
                {mine.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--bg)' }}>
                    <span className="min-w-0 flex-1"><span className="block" style={{ color: state(l) === 'Activo' ? '#8fd1a4' : 'var(--ink-faint)' }}>{state(l)}{l.include_notes ? ' · con notas' : ' · sin notas'}</span><span className="block text-xs" style={{ color: 'var(--ink-faint)' }}>{l.last_used_at ? `Último uso ${new Date(l.last_used_at).toLocaleDateString('es')}` : 'Sin abrir'}{l.expires_at && ` · vence ${new Date(l.expires_at).toLocaleDateString('es')}`}</span></span>
                    {state(l) === 'Activo' && <button className="min-h-11 px-2 underline" style={{ color: confirm === l.id ? '#e8a393' : undefined }} onClick={() => (confirm === l.id ? (db.update(l.id, { revoked: true }), setConfirm(null)) : setConfirm(l.id))}>{confirm === l.id ? '¿Revocar?' : 'Revocar'}</button>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Sheet>
  )
}
