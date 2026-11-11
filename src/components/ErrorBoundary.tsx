import { Component, type ReactNode } from 'react'

/** Si una pantalla falla (o no baja por falta de internet), en lugar de quedar en blanco se ve un mensaje amable con «Reintentar». */
export default class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null; key?: string }> {
  state: { error: Error | null; key?: string } = { error: null, key: this.props.resetKey }
  static getDerivedStateFromError(error: Error) { return { error } }
  static getDerivedStateFromProps(p: { resetKey?: string }, s: { error: Error | null; key?: string }) { return p.resetKey !== s.key ? { error: null, key: p.resetKey } : null }
  render() {
    if (!this.state.error) return this.props.children
    const offline = /Failed to fetch dynamically imported module|Importing a module script failed|Load failed|NetworkError/i.test(this.state.error.message) || (typeof navigator !== 'undefined' && navigator.onLine === false)
    return (
      <div role="alert" className="grid justify-items-start gap-3 py-10">
        <h2 className="font-display text-2xl">{offline ? 'No pude cargar esta pantalla' : 'Algo no salió como esperaba'}</h2>
        <p className="max-w-md text-sm" style={{ color: 'var(--ink-soft)' }}>{offline ? 'Parece que no hay internet. Tus datos están a salvo. Revisa la conexión e inténtalo otra vez.' : 'No se perdió nada de lo que guardaste. Puedes reintentar o volver a Hoy.'}</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={() => (offline ? location.reload() : this.setState({ error: null }))}>Reintentar</button>
          <a className="btn btn-ghost" href={`${import.meta.env.BASE_URL}app`}>Ir a Hoy</a>
        </div>
      </div>
    )
  }
}
