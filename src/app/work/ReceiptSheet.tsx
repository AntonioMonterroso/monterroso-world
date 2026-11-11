import { ArrowLeft, Loader2, Printer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import type { Account } from '../../lib/accounts'
import { clientName } from '../../lib/clients'
import { monthLabel, money, useProjects, workKindLabel, type WorkTx } from '../../lib/projects'
import { useTable } from '../../lib/table'

const base = import.meta.env.BASE_URL
const fmt = (iso: string) => new Date(iso.slice(0, 10) + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })

/** Recibo de un pago recibido, listo para imprimir o guardar como PDF y mandarle al cliente. */
export default function ReceiptSheet() {
  const { id = '' } = useParams()
  const db = useProjects()
  const accounts = useTable<Account>('fin_accounts', { col: 'position', asc: true })
  const pay = db.payments.find((x) => x.id === id)
  const proj = db.projects.find((p) => p.id === pay?.project_id)
  if (db.loading) return <main className="grid min-h-dvh place-items-center" style={{ background: '#e9e6df' }}><Loader2 className="animate-spin" aria-label="Cargando" /></main>
  if (!pay || !proj || !pay.paid_at) return <main className="grid min-h-dvh place-items-center px-6 text-center"><p>No encuentro ese pago. <Link className="underline" to="/app/trabajo">Volver a Trabajo</Link></p></main>
  const concept = workKindLabel({ project_id: proj.id, title: proj.title, kind: pay.kind ?? 'other', period: pay.period ?? null } as WorkTx['work'])
  const acct = accounts.rows.find((a) => a.id === pay.account_id)?.name
  const num = `R-${pay.paid_at.slice(0, 4)}-${pay.id.replace(/-/g, '').slice(0, 5).toUpperCase()}`
  const back = `/app/trabajo/cliente/${encodeURIComponent(clientName(proj).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim())}`
  return (
    <main className="min-h-dvh px-3 py-6 print:p-0" style={{ background: '#e9e6df' }}>
      <div className="no-print mx-auto mb-4 flex max-w-[820px] items-center justify-between gap-3">
        <Link to={back} className="inline-flex min-h-11 items-center gap-1 text-sm" style={{ color: '#333' }}><ArrowLeft size={16} aria-hidden /> Cliente</Link>
        <button className="btn btn-primary" onClick={() => window.print()}><Printer size={16} aria-hidden /> Imprimir o guardar PDF</button>
      </div>
      <article className="qd" aria-label={`Recibo ${num}`}>
        <header className="qd-head">
          <div className="qd-brand"><img src={`${base}brand/am-logo-black.png`} alt="" width={64} height={52} /><div><strong>Antonio Monterroso</strong><span>Desarrollo web</span></div></div>
          <div className="qd-meta"><strong>Recibo</strong><span>{num}</span><span>{fmt(pay.paid_at)}</span></div>
        </header>
        <p className="qd-kicker">Recibo de pago</p>
        <h1 className="qd-title">{money(pay.amount)}</h1>
        <p className="qd-for">Recibido de: <strong>{clientName(proj)}</strong></p>
        <section className="qd-sec">
          <h2>Detalle</h2>
          <table className="qd-table">
            <tbody>
              <tr><td>Concepto</td><td className="r"><strong>{concept}</strong></td></tr>
              <tr><td>Trabajo</td><td className="r">{proj.title}</td></tr>
              {pay.period && <tr><td>Período</td><td className="r">{monthLabel(pay.period)}</td></tr>}
              <tr><td>Fecha de pago</td><td className="r">{fmt(pay.paid_at)}</td></tr>
              {acct && <tr><td>Medio</td><td className="r">{acct}</td></tr>}
              {pay.note && <tr><td>Nota</td><td className="r">{pay.note}</td></tr>}
              <tr><td><strong>Total recibido</strong></td><td className="r"><strong>{money(pay.amount)}</strong></td></tr>
            </tbody>
          </table>
        </section>
        <p className="qd-p">Gracias por tu pago. Este recibo confirma que el monto indicado fue recibido.</p>
        <div className="qd-sign"><div><span className="line" /><span>Recibí conforme · Antonio Monterroso</span></div><div><span className="line" /><span>{clientName(proj)}</span></div></div>
      </article>
    </main>
  )
}
