export const ErrorBar = ({ msg, onClose }: { msg: string; onClose?: () => void }) => msg ? (
  <p role="alert" className="mt-3 flex items-center justify-between rounded-xl px-3 py-2 text-sm" style={{ background: 'color-mix(in oklab, #e8a393 15%, transparent)', color: '#e8a393' }}>{msg}{onClose && <button className="underline" onClick={onClose}>Cerrar</button>}</p>
) : null

export const Empty = ({ title, text, action, onAction }: { title: string; text: string; action?: string; onAction?: () => void }) => (
  <div className="empty">
    <h3>{title}</h3>
    <p>{text}</p>
    {action && <button className="btn btn-primary" onClick={onAction}>{action}</button>}
  </div>
)

/** Todo va en quetzales: el selector ya no se muestra. */
export const CurrencySelect = (_: { value: string; onChange: (v: string) => void }) => null

export const defaultCurrency = () => 'GTQ'
export const rememberCurrency = (_c: string) => {}

export const chip = (on: boolean, color = 'var(--accent)') => ({ borderColor: on ? `color-mix(in oklab, ${color} 50%, transparent)` : 'transparent', color: on ? color : 'var(--ink-soft)', background: on ? `color-mix(in oklab, ${color} 16%, transparent)` : 'var(--surface-2)' })

export const toNum = (v: string) => { const n = Number(v.replace(',', '.')); return Number.isFinite(n) ? n : NaN }
