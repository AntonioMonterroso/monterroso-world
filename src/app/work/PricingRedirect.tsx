import { useEffect } from 'react'
import { profile } from '../../lib/profile'

/** La página de precios ahora vive dentro de la página del estudio: los enlaces viejos llevan allá. */
export default function PricingRedirect() {
  useEffect(() => { window.location.replace(`${profile.site}#precios`) }, [])
  return <main className="grid min-h-dvh place-items-center px-6 text-center"><p>Te llevo a los precios… <a className="underline" href={`${profile.site}#precios`}>Ir ahora</a></p></main>
}
