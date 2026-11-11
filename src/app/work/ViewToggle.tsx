import { Link } from 'react-router-dom'

/** Clientes y Trabajos son la misma lista vista de dos formas: por cliente o por mes. */
export default function ViewToggle({ now }: { now: 'cliente' | 'mes' }) {
  const opt = (id: 'cliente' | 'mes', label: string, to: string) => (
    <Link to={to} replace aria-current={now === id ? 'page' : undefined} className="min-h-10 rounded-full px-4 text-sm font-semibold grid place-items-center"
      style={{ background: now === id ? 'var(--tinta)' : 'transparent', color: now === id ? 'var(--fondo)' : 'var(--ink-soft)' }}>{label}</Link>
  )
  return <nav aria-label="Ver la lista" className="mb-4 inline-flex rounded-full p-1" style={{ background: 'var(--surface-2)' }}>{opt('cliente', 'Por cliente', '/app/trabajo')}{opt('mes', 'Por mes', '/app/trabajo/mes')}</nav>
}
