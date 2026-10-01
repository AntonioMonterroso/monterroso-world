import { NavLink, Outlet } from 'react-router-dom'

const tabs: [string, string, boolean][] = [['/app/ejercicio', 'Rutinas', true], ['/app/ejercicio/historial', 'Historial', false], ['/app/ejercicio/cuerpo', 'Cuerpo', false], ['/app/ejercicio/companeros', 'Compañeros', false]]

export default function FitLayout() {
  return (
    <div>
      <nav aria-label="Ejercicio" className="mb-6 flex gap-1 overflow-x-auto rounded-full p-1" style={{ background: 'var(--surface)', width: 'fit-content', maxWidth: '100%' }}>
        {tabs.map(([to, label, end]) => <NavLink key={to} to={to} end={end} className="plan-tab shrink-0">{label}</NavLink>)}
      </nav>
      <Outlet />
    </div>
  )
}
