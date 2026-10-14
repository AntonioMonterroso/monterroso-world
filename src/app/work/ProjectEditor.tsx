import { motion } from 'motion/react'
import { ExternalLink, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Segmented } from '../../components/ui'
import { STATUSES, currentMonth, hasBilling, monthLabel, money, monthlyStates, setupPaid, type CheckTask, type NewPayment, type Payment, type Project, type Status } from '../../lib/projects'
import { localISO } from '../../lib/time'
import type { Account } from '../../lib/accounts'
import { useTable } from '../../lib/table'
import { AccountPick, lastAccount, rememberAccount } from '../money/AccountPick'

const ease = [0.23, 1, 0.32, 1] as const
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
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
  const [currency, setCurrency] = useState('GTQ')
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
  // instalación + mensualidad
  const [setupFee, setSetupFee] = useState('')
  const [monthlyFee, setMonthlyFee] = useState('')
  const [billDay, setBillDay] = useState('')
  const [mStart, setMStart] = useState('')
  const [mEnd, setMEnd] = useState('')
  const [account, setAccount] = useState('')
  const [tab, setTab] = useState<'datos' | 'cobros' | 'pendientes'>('datos')
  const [mode, setMode] = useState<'single' | 'recurring'>('single')
  const accountsDb = useTable<Account>('fin_accounts', { col: 'position', asc: true })
  const accounts = accountsDb.rows.filter((a) => !a.archived)

  useEffect(() => {
    if (!project) return
    setTitle(project.title); setClient(project.client ?? ''); setStatus(project.status); setMonth(project.month)
    setDue(project.due_date ?? ''); setAmount(project.amount ? String(project.amount) : ''); setCurrency(project.currency)
    setUrl(project.site_url ?? ''); setNotes(project.notes ?? ''); setChecklist(project.checklist)
    setSetupFee(project.setup_fee ? String(project.setup_fee) : ''); setMonthlyFee(project.monthly_fee ? String(project.monthly_fee) : ''); setBillDay(project.billing_day ? String(project.billing_day) : ''); setMStart(project.monthly_start ?? ''); setMEnd(project.monthly_end ?? ''); setAccount(project.account_id ?? lastAccount())
    setMode(hasBilling(project) ? 'recurring' : 'single'); setTab('datos')
    setItem(''); setConfirm(false); setErr(''); setPayAmount(''); setMethod(''); setPaidNow(true); setPayDate(localISO())
  }, [project?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const mine = project ? payments.filter((p) => p.project_id === project.id) : []
  const total = Number(amount) || 0
  // Lo que falta del monto del trabajo cuenta solo cobros sueltos; la instalación y las mensualidades van aparte
  const pending = Math.max(0, total - mine.filter((p) => p.paid_at && (p.kind ?? 'other') === 'other').reduce((x, p) => x + Number(p.amount), 0))

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!project) return
    if (!title.trim()) { setTab('datos'); return setErr('Ponle un nombre al trabajo.') }
    const n = mode === 'single' ? Number(amount || 0) : 0
    if (Number.isNaN(n) || n < 0) return setErr('El monto no es válido.')
    const sf = mode === 'recurring' ? Number(setupFee || 0) : 0, mf = mode === 'recurring' ? Number(monthlyFee || 0) : 0, bd = Number(billDay || 0)
    if ([sf, mf].some((x) => Number.isNaN(x) || x < 0)) return setErr('La instalación o la mensualidad no son válidas.')
    if (mode === 'recurring' && sf === 0 && mf === 0) { setTab('cobros'); return setErr('Pon el monto de la instalación o el de la mensualidad.') }
    if (mf > 0 && !mStart) { setTab('cobros'); return setErr('Elige desde qué mes se cobra la mensualidad.') }
    if (mf > 0 && !(bd >= 1 && bd <= 28)) { setTab('cobros'); return setErr('El día de cobro va del 1 al 28.') }
    if (mEnd && mStart && mEnd < mStart) return setErr('El último mes no puede ser antes del primero.')
    rememberAccount(account)
    onSave(project.id, { setup_fee: sf, monthly_fee: mf, billing_day: mf > 0 ? bd : null, monthly_start: mf > 0 ? mStart : null, monthly_end: mf > 0 && mEnd ? mEnd : null, account_id: account || null, title: title.trim(), client: client.trim() || null, status, month: month || project.month, due_date: due || null, amount: n, currency, site_url: url.trim() || null, notes: notes.trim() || null, checklist })
  }

  const addPay = () => {
    const n = Number(payAmount)
    if (!project || !n || n <= 0) return setErr('Escribe el monto del cobro.')
    setErr('')
    rememberAccount(account)
    onAddPayment({ project_id: project.id, amount: n, due_date: paidNow ? null : payDate, paid_at: paidNow ? payDate : null, method: method.trim() || null, note: null, kind: 'other', period: null, account_id: account || null })
    setPayAmount(''); setMethod('')
  }

  // Cobros que toca hacer según lo ya guardado: instalación y mensualidades hasta este mes
  const states = project ? monthlyStates(project, payments, currentMonth()).reverse() : []
  const setupDue = project && Number(project.setup_fee ?? 0) > 0 && !setupPaid(project, payments)
  const collect = (kind: 'setup' | 'monthly', amount: number, period: string | null) => {
    if (!project) return
    rememberAccount(account)
    onAddPayment({ project_id: project.id, amount, due_date: null, paid_at: localISO(), method: null, note: null, kind, period, account_id: account || null })
  }

  // ¿Cambiaste algo de lo que se cobra y aún no guardas? Entonces la lista de "por cobrar" espera al guardado
  const dirty = project ? (mode === 'recurring') !== hasBilling(project) || (mode === 'single' ? (Number(amount) || 0) !== Number(project.amount) : (Number(setupFee) || 0) !== Number(project.setup_fee ?? 0) || (Number(monthlyFee) || 0) !== Number(project.monthly_fee ?? 0) || (Number(billDay) || 0) !== Number(project.billing_day ?? 0) || mStart !== (project.monthly_start ?? '') || mEnd !== (project.monthly_end ?? '')) : false
  const collected = mine.filter((p) => p.paid_at).reduce((x, p) => x + Number(p.amount), 0)
  const todo = (setupDue ? 1 : 0) + states.filter((x) => !x.paid).length

  const fieldStyle = { borderColor: 'var(--line)', background: 'var(--bg)' }
  return (
    <>
      {project && (
        <motion.div className="fixed inset-0 z-40 grid items-end justify-items-center md:items-center" style={{ background: 'rgba(5,10,24,.6)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} onMouseDown={onClose}>
          <motion.form role="dialog" aria-modal="true" aria-label="Trabajo" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}
            className="sheet-max w-full max-w-xl overflow-auto rounded-t-3xl border p-5 md:rounded-3xl"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
            initial={{ transform: 'translateY(40px)', opacity: 0 }} animate={{ transform: 'translateY(0px)', opacity: 1 }} transition={{ duration: 0.28, ease }}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">{title.trim() || 'Trabajo'}</h2>
              <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full" aria-label="Cerrar"><X size={20} aria-hidden /></button>
            </div>

            <div className="mt-3"><Segmented label="Sección del trabajo" value={tab} onChange={setTab} options={[{ id: 'datos', label: 'Datos' }, { id: 'cobros', label: todo > 0 && !dirty ? `Cobros · ${todo} por cobrar` : 'Cobros' }, { id: 'pendientes', label: checklist.length ? `Pendientes ${checklist.filter((c) => !c.done).length}` : 'Pendientes' }]} /></div>

            {tab === 'datos' && (
              <div className="mt-4 grid gap-4">
                <label className="grid gap-2 text-sm">Nombre<input className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></label>
                <label className="grid gap-2 text-sm">Cliente<input className="field" value={client} onChange={(e) => setClient(e.target.value)} maxLength={200} /></label>
                <fieldset>
                  <legend className="mb-2 text-sm">¿En qué etapa va?</legend>
                  <div className="flex flex-wrap gap-2">
                    {STATUSES.map((st) => (
                      <button key={st.id} type="button" aria-pressed={status === st.id} onClick={() => setStatus(st.id)} className="min-h-11 rounded-full border px-3 text-sm"
                        style={{ borderColor: status === st.id ? st.color : 'var(--line)', color: status === st.id ? st.color : 'var(--ink-soft)', background: status === st.id ? `color-mix(in oklab, ${st.color} 14%, transparent)` : 'transparent' }}>{st.label}</button>
                    ))}
                  </div>
                </fieldset>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-2 text-sm">Fecha de entrega<input type="date" className="field" value={due} onChange={(e) => setDue(e.target.value)} /></label>
                  <label className="grid gap-2 text-sm">Mes en que cuenta<input type="month" className="field" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
                </div>
                <label className="grid gap-2 text-sm">Sitio o enlace<input className="field" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={500} placeholder="https://" /></label>
                {url.trim() && /^https?:\/\//i.test(url.trim()) && <a href={url.trim()} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-sm underline" style={{ color: 'var(--sky)' }}><ExternalLink size={14} aria-hidden /> Abrir sitio</a>}
                <label className="grid gap-2 text-sm">Notas<textarea className="field py-3" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} /></label>
              </div>
            )}

            {tab === 'cobros' && (
              <div className="mt-4 grid gap-5">
                {/* 1 · Cómo cobras */}
                <section aria-labelledby="como">
                  <h3 id="como" className="text-sm font-semibold">1 · ¿Cómo cobras este trabajo?</h3>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2" role="group" aria-label="Forma de cobro">
                    {([['single', 'Un solo precio', 'Un monto total, que puedes cobrar en abonos.'], ['recurring', 'Instalación + mensualidad', 'Un cobro al inicio y una cuota cada mes.']] as const).map(([v, t, d]) => (
                      <button key={v} type="button" aria-pressed={mode === v} onClick={() => setMode(v)} className="rounded-2xl border p-3 text-left" style={{ borderColor: mode === v ? 'var(--accent)' : 'var(--line)', background: mode === v ? 'color-mix(in oklab, var(--accent) 10%, var(--bg))' : 'var(--bg)' }}>
                        <span className="block text-sm font-semibold" style={{ color: mode === v ? 'var(--accent)' : 'var(--ink)' }}>{t}</span>
                        <span className="mt-0.5 block text-xs" style={{ color: 'var(--ink-faint)' }}>{d}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {mode === 'single' ? (
                      <label className="col-span-2 grid gap-2 text-sm">Precio total<input className="field" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(',', '.'))} placeholder="0.00" /></label>
                    ) : (
                      <>
                        <label className="grid gap-2 text-sm">Instalación o inscripción<input className="field" inputMode="decimal" value={setupFee} onChange={(e) => setSetupFee(e.target.value.replace(',', '.'))} placeholder="0.00 (una vez)" /></label>
                        <label className="grid gap-2 text-sm">Mensualidad<input className="field" inputMode="decimal" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value.replace(',', '.'))} placeholder="0.00 (cada mes)" /></label>
                        {Number(monthlyFee) > 0 && <>
                          <label className="grid gap-2 text-sm">Cobras el día<input className="field" inputMode="numeric" value={billDay} onChange={(e) => setBillDay(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="1 al 28" /></label>
                          <label className="grid gap-2 text-sm">Desde el mes<input type="month" className="field" value={mStart} onChange={(e) => setMStart(e.target.value)} /></label>
                          <label className="col-span-2 grid gap-2 text-sm">Hasta el mes (si tiene final)<input type="month" className="field" value={mEnd} onChange={(e) => setMEnd(e.target.value)} /></label>
                        </>}
                      </>
                    )}
                  </div>
                </section>

                {/* 2 · A dónde cae */}
                <section aria-labelledby="donde">
                  <h3 id="donde" className="text-sm font-semibold">2 · ¿A qué cuenta te llega?</h3>
                  <div className="mt-2"><AccountPick accounts={accounts} value={account} onChange={setAccount} label="Elige una; sube el saldo de esa cuenta al cobrar" none="Sin cuenta" /></div>
                  {accounts.length === 0 && <p className="mt-1 text-xs" style={{ color: 'var(--ink-faint)' }}>Aún no tienes cuentas. Créalas en Dinero → Cuentas para que los cobros sumen a tu saldo.</p>}
                </section>

                {/* 3 · Qué toca cobrar */}
                <section aria-labelledby="toca">
                  <h3 id="toca" className="text-sm font-semibold">3 · Lo que toca cobrar</h3>
                  {dirty ? (
                    <div className="mt-2 rounded-2xl border p-4 text-sm" style={{ ...fieldStyle, color: 'var(--ink-soft)' }}>
                      Cambiaste cómo cobras este trabajo. <strong style={{ color: 'var(--ink)' }}>Guarda</strong> para ver aquí lo que toca cobrar.
                    </div>
                  ) : (
                    <>
                      <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>Cobrado <strong style={{ color: 'var(--pos)' }}>{money(collected, currency)}</strong>{mode === 'single' && total > 0 && <> · Falta <strong style={{ color: 'var(--personal)' }}>{money(pending, currency)}</strong></>}</p>
                      {(setupDue || states.some((x) => !x.paid)) && project && (
                        <ul className="mt-2 grid gap-2">
                          {setupDue && (
                            <li className="flex items-center gap-2 rounded-xl px-3" style={{ background: 'var(--bg)' }}>
                              <span className="flex-1 py-2 text-sm"><span className="font-semibold">Instalación</span> <span style={{ color: 'var(--ink-faint)' }}>{money(Number(project.setup_fee), project.currency)}</span></span>
                              <button type="button" className="btn btn-tint min-h-11" onClick={() => collect('setup', Number(project.setup_fee), null)}>Ya la cobré</button>
                            </li>
                          )}
                          {states.filter((x) => !x.paid).slice(0, 12).map((x) => (
                            <li key={x.period} className="flex items-center gap-2 rounded-xl px-3" style={{ background: 'var(--bg)' }}>
                              <span className="flex-1 py-2 text-sm"><span className="font-semibold">{cap(monthLabel(x.period))}</span> <span style={{ color: x.late ? 'var(--neg)' : 'var(--ink-faint)' }}>{x.late ? 'atrasada' : 'próxima'} · {money(Number(project.monthly_fee), project.currency)}</span></span>
                              <button type="button" className="btn btn-tint min-h-11" onClick={() => collect('monthly', Number(project.monthly_fee), x.period)}>Ya la cobré</button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {!setupDue && !states.some((x) => !x.paid) && mode === 'recurring' && <p className="mt-2 text-sm" style={{ color: 'var(--pos)' }}>Todo al día. ✓</p>}

                      {mine.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-xs font-semibold" style={{ color: 'var(--ink-faint)' }}>YA COBRADO</h4>
                          <ul className="mt-2 grid gap-2">
                            {mine.map((pay) => (
                              <li key={pay.id} className="flex items-center gap-2 rounded-xl px-3" style={{ background: 'var(--bg)' }}>
                                <div className="min-w-0 flex-1 py-2 text-sm">
                                  <span className="font-semibold">{money(pay.amount, currency)}</span>
                                  <span className="ml-2" style={{ color: 'var(--ink-faint)' }}>{pay.kind === 'setup' ? 'instalación' : pay.kind === 'monthly' && pay.period ? cap(monthLabel(pay.period)) : 'abono'}</span>
                                  <span className="ml-2" style={{ color: pay.paid_at ? 'var(--pos)' : 'var(--personal)' }}>{pay.paid_at ? `cobrado ${pay.paid_at}` : pay.due_date ? `esperado ${pay.due_date}` : 'pendiente'}</span>
                                  {pay.method && <span className="ml-2" style={{ color: 'var(--ink-faint)' }}>{pay.method}</span>}
                                </div>
                                {!pay.paid_at && <button type="button" className="min-h-11 px-2 text-sm underline" onClick={() => onUpdatePayment(pay.id, { paid_at: localISO() })}>Marcar cobrado</button>}
                                <button type="button" className="grid size-11 place-items-center" aria-label="Eliminar cobro" onClick={() => onRemovePayment(pay.id)}><Trash2 size={16} aria-hidden /></button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <details className="mt-3 rounded-2xl border p-3" style={fieldStyle}>
                        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">Registrar otro cobro o abono</summary>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <input className="field" inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value.replace(',', '.'))} placeholder={pending > 0 && mode === 'single' ? String(pending) : 'Monto'} aria-label="Monto del cobro" />
                          <input type="date" className="field" value={payDate} onChange={(e) => setPayDate(e.target.value)} aria-label={paidNow ? 'Fecha de cobro' : 'Fecha esperada'} />
                          <input className="field" value={method} onChange={(e) => setMethod(e.target.value)} maxLength={60} placeholder="Cómo te pagaron" aria-label="Método" />
                          <label className="flex min-h-12 items-center gap-2 text-sm"><input type="checkbox" className="size-5" checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} /> Ya lo cobré</label>
                        </div>
                        <button type="button" className="btn btn-ghost mt-2" onClick={addPay}><Plus size={16} aria-hidden /> Agregar</button>
                      </details>
                    </>
                  )}
                </section>
              </div>
            )}

            {tab === 'pendientes' && (
              <fieldset className="mt-4">
                <legend className="mb-2 text-sm">Lo que falta hacer en este trabajo</legend>
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
            )}

            {err && <p role="alert" className="mt-3 text-sm" style={{ color: 'var(--neg)' }}>{err}</p>}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button className="btn btn-primary">Guardar</button>
              <button type="button" className="btn btn-ghost ml-auto" style={{ color: confirm ? 'var(--neg)' : undefined }} onClick={() => (confirm ? onDelete(project.id) : setConfirm(true))}><Trash2 size={16} aria-hidden /> {confirm ? '¿Seguro? Se borran sus cobros' : 'Eliminar'}</button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </>
  )
}
