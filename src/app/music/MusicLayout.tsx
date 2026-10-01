import { NavLink, Outlet } from 'react-router-dom'

export default function MusicLayout() {
  return (
    <div>
      <nav aria-label="Música" className="no-print mb-6 inline-flex gap-1 rounded-full p-1" style={{ background: 'var(--surface)' }}>
        {[['/app/musica', 'Canciones', true], ['/app/musica/setlists', 'Setlists', false], ['/app/musica/practica', 'Práctica', false]].map(([to, label, end]) => (
          <NavLink key={String(to)} to={String(to)} end={Boolean(end)} className="plan-tab">{label}</NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
