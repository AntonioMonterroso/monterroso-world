import { Outlet } from 'react-router-dom'
import { SegNav } from '../../components/ui'

const tabs = [
    { to: '/app/dinero', label: 'Resumen', end: true },
    { to: '/app/dinero/movimientos', label: 'Movimientos' },
    { to: '/app/dinero/presupuesto', label: 'Presupuesto' },
    { to: '/app/dinero/metas', label: 'Metas' },
    { to: '/app/dinero/suscripciones', label: 'Suscripciones' },
    { to: '/app/dinero/prestamos', label: 'Préstamos' },
    { to: '/app/dinero/categorias', label: 'Categorías' },
]

export default function MoneyLayout() {
  return (
    <div>
      <SegNav label="Dinero" tabs={tabs} />
      <Outlet />
    </div>
  )
}
