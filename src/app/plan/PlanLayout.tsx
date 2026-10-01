import { NavLink, Outlet } from 'react-router-dom'

export default function PlanLayout() {
  return (
    <div>
      <nav aria-label="Planear" className="mb-6 inline-flex gap-1 rounded-full p-1" style={{ background: 'var(--surface)' }}>
        {[['/app/planear', 'Horario', true], ['/app/planear/agenda', 'Agenda', false], ['/app/planear/calendario', 'Calendario', false]].map(([to, label, end]) => (
          <NavLink key={String(to)} to={String(to)} end={Boolean(end)} className="plan-tab">{label}</NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
