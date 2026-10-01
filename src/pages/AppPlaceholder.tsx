import { Link } from 'react-router-dom'

export default function AppPlaceholder() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-4xl">Tu centro de mando</h1>
        <p className="mx-auto mt-3 max-w-sm" style={{ color: 'var(--ink-soft)' }}>
          La app privada llega en la siguiente fase, junto con el login.
        </p>
        <Link to="/" className="btn btn-ghost mt-6">Volver al inicio</Link>
      </div>
    </main>
  )
}
