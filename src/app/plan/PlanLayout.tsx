import { Outlet } from 'react-router-dom'

/** Las pestañas ahora las pone la sección (ver SectionLayout); este solo deja pasar las pantallas. */
export default function PlanLayout() {
  return <Outlet />
}
