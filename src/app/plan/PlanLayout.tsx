import { Outlet } from 'react-router-dom'
import { SegNav } from '../../components/ui'

const tabs = [
    { to: '/app/planear', label: 'Horario', end: true },
    { to: '/app/planear/agenda', label: 'Agenda' },
    { to: '/app/planear/calendario', label: 'Calendario' },
]

export default function PlanLayout() {
  return (
    <div>
      <SegNav label="Planear" tabs={tabs} />
      <Outlet />
    </div>
  )
}
