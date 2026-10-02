import { Outlet } from 'react-router-dom'
import { SegNav } from '../../components/ui'

const tabs = [
    { to: '/app/ejercicio', label: 'Rutinas', end: true },
    { to: '/app/ejercicio/historial', label: 'Historial' },
    { to: '/app/ejercicio/cuerpo', label: 'Cuerpo' },
    { to: '/app/ejercicio/companeros', label: 'Compañeros' },
]

export default function FitLayout() {
  return (
    <div>
      <SegNav label="Ejercicio" tabs={tabs} />
      <Outlet />
    </div>
  )
}
