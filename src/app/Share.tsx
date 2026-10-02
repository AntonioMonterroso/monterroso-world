import { Check, Copy, Download, ExternalLink, Share2 } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Sheet from '../components/Sheet'
import { Group, PageHeader, Row, Stat } from '../components/ui'
import type { ShareLink, Partner } from '../lib/fitness'
import type { Setlist, Song } from '../lib/music'
import { availability, buildVCard, focuses, profile, type FocusKey } from '../lib/profile'
import type { Sermon } from '../lib/pulpit'
import { useTable } from '../lib/table'
import type { SongShare } from './music/ShareSheet'
import { ErrorBar } from './money/shared'

const FOCUS_KEYS = Object.keys(focuses) as FocusKey[]
const TONE: Record<FocusKey, string> = { dev: 'var(--dev)', music: 'var(--music)', personal: 'var(--personal)' }
const stateOf = (l: { revoked: boolean; expires_at: string | null }) => (l.revoked ? 'revocado' : l.expires_at && new Date(l.expires_at) < new Date() ? 'caducado' : 'activo')
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : null)

async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch { return false }
}

/** Una tarjeta digital: enlace, QR, compartir y contacto (vCard). */
function CardSheet({ focus, onClose }: { focus: FocusKey | null; onClose: () => void }) {
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)
  const link = focus ? `${profile.pageUrl}#${focus}` : ''
  const f = focus ? focuses[focus] : null
  useEffect(() => { if (link) QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: '#0a1923', light: '#f1ebdd' } }).then(setQr) }, [link])

  const vcf = () => {
    if (!focus) return
    const blob = new Blob([buildVCard(focus)], { type: 'text/vcard' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `${profile.name}-${focus}.vcf`; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }

  return (
    <Sheet open={Boolean(focus)} title={f ? `Tarjeta · ${f.label}` : ''} onClose={onClose}>
      {f && focus && (
        <div className="grid gap-4">
          <div className="rounded-2xl p-4" style={{ background: `color-mix(in oklab, ${TONE[focus]} 12%, var(--surface-2))` }}>
            <p className="text-sm font-semibold" style={{ color: TONE[focus] }}>{f.role}</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{f.headline}</p>
            <p className="mt-1 text-xs" style={{ color: 'var(--ink-soft)' }}>{availability(new Date().getHours())}</p>
          </div>
          {qr && <img src={qr} alt={`Código QR de la tarjeta ${f.label}`} width={200} height={200} className="mx-auto rounded-xl" />}
          <p className="break-all rounded-xl px-3 py-2 text-xs" style={{ background: 'var(--bg)', color: 'var(--sky)' }}>{link}</p>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-tint" onClick={async () => { if (await copyText(link)) { setCopied(true); setTimeout(() => setCopied(false), 1800) } }}>{copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />} {copied ? 'Copiado' : 'Copiar enlace'}</button>
            {typeof navigator.share === 'function' && <button className="btn btn-ghost" onClick={() => navigator.share({ title: `${profile.name} · ${f.label}`, text: f.headline, url: link }).catch(() => {})}><Share2 size={16} aria-hidden /> Compartir</button>}
            <button className="btn btn-ghost" onClick={vcf}><Download size={16} aria-hidden /> Contacto (.vcf)</button>
            <a className="btn btn-ghost" href={link} target="_blank" rel="noreferrer"><ExternalLink size={16} aria-hidden /> Ver</a>
          </div>
        </div>
      )}
    </Sheet>
  )
}

/** Compartir: todo lo que tienes publicado o con enlace, en un solo lugar, con la opción de revocar. */
export default function Share() {
  const songShares = useTable<SongShare>('song_shares', { col: 'created_at', asc: false })
  const songs = useTable<Song>('songs', { col: 'title', asc: true })
  const setlists = useTable<Setlist>('setlists', { col: 'created_at', asc: false })
  const partnerLinks = useTable<ShareLink>('share_links', { col: 'created_at', asc: false })
  const partners = useTable<Partner>('training_partners', { col: 'name', asc: true })
  const sermons = useTable<Sermon>('sermons', { col: 'created_at', asc: false })
  const [card, setCard] = useState<FocusKey | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)
  const [copied, setCopied] = useState('')

  const activeSongs = useMemo(() => songShares.rows.filter((l) => stateOf(l) === 'activo'), [songShares.rows])
  const activePartners = useMemo(() => partnerLinks.rows.filter((l) => stateOf(l) === 'activo'), [partnerLinks.rows])
  const live = useMemo(() => sermons.rows.filter((s) => s.live_token).slice(0, 6), [sermons.rows])
  const total = FOCUS_KEYS.length + activeSongs.length + activePartners.length + live.length

  const revoke = async (table: typeof songShares | typeof partnerLinks, id: string) => {
    if (confirm !== id) { setConfirm(id); setTimeout(() => setConfirm((c) => (c === id ? null : c)), 4000); return }
    await table.update(id, { revoked: true } as never)
    setConfirm(null)
  }
  const copyLive = async (s: Sermon) => {
    if (await copyText(`${location.origin}${import.meta.env.BASE_URL}live/${s.live_token}`)) { setCopied(s.id); setTimeout(() => setCopied(''), 1800) }
  }
  const titleOfSong = (l: SongShare) => (l.song_id ? songs.rows.find((s) => s.id === l.song_id)?.title : setlists.rows.find((s) => s.id === l.setlist_id)?.title) ?? 'Borrado'
  const revokeBtn = (table: typeof songShares | typeof partnerLinks, id: string, active: boolean) => active ? (
    <button className="min-h-11 rounded-full px-3 text-sm font-semibold" style={{ color: confirm === id ? 'var(--neg)' : 'var(--ink-soft)', background: confirm === id ? 'color-mix(in oklab, var(--neg) 14%, transparent)' : 'var(--surface-2)' }} onClick={() => void revoke(table, id)}>{confirm === id ? '¿Seguro?' : 'Revocar'}</button>
  ) : undefined

  const loading = songShares.loading || partnerLinks.loading || sermons.loading

  return (
    <div>
      <PageHeader eyebrow="Compartir" title="Lo que compartes" sub="Tus tarjetas y todos los enlaces públicos, en un solo lugar. Desde aquí puedes apagar cualquiera." />
      <ErrorBar msg={songShares.error || partnerLinks.error} onClose={songShares.clearError} />
      {!loading && <div className="stats"><Stat label="Con enlace activo" value={String(total)} /><Stat label="Canciones y setlists" value={String(activeSongs.length)} /><Stat label="Compañeros" value={String(activePartners.length)} /></div>}

      <Group title="Tarjetas digitales" footer="Una por enfoque: elige la que va con la persona a la que se la das. Cada una tiene enlace, QR y contacto.">
        {FOCUS_KEYS.map((k) => <Row key={k} tone={TONE[k]} title={focuses[k].label} sub={focuses[k].role} onClick={() => setCard(k)} />)}
      </Group>

      <Group title="Canciones y setlists" footer="Solo lectura: letra, acordes y notas por línea. Nunca tus notas de voz. El enlace se muestra una sola vez al crearlo; aquí puedes revocarlo.">
        {songShares.rows.length === 0 ? <li className="row"><p className="row-hit text-sm" style={{ color: 'var(--ink-faint)' }}>Aún no compartes ninguna.</p></li> : songShares.rows.slice(0, 8).map((l) => {
          const st = stateOf(l)
          return <Row key={l.id} tone={st === 'activo' ? 'var(--pos)' : 'var(--ink-faint)'} muted={st !== 'activo'} title={titleOfSong(l)} chevron={false}
            sub={`${l.setlist_id ? 'Setlist' : 'Canción'} · ${st}${l.last_used_at ? ` · visto ${fmtDate(l.last_used_at)}` : ' · sin visitas'}${l.expires_at && st === 'activo' ? ` · caduca ${fmtDate(l.expires_at)}` : ''}`}
            trailing={revokeBtn(songShares, l.id, st === 'activo')} />
        })}
        <Row icon={<Share2 size={16} aria-hidden />} tone="var(--accent)" title={<span style={{ color: 'var(--accent)' }}>Compartir una canción</span>} to="/app/musica" />
      </Group>

      <Group title="Compañeros de ejercicio" footer="Cada compañero entra con su enlace (y un PIN si lo pusiste) y solo ve lo suyo.">
        {partnerLinks.rows.length === 0 ? <li className="row"><p className="row-hit text-sm" style={{ color: 'var(--ink-faint)' }}>Aún no tienes compañeros con enlace.</p></li> : partnerLinks.rows.slice(0, 8).map((l) => {
          const st = stateOf(l)
          return <Row key={l.id} tone={st === 'activo' ? 'var(--pos)' : 'var(--ink-faint)'} muted={st !== 'activo'} title={partners.rows.find((p) => p.id === l.partner_id)?.name ?? 'Compañero'} chevron={false}
            sub={`${l.can_log ? 'Ve y registra' : 'Solo ve'} · ${st}${l.pin_hash ? ' · con PIN' : ''}${l.last_used_at ? ` · entró ${fmtDate(l.last_used_at)}` : ' · aún no entra'}`}
            trailing={revokeBtn(partnerLinks, l.id, st === 'activo')} />
        })}
        <Row icon={<Share2 size={16} aria-hidden />} tone="var(--accent)" title={<span style={{ color: 'var(--accent)' }}>Invitar a un compañero</span>} to="/app/ejercicio/companeros" />
      </Group>

      {live.length > 0 && (
        <Group title="Pantalla de la iglesia" footer="El enlace de cada prédica muestra solo la diapositiva actual. Ábrelo en la pantalla del templo y controla desde el presentador.">
          {live.map((s) => <Row key={s.id} tone="var(--personal)" title={s.title} sub={s.scripture ?? 'Presentación en vivo'} to={`/app/pulpito/predica/${s.id}`}
            trailing={<button className="min-h-11 rounded-full px-3 text-sm font-semibold" style={{ background: 'var(--surface-2)', color: copied === s.id ? 'var(--pos)' : 'var(--ink-soft)' }} onClick={() => void copyLive(s)}>{copied === s.id ? 'Copiado' : 'Copiar enlace'}</button>} />)}
        </Group>
      )}

      <p className="group-foot mt-6"><Link to="/app/ajustes" className="underline">Ajustes</Link> · Todo lo público es de solo lectura y no incluye tu bóveda, tus finanzas ni tus notas de voz.</p>
      <CardSheet focus={card} onClose={() => setCard(null)} />
    </div>
  )
}
