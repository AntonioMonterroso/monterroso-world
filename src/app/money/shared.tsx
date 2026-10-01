import { CURRENCIES } from '../../lib/projects'

export const ErrorBar = ({ msg, onClose }: { msg: string; onClose?: () => void }) => msg ? (
  <p role="alert" className="mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, #e8a393 15%, transparent)', color: '#e8a393' }}>{msg}{onClose && <button className="underline" onClick={onClose}>Cerrar</button>}</p>
) : null

export const Empty = ({ title, text, action, onAction }: { title: string; text: string; action?: string; onAction?: () => void }) => (
  <div className="mt-8 rounded-2xl border px-6 py-10 text-center" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
    <p className="font-display text-2xl">{title}</p>
    <p className="mx-auto mt-2 max-w-sm text-sm" style={{ color: 'var(--ink-soft)' }}>{text}</p>
    {action && <button className="btn btn-primary mt-5" onClick={onAction}>{action}</button>}
  </div>
)

export const CurrencySelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <label className="grid gap-2 text-sm">Moneda
    <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
  </label>
)

export const defaultCurrency = () => { try { return localStorage.getItem('mw_cur') || 'USD' } catch { return 'USD' } }
export const rememberCurrency = (c: string) => { try { localStorage.setItem('mw_cur', c) } catch { /* sin almacenamiento */ } }

export const chip = (on: boolean, color = 'var(--accent)') => ({ borderColor: on ? color : 'var(--line)', color: on ? color : 'var(--ink-soft)', background: on ? `color-mix(in oklab, ${color} 14%, transparent)` : 'transparent' })

export const toNum = (v: string) => { const n = Number(v.replace(',', '.')); return Number.isFinite(n) ? n : NaN }
