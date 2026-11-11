import { Loader2, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import NewWork from './NewWork'
import RegistrarPago from '../../components/RegistrarPago'
import { useAllClientExtra } from '../../lib/clientNotes'
import { clientName } from '../../lib/clients'
import { Group, MonthStepper, PageHeader, Row } from '../../components/ui'
import { clientKey, groupClients } from '../../lib/clients'
import { currentMonth, money, statusMeta, useProjects } from '../../lib/projects'
import { Empty } from '../money/shared'

const STATE = { late: { tone: 'var(--aviso)', text: 'Atrasado' }, pending: { tone: 'var(--ink-faint)', text: 'Por cobrar' }, paid: { tone: 'var(--pos)', text: 'Pagó' }, none: { tone: 'var(--borde)', text: 'Sin mensualidad' } } as const

/** Trabajo por cliente: cada uno con el estado de su cobro del mes y su trabajo activo. */
export default function Clients() {
  const db = useProjects()
  const nav = useNavigate()
  const [sp, setSp] = useSearchParams()
  const [month, setMonth] = useState(currentMonth())
  const [q, setQ] = useState('')

  // Los enlaces viejos (/trabajo?abrir=id) abren ese trabajo en la vista por mes
  useEffect(() => { const id = sp.get('abrir'); if (id) { setSp({}, { replace: true }); nav(`/app/trabajo/mes?abrir=${id}`, { replace: true }) } }, [sp, nav, setSp])

  const list = useMemo(() => groupClients(db.projects, db.payments, month), [db.projects, db.payments, month])
  const shown = list.filter((c) => !q.trim() || clientKey(c.name).includes(clientKey(q)))
  const [creating, setCreating] = useState(false)
  const [payFor, setPayFor] = useState<string | null>(null)
  const [msg, setMsg] = useState('')
  const extras = useAllClientExtra()

  return (
    <div>
      <PageHeader eyebrow="Trabajo" title="Clientes" sub="Cada cliente con lo que te debe este mes y su trabajo activo." action={<button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={18} aria-hidden /> Trabajo</button>} />
      <MonthStepper month={month} onChange={setMonth} />
      {list.length > 6 && <label className="mb-4 grid gap-1 text-sm">Buscar cliente<input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre…" /></label>}
      {db.error && <p role="alert" className="mb-3 rounded-xl px-3 py-2 text-sm" style={{ background: 'var(--aviso-suave)', color: 'var(--aviso-texto)' }}>{db.error}</p>}
      {db.loading ? <div className="grid h-48 place-items-center"><Loader2 className="animate-spin" aria-label="Cargando" /></div> : shown.length === 0 ? (
        <Empty title="Aún no hay clientes" text="Agrega un trabajo con el nombre de tu cliente y aquí verás todo lo suyo junto: trabajos, cobros y propuestas." action="Agregar trabajo" onAction={() => setCreating(true)} />
      ) : (
        <Group>
          {shown.map((c) => {
            const s = STATE[c.state]
            const work = c.active[0]
            return (
              <Row key={c.key} tone={s.tone} title={c.name} to={`/app/trabajo/cliente/${encodeURIComponent(c.key)}`}
                sub={<>{extras[c.key]?.rubro && `${extras[c.key]!.rubro} · `}<span style={{ color: c.state === 'late' ? 'var(--aviso-texto)' : undefined }}>{s.text}</span>{c.fee > 0 && ` · ${money(c.fee)} al mes`}{work && ` · ${work.title} (${statusMeta(work.status).label.toLowerCase()})`}</>}
                value={c.owed > 0 ? money(c.owed) : undefined}
                trailing={<button className="btn btn-sec btn-chico" onClick={() => { setMsg(''); setPayFor(c.key) }} aria-label={`Registrar un pago de ${c.name}`}>Pago</button>} />
            )
          })}
        </Group>
      )}
      {msg && <p role="status" className="mt-4 rounded-xl px-4 py-3 text-sm" style={{ background: 'var(--personal-suave)', color: 'var(--personal-texto)' }}>{msg}</p>}
      <RegistrarPago open={Boolean(payFor)} projects={list.find((c) => c.key === payFor)?.projects ?? []} payments={db.payments} addPayment={db.addPayment} onClose={() => setPayFor(null)} onDone={setMsg} />
      <NewWork open={creating} month={month} add={(v) => db.add(v) as Promise<never>} onClose={() => setCreating(false)} onCreated={(p) => { setCreating(false); nav(`/app/trabajo/cliente/${encodeURIComponent(clientKey(clientName(p)))}?abrir=${p.id}`) }} />
    </div>
  )
}
