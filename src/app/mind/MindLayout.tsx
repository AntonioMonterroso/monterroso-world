import { NavLink, Outlet } from 'react-router-dom'

export default function MindLayout() {
  return (
    <div>
      <nav aria-label="Mente y cuerpo" className="mb-6 flex gap-1 overflow-x-auto rounded-full p-1" style={{ background: 'var(--surface)', width: 'fit-content', maxWidth: '100%' }}>
        <NavLink to="/app/mente" end className="plan-tab shrink-0">Hábitos</NavLink>
        <NavLink to="/app/mente/enfoque" className="plan-tab shrink-0">Enfoque</NavLink>
        <NavLink to="/app/ejercicio" className="plan-tab shrink-0">Ejercicio</NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
