import { useState } from 'react'
import ClientField from '../../components/ClientField'
import NewItem from '../../components/NewItem'
import type { NewProject, Project } from '../../lib/projects'

/** Nuevo trabajo: pide el cliente y el nombre, y solo lo crea cuando confirmas. */
export default function NewWork({ open, month, client, add, onClose, onCreated }: {
  open: boolean
  month: string
  /** Si ya sabes de qué cliente es (desde su ficha), no se pregunta. */
  client?: string
  add: (v: NewProject) => Promise<Project | null>
  onClose: () => void
  onCreated: (p: Project) => void
}) {
  const [who, setWho] = useState('')
  return (
    <NewItem open={open} title="Nuevo trabajo" label="¿Cómo se llama el trabajo?" placeholder="Página web, sistema de citas, mantenimiento…" confirm="Crear trabajo"
      hint="Después llenas el monto, la entrega y el acuerdo de cobro." onClose={() => { setWho(''); onClose() }}
      extra={client ? <p className="text-sm">Cliente: <strong>{client}</strong></p> : <ClientField value={who} onChange={setWho} />}
      onCreate={async (title) => {
        const p = await add({ title, client: (client ?? who).trim() || null, status: 'active', month, due_date: null, amount: 0, currency: 'GTQ', site_url: null, notes: null, checklist: [], setup_fee: 0, monthly_fee: 0, billing_day: null, monthly_start: null, monthly_end: null, account_id: null } as NewProject)
        if (!p) throw new Error('no creado')
        setWho(''); onCreated(p)
      }} />
  )
}
