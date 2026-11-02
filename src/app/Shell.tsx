import { Bell, CalendarDays, LayoutGrid, Plus, Search, Settings, Sun, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Globe from '../components/Globe'
import { useAttention } from '../lib/attention'
import { resolveMode, useMode } from '../lib/context'
import { blockApplies, useBlocks } from '../lib/data'
import { localISO } from '../lib/time'
import { sectionOf, sections } from '../lib/sections'
import Anotar, { type Saved } from '../components/Anotar'
import { useTone } from '../lib/tone'
import NotificationActions from './NotificationActions'
import Palette from './Palette'

const SHORTCUTS = ['hoy', 'agenda', 'dinero', 'trabajo', 'musica', 'personal']
const isTyping = (t: EventTarget | null) => { const el = t as HTMLElement | null; return Boolean(el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) }

export default function Shell({ onLock, onSignOut }: { onLock: () => void; onSignOut: () => void }) {
  useTone()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteInbox, setNoteInbox] = useState<string | null>(null)
  const [saved, setSaved] = useState<Saved | null>(null)
  useEffect(() => { if (!saved) return; const t = setTimeout(() => setSaved(null), 5000); return () => clearTimeout(t) }, [saved])
  const nav = useNavigate()
  const { pathname } = useLocation()
  const here = sectionOf(pathname).section.id
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t) }, [])
  const { blocks } = useBlocks()
  const m = now.getHours() * 60 + now.getMinutes()
  const currentKind = blocks.find((b) => blockApplies(b, localISO(now)) && m >= b.start_min && m < b.end_min)?.kind
  useMode(resolveMode({ pathname, currentKind, hour: now.getHours() }))
  const attention = useAttention(now)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((v) => !v); return }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target) || document.querySelector('[role=dialog]')) return
      if (e.key.toLowerCase() === 'n') { e.preventDefault(); setNote(true); return }
      const i = Number(e.key)
      if (i >= 1 && i <= SHORTCUTS.length) { const sec = sections.find((x) => x.id === SHORTCUTS[i - 1])!; nav(sec.to) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [nav])

  useEffect(() => {
    const h = (e: Event) => { const d = (e as CustomEvent<{ text?: string; inboxId?: string }>).detail; setNoteText(d?.text ?? ''); setNoteInbox(d?.inboxId ?? null); setNote(true) }
    window.addEventListener('mw-anotar', h)
    return () => window.removeEventListener('mw-anotar', h)
  }, [])

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  return (
    <div className="app min-h-dvh md:grid md:grid-cols-[250px_1fr]">
      <aside className="side sticky top-0 hidden h-dvh flex-col gap-1 overflow-y-auto p-4 md:flex" style={{ boxShadow: '1px 0 0 var(--sep)' }}>
        <div className="mb-3 flex items-center gap-2 px-2 text-lg font-semibold tracking-tight"><Globe size={28} /> Monterroso World</div>
        <nav aria-label="Secciones" className="grid gap-0.5">
          {sections.filter((x) => x.id !== 'privado').map((sec, i) => (
            <Link key={sec.id} to={sec.to} className="nav-link" aria-current={here === sec.id ? 'page' : undefined}>
              <sec.icon size={18} aria-hidden /> {sec.label}
              {sec.area && <span className="area-dot" aria-hidden style={{ background: `var(--${sec.area})` }} />}
              <kbd className="ml-auto text-xs" style={{ color: 'var(--ink-faint)' }}>{i + 1}</kbd>
            </Link>
          ))}
          <div className="my-2 h-px" style={{ background: 'var(--sep)' }} />
          {sections.filter((x) => x.id === 'privado').map((sec) => (
            <Link key={sec.id} to={sec.to} className="nav-link" aria-current={here === sec.id ? 'page' : undefined}><sec.icon size={18} aria-hidden /> {sec.label}</Link>
          ))}
        </nav>
        <div className="mt-auto grid gap-1">
          <button className="btn btn-primary mb-1 w-full" onClick={() => { setNoteText(''); setNote(true) }}><Plus size={18} aria-hidden /> Anotar <kbd className="ml-auto text-xs opacity-60">N</kbd></button>
          <button className="nav-link w-full cursor-pointer" onClick={() => setOpen(true)}><Search size={18} aria-hidden /> Buscar <kbd className="ml-auto text-xs" style={{ color: 'var(--ink-faint)' }}>⌘K</kbd></button>
          <NavLink to="/app/pendientes" className="nav-link"><Bell size={18} aria-hidden /> Pendientes{attention.count > 0 && <span className="nav-badge" aria-label={`${attention.count} pendientes`}>{attention.count}</span>}</NavLink>
          <NavLink to="/app/ajustes" className="nav-link"><Settings size={18} aria-hidden /> Ajustes</NavLink>
        </div>
      </aside>

      <div className="min-w-0 pb-24 md:pb-0">
        <header className="topbar safe-top-sticky sticky top-0 z-10 flex items-center justify-between px-4 pb-2 md:hidden">
          <span className="flex items-center gap-2 text-lg font-semibold tracking-tight"><Globe size={26} /> Monterroso World</span>
          <span className="flex">
            <button className="grid size-11 place-items-center rounded-full" aria-label="Buscar" onClick={() => setOpen(true)}><Search size={20} aria-hidden /></button>
            <NavLink to="/app/pendientes" className="bell grid size-11 place-items-center rounded-full" aria-label={attention.count > 0 ? `Pendientes, ${attention.count}` : 'Pendientes'}><Bell size={20} aria-hidden />{attention.count > 0 && <span className="bell-dot" aria-hidden>{attention.count > 9 ? '9+' : attention.count}</span>}</NavLink>
          </span>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-6 md:px-10 md:py-10"><div key={pathname.split('/').slice(0, 3).join('/')} className="page-in"><Outlet /></div></main>
      </div>

      <nav aria-label="Principal" className="tabbar fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 items-start md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <Link to="/app" className="tab-link" aria-current={here === 'hoy' && !pathname.startsWith('/app/areas') ? 'page' : undefined}><Sun size={20} aria-hidden /><span>Hoy</span></Link>
        <Link to="/app/planear" className="tab-link" aria-current={here === 'agenda' ? 'page' : undefined}><CalendarDays size={20} aria-hidden /><span>Agenda</span></Link>
        <button type="button" className="fab-mw" onClick={() => { setNoteText(''); setNote(true) }} aria-label="Anotar"><Plus size={28} aria-hidden /></button>
        <Link to="/app/dinero" className="tab-link" aria-current={here === 'dinero' ? 'page' : undefined}><Wallet size={20} aria-hidden /><span>Dinero</span></Link>
        <Link to="/app/areas" className="tab-link" aria-current={['trabajo', 'musica', 'personal', 'privado'].includes(here) || pathname.startsWith('/app/areas') ? 'page' : undefined}><LayoutGrid size={20} aria-hidden /><span>Áreas</span></Link>
      </nav>

      <Anotar open={note} initial={noteText} inboxId={noteInbox} onClose={() => { setNote(false); setNoteText(''); setNoteInbox(null) }} onSaved={setSaved} />
      {saved && (
        <div role="status" className="fixed left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full py-1 pr-2 pl-5 text-sm" style={{ bottom: 'calc(6.5rem + env(safe-area-inset-bottom))', background: 'var(--tinta)', color: 'var(--fondo)' }}>
          {saved.label}
          <button className="min-h-11 rounded-full px-3 font-semibold underline" onClick={() => { const u = saved.undo; setSaved(null); void u() }}>Deshacer</button>
        </div>
      )}

      <NotificationActions />
      <Palette open={open} onClose={() => setOpen(false)} onLock={onLock} onSignOut={onSignOut} />
    </div>
  )
}
