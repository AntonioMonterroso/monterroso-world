import { ChefHat, Package } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { SegNav, TabOutlet } from '../../components/ui'

export default function KitchenLayout() {
  const { pathname } = useLocation()
  // Una receta abierta sigue contando como «Qué cocino»
  const tabs = [
    { to: '/app/cocina', label: 'Qué cocino', active: !pathname.startsWith('/app/cocina/despensa'), icon: ChefHat },
    { to: '/app/cocina/despensa', label: 'Despensa', icon: Package },
  ]
  return (
    <div>
      <SegNav label="Cocina" tabs={tabs} />
      <TabOutlet tabs={tabs} />
    </div>
  )
}
