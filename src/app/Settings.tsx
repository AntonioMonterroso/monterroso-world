import { Bell, BellOff, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { bioLockEnrolled, bioLockSupported, enrollBioLock, removeBioLock } from '../lib/biolock'
import { disablePush, enablePush, loadSettings, pushStatus, saveBlockAlerts, saveQuiet, sendTest, type BlockAlerts, type PushStatus, type Quiet } from '../lib/push'
import { fmtMin, toMin } from '../lib/time'
import { Group, PageHeader, Row, Switch } from '../components/ui'
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

  const blocksOn = blocks.enabled !== false
  return (
    <>
      <Group title="Notificaciones" footer={msg ? <span role="status" style={{ color: 'var(--sky)' }}>{msg}</span> : undefined}>
        <Row icon={status === 'on' ? <Bell size={16} /> : <BellOff size={16} />} tone={status === 'on' ? 'var(--pos)' : 'var(--ink-faint)'} title="Avisos en este dispositivo" sub={<span aria-live="polite">{status ? notes[status] : 'Revisando…'}</span>} chevron={false}
          trailing={status === 'off' ? <button className="btn btn-primary !min-h-10" disabled={busy} onClick={() => run(enablePush, 'Listo. Este dispositivo recibirá avisos.')}>{busy && <Loader2 size={16} className="animate-spin" aria-hidden />} Activar</button> : status === 'on' ? <Switch checked label="Avisos en este dispositivo" onChange={() => run(disablePush, 'Avisos apagados en este dispositivo.')} /> : undefined} />
        {status === 'on' && <Row title="Enviar una prueba" chevron onClick={() => run(async () => { const n = await sendTest(); if (n === 0) throw new Error('No llegó a ningún dispositivo.') }, 'Prueba enviada. Debe llegar en unos segundos.')} />}
      </Group>

      <Group title="Horario" footer="Te aviso cuando empieza cada bloque de tu horario. Cada bloque se puede silenciar desde su edición.">
        <Row title="Avisar cuando empiece una actividad" chevron={false} trailing={<Switch checked={blocksOn} label="Avisar cuando empiece una actividad" onChange={(v) => setBlockAlerts({ ...blocks, enabled: v })} />} />
        {blocksOn && (
          <li className="row"><div className="row-hit !flex-wrap !gap-2" role="group" aria-label="Cuándo avisar">
            {LEADS.map((l) => <button key={l.min} type="button" aria-pressed={leads.includes(l.min)} onClick={() => toggleLead(l.min)} className="min-h-10 rounded-full px-4 text-sm" style={chip(leads.includes(l.min))}>{l.label}</button>)}
          </div></li>
        )}
      </Group>

      <Group title="Horas de silencio" footer={<>No te aviso en este rango, salvo lo que marques como “insistir hasta que lo confirme”.{tz && <> Zona horaria: {tz}.</>}</>}>
        <Row title="Silencio nocturno" chevron={false} trailing={<Switch checked={Boolean(quiet)} label="Silencio nocturno" onChange={(v) => { const q = v ? { start: 22 * 60, end: 7 * 60 } : null; setQuiet(q); saveQuiet(q) }} />} />
        {quiet && (
          <>
            <li className="row"><label className="row-hit"><span className="row-main"><span className="row-title">Desde</span></span><input type="time" className="row-input row-time" value={fmtMin(quiet.start)} onChange={(e) => setQuietTime('start', e.target.value)} /></label></li>
            <li className="row"><label className="row-hit"><span className="row-main"><span className="row-title">Hasta</span></span><input type="time" className="row-input row-time" value={fmtMin(quiet.end)} onChange={(e) => setQuietTime('end', e.target.value)} /></label></li>
          </>
        )}
      </Group>
    </>
  )
}

function BioLockRow() {
  const [ok, setOk] = useState(false)
  const [on, setOn] = useState(bioLockEnrolled())
  const [msg, setMsg] = useState('')
  useEffect(() => { bioLockSupported().then(setOk) }, [])
  if (!ok) return null
  const toggle = async (v: boolean) => {
    setMsg('')
    if (!v) { removeBioLock(); return setOn(false) }
    try { await enrollBioLock('Monterroso'); setOn(true) } catch { setMsg('No pude activarlo. Revisa que el teléfono tenga huella o Face ID configurados.') }
  }
  return <Row title="Abrir con huella o Face ID" sub={msg || 'En lugar de escribir el PIN en este dispositivo'} chevron={false} trailing={<Switch checked={on} onChange={(v) => void toggle(v)} label="Abrir con huella o Face ID" />} />
}

export default function Settings({ onLock, onResetPin }: { onLock: () => void; onResetPin: () => void }) {
  const { session, signOut } = useAuth()
  return (
    <div>
      <PageHeader title="Ajustes" />
      <Alerts />
      <Group title="Cuenta">
        <Row title={<span className="break-all">{session?.user.email}</span>} chevron={false} />
        <Row title="Bloquear ahora" onClick={onLock} />
        <Row title="Cambiar PIN" onClick={onResetPin} />
        <BioLockRow />
        <Row title={<span style={{ color: 'var(--neg)' }}>Cerrar sesión</span>} onClick={signOut} />
      </Group>
    </div>
  )
}
