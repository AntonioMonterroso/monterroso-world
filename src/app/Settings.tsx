import { Bell, BellOff, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { disablePush, enablePush, loadSettings, pushStatus, saveBlockAlerts, saveQuiet, sendTest, type BlockAlerts, type PushStatus, type Quiet } from '../lib/push'
import { fmtMin, toMin } from '../lib/time'
import { chip } from './money/shared'

const LEADS = [{ min: 0, label: 'A la hora' }, { min: 5, label: '5 min antes' }, { min: 10, label: '10 min antes' }, { min: 15, label: '15 min antes' }, { min: 30, label: '30 min antes' }]

const notes: Record<PushStatus, string> = {
  unsupported: 'Este navegador no admite notificaciones.',
  'needs-install': 'En iPhone, primero añade la app a tu pantalla de inicio (Compartir → Añadir a pantalla de inicio) y ábrela desde ahí.',
  blocked: 'Las notificaciones están bloqueadas para este sitio. Actívalas en los ajustes del navegador o del teléfono.',
  off: 'Los avisos están apagados en este dispositivo.',
  on: 'Los avisos están activos en este dispositivo.',
}

function Alerts() {
  const [status, setStatus] = useState<PushStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [quiet, setQuiet] = useState<Quiet>(null)
  const [tz, setTz] = useState('')
  const [blocks, setBlocks] = useState<BlockAlerts>({})

  useEffect(() => {
    pushStatus().then(setStatus)
    loadSettings().then((s) => { setQuiet(s.quiet ?? null); setTz(s.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone); setBlocks(s.blockAlerts ?? {}) })
  }, [])

  const run = async (fn: () => Promise<void>, ok: string) => {
    setBusy(true); setMsg('')
    try { await fn(); setMsg(ok) } catch (e) { setMsg((e as Error).message) }
    setStatus(await pushStatus())
    setBusy(false)
  }

  const setQuietTime = (key: 'start' | 'end', v: string) => {
    if (!v) return
    const next = { start: quiet?.start ?? 22 * 60, end: quiet?.end ?? 7 * 60, [key]: toMin(v) }
    setQuiet(next); saveQuiet(next)
  }

  const setBlockAlerts = (next: BlockAlerts) => { setBlocks(next); void saveBlockAlerts(next) }
  const leads = blocks.lead?.length ? blocks.lead : [0]
  const toggleLead = (min: number) => {
    const next = leads.includes(min) ? leads.filter((x) => x !== min) : [...leads, min].sort((a, b) => a - b)
    if (next.length) setBlockAlerts({ ...blocks, lead: next })
  }

  return (
    <section aria-labelledby="avisos" className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
      <h2 id="avisos" className="flex items-center gap-2 font-display text-2xl">{status === 'on' ? <Bell size={20} aria-hidden /> : <BellOff size={20} aria-hidden />} Avisos</h2>
      <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }} aria-live="polite">{status ? notes[status] : 'Revisando…'}</p>

      <div className="mt-4 flex flex-wrap gap-3">
        {status === 'off' && <button className="btn btn-primary" disabled={busy} onClick={() => run(enablePush, 'Listo. Este dispositivo recibirá avisos.')}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden />} Activar avisos</button>}
        {status === 'on' && (
          <>
            <button className="btn btn-ghost" disabled={busy} onClick={() => run(async () => { const n = await sendTest(); if (n === 0) throw new Error('No llegó a ningún dispositivo.') }, 'Prueba enviada. Debe llegar en unos segundos.')}>Enviar prueba</button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => run(disablePush, 'Avisos apagados en este dispositivo.')}>Apagar</button>
          </>
        )}
      </div>
      {msg && <p role="status" className="mt-3 text-sm" style={{ color: 'var(--sky)' }}>{msg}</p>}

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold">Avisos del horario</legend>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>Te aviso cuando empieza cada bloque de tu horario (trabajo, ensayo, ejercicio…). Cada bloque se puede silenciar desde su edición.</p>
        <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="size-5" checked={blocks.enabled !== false} onChange={(e) => setBlockAlerts({ ...blocks, enabled: e.target.checked })} /> Avisarme cuando empiece una actividad
        </label>
        {blocks.enabled !== false && (
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Cuándo avisar">
            {LEADS.map((l) => <button key={l.min} type="button" aria-pressed={leads.includes(l.min)} onClick={() => toggleLead(l.min)} className="min-h-11 rounded-full border px-4 text-sm" style={chip(leads.includes(l.min))}>{l.label}</button>)}
          </div>
        )}
      </fieldset>

      <fieldset className="mt-6">
        <legend className="text-sm font-semibold">Horas de silencio</legend>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>No te aviso en este rango, salvo lo que marques como “insistir hasta que lo confirme”.</p>
        <label className="mt-3 flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" className="size-5" checked={Boolean(quiet)} onChange={(e) => { const q = e.target.checked ? { start: 22 * 60, end: 7 * 60 } : null; setQuiet(q); saveQuiet(q) }} /> Activar
        </label>
        {quiet && (
          <div className="mt-2 grid max-w-sm grid-cols-2 gap-3">
            <label className="grid gap-2 text-sm">Desde<input type="time" className="field" value={fmtMin(quiet.start)} onChange={(e) => setQuietTime('start', e.target.value)} /></label>
            <label className="grid gap-2 text-sm">Hasta<input type="time" className="field" value={fmtMin(quiet.end)} onChange={(e) => setQuietTime('end', e.target.value)} /></label>
          </div>
        )}
        {tz && <p className="mt-3 text-xs" style={{ color: 'var(--ink-faint)' }}>Zona horaria: {tz}</p>}
      </fieldset>
    </section>
  )
}

export default function Settings({ onLock, onResetPin }: { onLock: () => void; onResetPin: () => void }) {
  const { session, signOut } = useAuth()
  return (
    <div>
      <h1 className="font-display text-4xl">Ajustes</h1>
      <div className="mt-8 grid gap-4">
        <Alerts />
        <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
          <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>Cuenta</p>
          <p className="mt-1 break-all">{session?.user.email}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-ghost" onClick={onLock}>Bloquear ahora</button>
          <button className="btn btn-ghost" onClick={onResetPin}>Cambiar PIN</button>
          <button className="btn btn-ghost" onClick={signOut}>Cerrar sesión</button>
        </div>
      </div>
    </div>
  )
}
