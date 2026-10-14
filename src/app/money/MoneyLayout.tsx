import { ArrowLeftRight, Gauge, HandCoins, Landmark, LayoutDashboard, PieChart, PiggyBank, Repeat, Tags } from 'lucide-react'
import { SegNav, TabOutlet } from '../../components/ui'

const tabs = [
  { to: '/app/dinero', label: 'Resumen', end: true, icon: LayoutDashboard, group: 'Mirar', hint: 'Cómo vas este mes' },
  { to: '/app/dinero/movimientos', label: 'Movimientos', icon: ArrowLeftRight, group: 'Mirar', hint: 'Lo que entra y lo que sale' },
  { to: '/app/dinero/cuentas', label: 'Cuentas', icon: Landmark, group: 'Mirar', hint: 'Efectivo, bancos y tarjetas' },
  { to: '/app/dinero/reparto', label: 'Reparto', icon: PieChart, group: 'Planear', hint: 'Cuánto va a gastos y ahorro' },
  { to: '/app/dinero/presupuesto', label: 'Presupuesto', icon: Gauge, group: 'Planear', hint: 'Límites por categoría' },
  { to: '/app/dinero/metas', label: 'Ahorro', icon: PiggyBank, group: 'Planear', hint: 'Tus metas y tu fondo' },
  { to: '/app/dinero/suscripciones', label: 'Suscripciones', icon: Repeat, group: 'Compromisos', hint: 'Pagos que se repiten' },
  { to: '/app/dinero/prestamos', label: 'Préstamos', icon: HandCoins, group: 'Compromisos', hint: 'Lo que prestaste y debes' },
  { to: '/app/dinero/categorias', label: 'Categorías', icon: Tags, group: 'Orden', hint: 'Áreas y categorías propias' },
]

export default function MoneyLayout() {
  return (
    <div>
      <SegNav label="Dinero" tabs={tabs} />
      <TabOutlet tabs={tabs} />
    </div>
  )
}
