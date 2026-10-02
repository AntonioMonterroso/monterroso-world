import { Outlet } from 'react-router-dom'
import { SegNav } from '../../components/ui'

const tabs = [
    { to: '/app/mente', label: 'Hábitos', end: true },
    { to: '/app/mente/rutinas', label: 'Rutinas' },
    { to: '/app/mente/enfoque', label: 'Enfoque' },
    { to: '/app/ejercicio', label: 'Ejercicio' },
]

export default function MindLayout() {
  return (
    <div>
      <SegNav label="Mente y cuerpo" tabs={tabs} />
      <Outlet />
    </div>
  )
}
