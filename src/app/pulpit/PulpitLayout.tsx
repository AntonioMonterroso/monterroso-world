import { NavLink, Outlet } from 'react-router-dom'

export default function PulpitLayout() {
  return (
    <div>
      <nav aria-label="Púlpito" className="mb-6 inline-flex gap-1 rounded-full p-1" style={{ background: 'var(--surface)' }}>
        {[['/app/pulpito', 'Prédicas', true], ['/app/pulpito/notas', 'Notas de fe', false]].map(([to, label, end]) => (
          <NavLink key={String(to)} to={String(to)} end={Boolean(end)} className="plan-tab">{label}</NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
