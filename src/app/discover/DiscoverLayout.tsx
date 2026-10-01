import { ChevronLeft } from 'lucide-react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

type Sub = { to: string; label: string }
const GROUPS: { id: string; label: string; match: string[]; to: string; subs: Sub[] }[] = [
  { id: 'aprender', label: 'Aprender', match: ['aprender', 'video'], to: '/app/descubrir/aprender', subs: [] },
  { id: 'guardar', label: 'Guardar', match: ['links', 'inspiracion', 'portafolio'], to: '/app/descubrir/links', subs: [{ to: '/app/descubrir/links', label: 'Links' }, { to: '/app/descubrir/inspiracion', label: 'Inspiración' }, { to: '/app/descubrir/portafolio', label: 'Portafolio' }] },
  { id: 'salir', label: 'Salir y comprar', match: ['lugares', 'compras'], to: '/app/descubrir/lugares', subs: [{ to: '/app/descubrir/lugares', label: 'Lugares' }, { to: '/app/descubrir/compras', label: 'Por comprar' }] },
]

/** Descubrir: una pantalla de inicio y tres grupos. Los grupos con varias secciones muestran un segundo nivel. */
export default function DiscoverLayout() {
  const { pathname } = useLocation()
  const seg = pathname.replace(/^.*\/app\/descubrir\/?/, '').split('/')[0]
  const group = GROUPS.find((g) => g.match.includes(seg))

  return (
    <div>
      {group && (
        <>
          <Link to="/app/descubrir" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm" style={{ color: 'var(--ink-soft)' }}><ChevronLeft size={16} aria-hidden /> Descubrir</Link>
          <nav aria-label="Grupos de Descubrir" className="mb-4 flex gap-1 overflow-x-auto rounded-full p-1" style={{ background: 'var(--surface)', width: 'fit-content', maxWidth: '100%' }}>
            {GROUPS.map((g) => (
              <Link key={g.id} to={g.to} className="plan-tab shrink-0" aria-current={g.id === group.id ? 'page' : undefined}>{g.label}</Link>
            ))}
          </nav>
          {group.subs.length > 1 && (
            <nav aria-label={group.label} className="mb-6 flex gap-5 overflow-x-auto border-b" style={{ borderColor: 'var(--line-soft)' }}>
              {group.subs.map((s) => <NavLink key={s.to} to={s.to} className="sub-tab shrink-0">{s.label}</NavLink>)}
            </nav>
          )}
        </>
      )}
      <Outlet />
    </div>
  )
}
