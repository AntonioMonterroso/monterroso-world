import { AnimatePresence, motion } from 'motion/react'
import { ExternalLink, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CURRENCIES, STATUSES, money, receivedOf, type CheckTask, type NewPayment, type Payment, type Project, type Status } from '../../lib/projects'
import { localISO } from '../../lib/time'

const ease = [0.23, 1, 0.32, 1] as const
const uid = () => crypto.randomUUID().slice(0, 8)

type Props = {
  project: Project | null
  payments: Payment[]
  onClose: () => void
  onSave: (id: string, patch: Partial<Omit<Project, 'id'>>) => void
  onDelete: (id: string) => void
  onAddPayment: (v: NewPayment) => void
  onUpdatePayment: (id: string, patch: Partial<NewPayment>) => void
  onRemovePayment: (id: string) => void
}

export default function ProjectEditor({ project, payments, onClose, onSave, onDelete, onAddPayment, onUpdatePayment, onRemovePayment }: Props) {
  const [title, setTitle] = useState('')
  const [client, setClient] = useState('')
  const [status, setStatus] = useState<Status>('active')
  const [month, setMonth] = useState('')
  const [due, setDue] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [checklist, setChecklist] = useState<CheckTask[]>([])
  const [item, setItem] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [err, setErr] = useState('')
  // nuevo cobro
  const [payAmount, setPayAmount] = useState('')
  const [payDate, setPayDate] = useState(localISO())
  const [paidNow, setPaidNow] = useState(true)
  const [method, setMethod] = useState('')

  useEffect(() => {
    if (!project) return
    setTitle(project.title); setClient(project.client ?? ''); setStatus(project.status); setMonth(project.month)
    setDue(project.due_date ?? ''); setAmount(project.amount ? String(project.amount) : ''); setCurrency(project.currency)
    setUrl(project.site_url ?? ''); setNotes(project.notes ?? ''); setChecklist(project.checklist)
    setItem(''); setConfirm(false); setErr(''); setPayAmount(''); setMethod(''); setPaidNow(true); setPayDate(localISO())
  }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const mine = project ? payments.filter((p) => p.project_id === project.id) : []
  const total = Number(amount) || 0
  const received = project ? receivedOf({ ...project }, payments) : 0
  const pending = Math.max(0, total - received)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return
    if (!title.trim()) return setErr('Ponle un nombre al trabajo.')
    const n = Number(amount || 0)
    if (Number.isNaN(n) || n < 0) return setErr('El monto no es válido.')
    onSave(project.id, { title: title.trim(), client: client.trim() || null, status, month: month || project.month, due_date: due || null, amount: n, currency, site_url: url.trim() || null, notes: notes.trim() || null, checklist })
  }

  const addPay = () => {
    const n = Number(payAmount)
    if (!project || !n || n <= 0) return setErr('Escribe el monto del cobro.')
    setErr('')
    onAddPayment({ project_id: project.id, amount: n, due_date: paidNow ? null : payDate, paid_at: paidNow ? payDate : null, method: method.trim() || null, note: null })
    setPayAmount(''); setMethod('')
  }

  return (
    <AnimatePresence>
      {project && (
        <motion.div className="fixed inset-0 z-40 grid items-end justify-items-center md:items-center" style={{ background: 'rgba(5,10,24,.6)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onMouseDown={onClose}>
          <motion.form role="dialog" aria-modal="true" aria-label="Trabajo" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}
            className="max-h-[94dvh] w-full max-w-xl overflow-auto rounded-t-3xl border p-5 md:rounded-3xl"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
            initial={{ transform: 'translateY(40px)', opacity: 0 }} animate={{ transform: 'translateY(0px)', opacity: 1 }} exit={{ transform: 'translateY(40px)', opacity: 0 }} transition={{ duration: 0.28, ease }}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">Trabajo</h2>
              <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full" aria-label="Cerrar"><X size={20} aria-hidden /></button>
            </div>

            <div className="mt-4 grid gap-4">
              <label className="grid gap-2 text-sm">Nombre<input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></label>
              <label className="grid gap-2 text-sm">Cliente<input className="field" value={client} onChange={(e) => setClient(e.target.value)} maxLength={200} /></label>

              <fieldset>
                <legend className="mb-2 text-sm">Etapa</legend>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map((s) => (
                    <button key={s.id} type="button" aria-pressed={status === s.id} onClick={() => setStatus(s.id)} className="min-h-11 rounded-full border px-3 text-sm"
                      style={{ borderColor: status === s.id ? s.color : 'var(--line)', color: status === s.id ? s.color : 'var(--ink-soft)', background: status === s.id ? `color-mix(in oklab, ${s.color} 14%, transparent)` : 'transparent' }}>{s.label}</button>
                  ))}
                </div>
              </fieldset>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2 text-sm">Mes<input type="month" className="field" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
                <label className="grid gap-2 text-sm">Entrega<input type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} /></label>
                <label className="grid gap-2 text-sm">Monto total<input className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(',', '.'))} placeholder="0.00" /></label>
                <label className="grid gap-2 text-sm">Moneda
                  <select className="field" value={currency} onChange={(e) => setCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
                </label>
              </div>

              <label className="grid gap-2 text-sm">Sitio o enlace<input className="field" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={500} placeholder="https://" /></label>
              {url.trim() && /^https?:\/\//i.test(url.trim()) && <a href={url.trim()} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm underline" style={{ color: 'var(--sky)' }}><ExternalLink size={14} aria-hidden /> Abrir sitio</a>}

              <fieldset>
                <legend className="mb-2 text-sm">Pendientes del trabajo</legend>
                <ul className="grid gap-1">
                  {checklist.map((c) => (
                    <li key={c.id} className="flex items-center gap-2">
                      <label className="flex min-h-11 flex-1 items-center gap-3 text-sm">
                        <input type="checkbox" className="size-5" checked={c.done} onChange={() => setChecklist(checklist.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)))} />
                        <span style={{ textDecoration: c.done ? 'line-through' : 'none', color: c.done ? 'var(--ink-faint)' : 'var(--ink)' }}>{c.text}</span>
                      </label>
                      <button type="button" className="grid size-11 place-items-center" aria-label={`Quitar ${c.text}`} onClick={() => setChecklist(checklist.filter((x) => x.id !== c.id))}><X size={16} aria-hidden /></button>
                    </li>
                  ))}
                </ul>
                <div className="mt-1 flex gap-2">
                  <input className="field" value={item} maxLength={160} onChange={(e) => setItem(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (item.trim()) { setChecklist([...checklist, { id: uid(), text: item.trim(), done: false }]); setItem('') } } }} placeholder="Diseño, dominio, entrega…" aria-label="Nuevo pendiente" />
                  <button type="button" className="btn btn-ghost shrink-0" aria-label="Agregar pendiente" onClick={() => { if (item.trim()) { setChecklist([...checklist, { id: uid(), text: item.trim(), done: false }]); setItem('') } }}><Plus size={18} aria-hidden /></button>
                </div>
              </fieldset>

              <section aria-labelledby="cobros" className="rounded-2xl border p-4" style={{ borderColor: 'var(--line)', background: 'var(--bg)' }}>
                <h3 id="cobros" className="font-display text-xl">Cobros</h3>
                <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
                  Cobrado <strong style={{ color: '#8fd1a4' }}>{money(received, currency)}</strong> · Por cobrar <strong style={{ color: 'var(--personal)' }}>{money(pending, currency)}</strong>
                </p>
                <ul className="mt-3 grid gap-2">
                  {mine.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 rounded-xl px-3" style={{ background: 'var(--surface)' }}>
                      <div className="min-w-0 flex-1 py-2 text-sm">
                        <span className="font-semibold">{money(p.amount, currency)}</span>
                        <span className="ml-2" style={{ color: p.paid_at ? '#8fd1a4' : 'var(--personal)' }}>{p.paid_at ? `cobrado ${p.paid_at}` : p.due_date ? `esperado ${p.due_date}` : 'pendiente'}</span>
                        {p.method && <span className="ml-2" style={{ color: 'var(--ink-faint)' }}>{p.method}</span>}
                      </div>
                      {!p.paid_at && <button type="button" className="min-h-11 px-2 text-sm underline" onClick={() => onUpdatePayment(p.id, { paid_at: localISO() })}>Marcar cobrado</button>}
                      <button type="button" className="grid size-11 place-items-center" aria-label="Eliminar cobro" onClick={() => onRemovePayment(p.id)}><Trash2 size={16} aria-hidden /></button>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <input className="field" inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value.replace(',', '.'))} placeholder={pending > 0 ? String(pending) : 'Monto'} aria-label="Monto del cobro" />
                  <input type="date" className="field" value={payDate} onChange={(e) => setPayDate(e.target.value)} aria-label={paidNow ? 'Fecha de cobro' : 'Fecha esperada'} />
                  <input className="field" value={method} onChange={(e) => setMethod(e.target.value)} maxLength={60} placeholder="Método (transferencia…)" aria-label="Método" />
                  <label className="flex min-h-12 items-center gap-2 text-sm"><input type="checkbox" className="size-5" checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} /> Ya lo cobré</label>
                </div>
                <button type="button" className="btn btn-ghost mt-3" onClick={addPay}><Plus size={16} aria-hidden /> Agregar cobro</button>
              </section>

              <label className="grid gap-2 text-sm">Notas<textarea className="field py-3" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} /></label>
            </div>

            {err && <p role="alert" className="mt-3 text-sm" style={{ color: '#e8a393' }}>{err}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? '#e8a393' : undefined }} onClick={() => (confirm ? onDelete(project.id) : setConfirm(true))}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro? Se borran sus cobros' : 'Eliminar'}</button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
