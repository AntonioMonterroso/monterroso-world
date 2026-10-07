import { SegNav, TabOutlet } from '../../components/ui'

const tabs = [
    { to: '/app/mente', label: 'Hábitos', end: true },
    { to: '/app/mente/rutinas', label: 'Rutinas' },
    { to: '/app/mente/enfoque', label: 'Enfoque' },
    { to: '/app/mente/salida', label: 'Antes de salir' },
    { to: '/app/mente/cosas', label: 'Cosas y promesas' },
    { to: '/app/mente/vencimientos', label: 'Vencimientos' },
    { to: '/app/mente/reglas', label: 'Si… entonces…' },
    { to: '/app/mente/logros', label: 'Logros' },
    { to: '/app/mente/ocio', label: 'Ocio' },
    { to: '/app/ejercicio', label: 'Ejercicio' },
]

export default function MindLayout() {
  return (
    <div>
      <SegNav label="Mente y cuerpo" tabs={tabs} />
      <TabOutlet tabs={tabs} />
    </div>
  )
}
