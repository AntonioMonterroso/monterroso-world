import { ChevronRight, KeyRound, Palette, Settings } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { currentMonth, money, summarizeMonth, useProjects } from '../lib/projects'
import { rankRecipes, type PantryItem, type Recipe } from '../lib/kitchen'
import { useTable } from '../lib/table'
import { localISO } from '../lib/time'
import type { Habit, HabitLog } from '../lib/habits'

const Mini = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,.16)' }}>
    <div className="text-xs font-semibold">{label}</div>
    <div className="font-display text-lg font-extrabold">{value}</div>
  </div>
)

/** Áreas: tus tres áreas de vida, cada una con su color y una pista de cómo va. */
export default function Areas() {
  const work = useProjects()
  const quotes = useTable<{ id: string; status: string }>('quotes', { col: 'created_at', asc: false })
  const songs = useTable<{ id: string }>('songs', { col: 'created_at', asc: false })
  const practice = useTable<{ id: string; practiced_on: string }>('practice_logs', { col: 'practiced_on', asc: false })
  const habits = useTable<Habit>('habits', { col: 'position', asc: true })
  const hlogs = useTable<HabitLog>('habit_logs', { col: 'day', asc: false })
  const recipes = useTable<Recipe>('recipes', { col: 'title', asc: true })
  const pantry = useTable<PantryItem>('pantry_items', { col: 'name', asc: true })
  const today = localISO()
  const month = currentMonth()

  const pending = useMemo(() => summarizeMonth(work.projects, work.payments, month).GTQ?.pending ?? 0, [work.projects, work.payments, month])
  const active = work.projects.filter((p) => p.status === 'active' || p.status === 'review').length
  const openQuotes = quotes.rows.filter((q) => q.status === 'draft' || q.status === 'sent').length
  const days = new Set(practice.rows.filter((p) => p.practiced_on.startsWith(month)).map((p) => p.practiced_on)).size
  const act = habits.rows.filter((h) => !h.archived)
  const done = act.filter((h) => hlogs.rows.some((l) => l.habit_id === h.id && l.day === today)).length
  const ready = useMemo(() => rankRecipes(recipes.rows, pantry.rows).filter((x) => x.miss.length === 0).length, [recipes.rows, pantry.rows])

  return (
    <div className="grid gap-4">
      <header className="flex items-center gap-2">
        <div className="min-w-0 flex-1"><p className="text-xs font-bold tracking-wide uppercase" style={{ color: 'var(--ink-soft)' }}>Tus tres áreas</p><h1 className="font-display text-4xl font-extrabold">Áreas</h1></div>
      </header>

      <Link to="/app/trabajo" className="grid gap-3 rounded-[28px] p-5" style={{ background: 'var(--web)', color: 'var(--sobre-web)' }}>
        <div className="flex items-center gap-2"><span className="font-display text-2xl font-bold flex-1">Trabajo</span><ChevronRight size={20} aria-hidden /></div>
        <div className="grid grid-cols-3 gap-2"><Mini label="Por cobrar" value={money(pending)} /><Mini label="Activos" value={String(active)} /><Mini label="Propuestas" value={String(openQuotes)} /></div>
      </Link>

      <Link to="/app/musica" className="grid gap-3 rounded-[28px] p-5" style={{ background: 'var(--musica)', color: 'var(--sobre-musica)' }}>
        <div className="flex items-center gap-2"><span className="font-display text-2xl font-bold flex-1">Música</span><ChevronRight size={20} aria-hidden /></div>
        <div className="grid grid-cols-2 gap-2"><Mini label="Canciones" value={String(songs.rows.length)} /><Mini label="Días de práctica este mes" value={String(days)} /></div>
      </Link>

      <Link to="/app/mente" className="grid gap-3 rounded-[28px] p-5" style={{ background: 'var(--personal)', color: 'var(--sobre-personal)' }}>
        <div className="flex items-center gap-2"><span className="font-display text-2xl font-bold flex-1">Personal</span><ChevronRight size={20} aria-hidden /></div>
        <div className="grid grid-cols-2 gap-2"><Mini label="Hábitos hoy" value={act.length ? `${done} de ${act.length}` : '—'} /><Mini label="Recetas listas" value={String(ready)} /></div>
      </Link>

      <div className="grid grid-cols-3 gap-3">
        <Link to="/app/boveda" className="tile" style={{ background: 'var(--tinta)', color: 'var(--fondo)', minHeight: 112, justifyContent: 'space-between' }}><KeyRound size={24} aria-hidden /><span className="font-semibold">Privado</span></Link>
        <Link to="/app/ajustes" className="tile" style={{ minHeight: 112, justifyContent: 'space-between' }}><Settings size={24} aria-hidden /><span className="font-semibold">Ajustes</span></Link>
        <Link to="/app/ajustes/apariencia" className="tile" style={{ minHeight: 112, justifyContent: 'space-between' }}><Palette size={24} aria-hidden /><span className="font-semibold">Apariencia</span></Link>
      </div>
    </div>
  )
}
