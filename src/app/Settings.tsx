import { useAuth } from '../lib/auth'

export default function Settings({ onLock, onResetPin }: { onLock: () => void; onResetPin: () => void }) {
  const { session, signOut } = useAuth()
  return (
    <div>
      <h1 className="font-display text-4xl">Ajustes</h1>
      <section className="mt-8 grid gap-3">
        <div className="rounded-xl border p-4" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)' }}>
          <p className="text-sm" style={{ color: 'var(--ink-faint)' }}>Cuenta</p>
          <p className="mt-1 break-all">{session?.user.email}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button className="btn btn-ghost" onClick={onLock}>Bloquear ahora</button>
          <button className="btn btn-ghost" onClick={onResetPin}>Cambiar PIN</button>
          <button className="btn btn-ghost" onClick={signOut}>Cerrar sesión</button>
        </div>
      </section>
    </div>
  )
}
