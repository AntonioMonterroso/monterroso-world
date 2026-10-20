import { ArrowLeftRight, CalendarCheck, Landmark, LayoutDashboard, PiggyBank } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { SegNav, TabOutlet, type NavTab } from '../../components/ui'

const B = '/app/dinero'
/** Cinco secciones; cada una agrupa pantallas que antes eran pestañas sueltas y se eligen en la segunda fila. */
const SECTIONS: { id: string; label: string; icon: NavTab['icon']; hint: string; views: { to: string; label: string }[] }[] = [
  { id: 'hoy', label: 'Hoy', icon: LayoutDashboard, hint: 'Cuánto puedes gastar', views: [{ to: B, label: 'Resumen' }] },
  { id: 'entra', label: 'Lo que entra', icon: CalendarCheck, hint: 'Clientes con mensualidad', views: [{ to: `${B}/entra`, label: 'Mensualidades' }] },
  { id: 'gastos', label: 'Gastos y pagos', icon: ArrowLeftRight, hint: 'Lo que sale y lo que debes', views: [
    { to: `${B}/movimientos`, label: 'Movimientos' }, { to: `${B}/suscripciones`, label: 'Pagos fijos' }, { to: `${B}/prestamos`, label: 'Deudas y préstamos' }, { to: `${B}/presupuesto`, label: 'Límites' }] },
  { id: 'plan', label: 'Mi plan', icon: PiggyBank, hint: 'Reparto y ahorro', views: [{ to: `${B}/reparto`, label: 'Reparto' }, { to: `${B}/metas`, label: 'Ahorro' }] },
  { id: 'cuentas', label: 'Cuentas', icon: Landmark, hint: 'Dónde está tu dinero', views: [{ to: `${B}/cuentas`, label: 'Mis cuentas' }, { to: `${B}/categorias`, label: 'Categorías' }] },
]

const here = (path: string, to: string) => (to === B ? path.replace(/\/$/, '') === B : path === to || path.startsWith(to + '/'))

export default function MoneyLayout() {
  const { pathname } = useLocation()
  const current = SECTIONS.find((s) => s.views.some((v) => here(pathname, v.to))) ?? SECTIONS[0]
  const tabs: NavTab[] = SECTIONS.map((s) => ({ to: s.views[0].to, label: s.label, icon: s.icon, hint: s.hint, active: s === current }))
  const views: NavTab[] = current.views.map((v) => ({ to: v.to, label: v.label, end: true }))
  return (
    <div>
      <SegNav label="Dinero" tabs={tabs} />
      {current.views.length > 1 && <SegNav label={`${current.label}: vistas`} tabs={views} className="mt-2" />}
      <TabOutlet tabs={SECTIONS.flatMap((s) => s.views)} />
    </div>
  )
}
