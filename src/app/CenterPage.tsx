import { Navigate, useParams } from 'react-router-dom'
import { centerById } from '../lib/modules'

export default function CenterPage() {
  const { center } = useParams()
  const c = centerById(center ?? '')
  if (!c) return <Navigate to="/app" replace />
  return (
    <div className={`tone-${c.tone}`}>
      <p className="eyebrow" style={{ color: 'var(--tone)' }}>Centro</p>
      <h1 className="mt-2 flex items-center gap-3 font-display text-4xl"><c.icon size={32} aria-hidden style={{ color: 'var(--tone)' }} /> {c.label}</h1>
      <p className="mt-3 max-w-md" style={{ color: 'var(--ink-soft)' }}>{c.blurb}</p>
      <ul className="mt-8 grid gap-2 sm:grid-cols-2">
        {c.modules.map((m) => (
          <li key={m} className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
            <span>{m}</span>
            <span className="rounded-full px-2 py-0.5 text-xs" style={{ background: 'var(--surface-2)', color: 'var(--ink-faint)' }}>Pronto</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
