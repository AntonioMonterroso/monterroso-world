import { Bell, LayoutGrid, Search, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Globe from '../components/Globe'
import { centers } from '../lib/modules'
import { useTone } from '../lib/tone'
import NotificationActions from './NotificationActions'
import Palette from './Palette'

const mobileMain = ['hoy', 'planear', 'trabajo', 'musica']
const to = (id: string) => (id === 'hoy' ? '/app' : `/app/${id}`)

export default function Shell({ onLock, onSignOut }: { onLock: () => void; onSignOut: () => void }) {
  useTone()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((v) => !v) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-1 border-r p-4 md:flex" style={{ borderColor: 'var(--line-soft)', background: 'var(--surface)' }}>
        <div className="mb-4 flex items-center gap-2 px-2 font-display text-lg"><Globe size={28} /> Monterroso World</div>
        <nav aria-label="Centros" className="grid gap-1">
          {centers.map((c) => (
            <NavLink key={c.id} to={to(c.id)} end={c.id === 'hoy'} className="nav-link">
              <c.icon size={18} aria-hidden /> {c.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto grid gap-1">
          <button className="nav-link w-full cursor-pointer" onClick={() => setOpen(true)}><Search size={18} aria-hidden /> Buscar <kbd className="ml-auto text-xs" style={{ color: 'var(--ink-faint)' }}>⌘K</kbd></button>
          <NavLink to="/app/ajustes" className="nav-link"><Settings size={18} aria-hidden /> Ajustes</NavLink>
        </div>
      </aside>

      <div className="min-w-0 pb-24 md:pb-0">
        <header className="safe-top-sticky sticky top-0 z-10 flex items-center justify-between px-4 pb-2 md:hidden" style={{ background: 'color-mix(in oklab, var(--bg) 92%, transparent)', backdropFilter: 'blur(8px)' }}>
          <span className="flex items-center gap-2 font-display text-lg"><Globe size={26} /> Monterroso World</span>
          <span className="flex"><NavLink to="/app/avisos" className="grid size-11 place-items-center rounded-full" aria-label="Centro de avisos"><Bell size={20} aria-hidden /></NavLink><button className="grid size-11 place-items-center rounded-full" onClick={() => setOpen(true)} aria-label="Buscar"><Search size={20} aria-hidden /></button></span>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6 md:px-10 md:py-10"><Outlet /></main>
      </div>

      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t md:hidden" style={{ background: 'var(--surface)', borderColor: 'var(--line-soft)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {mobileMain.map((id) => {
          const c = centers.find((x) => x.id === id)!
          return (
            <NavLink key={id} to={to(id)} end={id === 'hoy'} className="tab-link"><c.icon size={20} aria-hidden /><span>{c.label}</span></NavLink>
          )
        })}
        <NavLink to="/app/mas" className="tab-link"><LayoutGrid size={20} aria-hidden /><span>Más</span></NavLink>
      </nav>

      <NotificationActions />
      <Palette open={open} onClose={() => setOpen(false)} onLock={onLock} onSignOut={onSignOut} />
    </div>
  )
}
