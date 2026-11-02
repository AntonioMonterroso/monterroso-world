import { Bell, BellOff, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import { getSettings, patchSettings } from '../lib/settings'
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
  const [words, setWords] = useState<Record<string, { category?: string }>>({})
  useEffect(() => { void getSettings().then((s) => setWords(((s as { anotarWords?: Record<string, { category?: string }> }).anotarWords) ?? {})) }, [])
  const forget = (w: string) => { const next = { ...words }; delete next[w]; setWords(next); void patchSettings({ anotarWords: next } as never) }
  const learned = Object.entries(words)
  return (
    <div>
      <PageHeader title="Ajustes" sub="De lo que más tocas a lo que menos." />
      <Group title="Seguridad">
        <Row title="Bloquear ahora" onClick={onLock} />
        <Row title="Cambiar PIN" onClick={onResetPin} />
        <BioLockRow />
      </Group>
      <Alerts />
      <Group title="Mi día" footer="Los hábitos mínimos son los únicos que se ven en Día suave.">
        <Row title="Hábitos mínimos de Día suave" sub="Elige cuáles cuentan cuando tu energía está baja" to="/app/mente" />
        <Row title="Rutinas y sus horarios" to="/app/mente/rutinas" />
      </Group>
      <Group title="Áreas y categorías">
        <Row title="Áreas y categorías" sub="Crear, renombrar, elegir color y ocultar" to="/app/dinero/categorias" />
      </Group>
      <Group title="Anotar" footer={learned.length ? 'Lo que Anotar aprendió de ti. Quita una palabra si se equivocó.' : 'Cuando cambies la categoría de un gasto en Anotar, aprenderá la palabra y aparecerá aquí.'}>
        {learned.length === 0 ? <Row title="Aún no ha aprendido palabras" chevron={false} /> : learned.map(([w, v]) => <Row key={w} title={w} sub={`va a ${v.category ?? '—'}`} chevron={false} trailing={<button className="min-h-11 px-3 text-sm underline" onClick={() => forget(w)}>Olvidar</button>} />)}
      </Group>
      <Group title="Apariencia">
        <Row title="Claro, oscuro y paletas" sub="Elige cómo se ve" to="/app/ajustes/apariencia" />
      </Group>
      <Group title="Cuenta">
        <Row title={<span className="break-all">{session?.user.email}</span>} chevron={false} />
        <Row title="Cerrar sesión" onClick={signOut} />
      </Group>
    </div>
  )
}
