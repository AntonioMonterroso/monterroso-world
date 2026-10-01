import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { centers } from '../lib/modules'

export default function More() {
  return (
    <div>
      <h1 className="font-display text-4xl">Todo Monterroso World</h1>
      <ul className="mt-6 grid gap-3">
        {centers.map((c) => (
          <li key={c.id}>
            <Link to={c.id === 'hoy' ? '/app' : `/app/${c.id}`} className={`tone-${c.tone} flex min-h-14 items-center gap-4 rounded-xl border px-4`} style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
              <c.icon size={22} aria-hidden style={{ color: 'var(--tone)' }} />
              <span><span className="block font-semibold">{c.label}</span><span className="block text-sm" style={{ color: 'var(--ink-soft)' }}>{c.blurb}</span></span>
            </Link>
          </li>
        ))}
        <li>
          <Link to="/app/ajustes" className="flex min-h-14 items-center gap-4 rounded-xl border px-4" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
            <Settings size={22} aria-hidden style={{ color: 'var(--ink-soft)' }} />
            <span className="font-semibold">Ajustes</span>
          </Link>
        </li>
      </ul>
    </div>
  )
}
