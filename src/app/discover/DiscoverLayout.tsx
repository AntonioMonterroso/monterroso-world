import { NavLink, Outlet } from 'react-router-dom'

export default function DiscoverLayout() {
  return (
    <div>
      <nav aria-label="Descubrir" className="mb-6 flex gap-1 overflow-x-auto rounded-full p-1" style={{ background: 'var(--surface)', width: 'fit-content', maxWidth: '100%' }}>
        <NavLink to="/app/descubrir" end className="plan-tab shrink-0">Aprender</NavLink>
        <NavLink to="/app/descubrir/links" className="plan-tab shrink-0">Links</NavLink>
        <NavLink to="/app/descubrir/portafolio" className="plan-tab shrink-0">Portafolio</NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
