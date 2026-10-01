import { NavLink, Outlet } from 'react-router-dom'

const tabs: [string, string, boolean][] = [['/app/dinero', 'Resumen', true], ['/app/dinero/movimientos', 'Movimientos', false], ['/app/dinero/presupuesto', 'Presupuesto', false], ['/app/dinero/metas', 'Metas', false], ['/app/dinero/suscripciones', 'Suscripciones', false], ['/app/dinero/prestamos', 'Préstamos', false]]

export default function MoneyLayout() {
  return (
    <div>
      <nav aria-label="Dinero" className="mb-6 flex gap-1 overflow-x-auto rounded-full p-1" style={{ background: 'var(--surface)', width: 'fit-content', maxWidth: '100%' }}>
        {tabs.map(([to, label, end]) => <NavLink key={to} to={to} end={end} className="plan-tab shrink-0">{label}</NavLink>)}
      </nav>
      <Outlet />
    </div>
  )
}
