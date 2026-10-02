import { Bell, LayoutGrid, Search, Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import Globe from '../components/Globe'
import { useAttention } from '../lib/attention'
import { resolveMode, useMode } from '../lib/context'
import { blockApplies, useBlocks } from '../lib/data'
import { localISO } from '../lib/time'
import { centerGroups, centers } from '../lib/modules'
import { useTone } from '../lib/tone'
import NotificationActions from './NotificationActions'
import Palette from './Palette'

const mobileMain = ['hoy', 'planear', 'trabajo', 'musica']
const to = (id: string) => (id === 'hoy' ? '/app' : `/app/${id}`)

export default function Shell({ onLock, onSignOut }: { onLock: () => void; onSignOut: () => void }) {
  useTone()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t) }, [])
  const { blocks } = useBlocks()
  const m = now.getHours() * 60 + now.getMinutes()
  const currentKind = blocks.find((b) => blockApplies(b, localISO(now)) && m >= b.start_min && m < b.end_min)?.kind
  useMode(resolveMode({ pathname, currentKind, hour: now.getHours() }))
  const attention = useAttention(now)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((v) => !v) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <div className="app min-h-dvh md:grid md:grid-cols-[250px_1fr]">
      <aside className="side sticky top-0 hidden h-dvh flex-col gap-1 overflow-y-auto p-4 md:flex" style={{ boxShadow: '1px 0 0 var(--sep)' }}>
        <div className="mb-3 flex items-center gap-2 px-2 text-lg font-semibold tracking-tight"><Globe size={28} /> Monterroso World</div>
        <nav aria-label="Centros" className="grid gap-0.5">
          {centerGroups.map((g, gi) => (
            <div key={gi} className="grid gap-0.5" role="group" aria-label={g.label}>
              {g.label && <p className="side-label" aria-hidden>{g.label}</p>}
              {g.ids.map((id) => { const c = centers.find((x) => x.id === id)!; return (
                <NavLink key={id} to={to(id)} end={id === 'hoy'} className="nav-link">
                  <c.icon size={18} aria-hidden /> {c.label}
                </NavLink>
              ) })}
            </div>
          ))}
        </nav>
        <div className="mt-auto grid gap-1">
          <button className="nav-link w-full cursor-pointer" onClick={() => setOpen(true)}><Search size={18} aria-hidden /> Buscar <kbd className="ml-auto text-xs" style={{ color: 'var(--ink-faint)' }}>⌘K</kbd></button>
          <NavLink to="/app/avisos" className="nav-link"><Bell size={18} aria-hidden /> Avisos{attention.count > 0 && <span className="nav-badge" aria-label={`${attention.count} pendientes`}>{attention.count}</span>}</NavLink>
          <NavLink to="/app/ajustes" className="nav-link"><Settings size={18} aria-hidden /> Ajustes</NavLink>
        </div>
      </aside>

      <div className="min-w-0 pb-24 md:pb-0">
        <header className="topbar safe-top-sticky sticky top-0 z-10 flex items-center justify-between px-4 pb-2 md:hidden">
          <span className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Globe size={26} /> Monterroso World</span>
          <span className="flex"><NavLink to="/app/avisos" className="bell grid size-11 place-items-center rounded-full" aria-label={attention.count > 0 ? `Centro de avisos, ${attention.count} pendientes` : 'Centro de avisos'}><Bell size={20} aria-hidden />{attention.count > 0 && <span className="bell-dot" aria-hidden>{attention.count > 9 ? '9+' : attention.count}</span>}</NavLink><button className="grid size-11 place-items-center rounded-full" onClick={() => setOpen(true)} aria-label="Buscar"><Search size={20} aria-hidden /></button></span>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6 md:px-10 md:py-10"><div key={pathname.split('/').slice(0, 3).join('/')} className="page-in"><Outlet /></div></main>
      </div>

      <nav aria-label="Principal" className="tabbar fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
