import { Check as CheckIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { currentMonth, monthLabel, shiftMonth } from '../lib/projects'

const spring = { type: 'spring', bounce: 0, duration: 0.38 } as const

/** Encabezado de página: título grande, línea de contexto y una acción a la derecha. */
export function PageHeader({ eyebrow, title, sub, action }: { eyebrow?: string; title: string; sub?: ReactNode; action?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="font-display">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}

/** Navegación de segundo nivel: control segmentado con una pastilla que se desliza entre pestañas. */
export function SegNav({ label, tabs, className = '' }: { label: string; tabs: { to: string; label: string; end?: boolean; active?: boolean }[]; className?: string }) {
  const id = useId()
  const calm = useReducedMotion()
  const ref = useRef<HTMLElement>(null)
  const [edge, setEdge] = useState({ l: false, r: false })
  const measure = () => { const el = ref.current; if (el) setEdge({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 }) }
  const { pathname } = useLocation()
  // La pestaña activa siempre queda a la vista, y los bordes se difuminan si hay más a los lados
  useEffect(() => {
    const el = ref.current
    el?.querySelector<HTMLElement>('.is-on')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: calm ? 'auto' : 'smooth' })
    measure()
  }, [pathname, calm])
  return (
    <nav ref={ref} onScroll={measure} aria-label={label} className={`seg seg-nav ${edge.l ? 'fade-l' : ''} ${edge.r ? 'fade-r' : ''} ${className}`}>
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => `seg-item ${(t.active ?? isActive) ? 'is-on' : ''}`} aria-current={t.active === undefined ? undefined : t.active ? 'page' : undefined}>
          {({ isActive }) => (
            <>
              {(t.active ?? isActive) && <motion.span layoutId={id} className="seg-thumb" transition={calm ? { duration: 0 } : spring} aria-hidden />}
              <span className="seg-label">{t.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

/** El contenido de una pestaña entra deslizándose desde el lado al que fuiste (derecha si avanzas, izquierda si retrocedes). */
export function TabOutlet({ tabs }: { tabs?: { to: string }[] }) {
  const { pathname } = useLocation()
  const idx = tabs ? tabs.reduce((best, t, i) => (pathname === t.to || pathname.startsWith(t.to + '/') ? (best < 0 || t.to.length >= tabs[best].to.length ? i : best) : best), -1) : -1
  const prev = useRef(idx)
  const dir = idx < 0 || prev.current < 0 ? 0 : Math.sign(idx - prev.current)
  useEffect(() => { prev.current = idx }, [idx])
  return <div key={pathname} className="tab-in" style={{ '--dx': `${dir * 14}px` } as React.CSSProperties}><Outlet /></div>
}

/** Selector de una opción (filtros, tipo, periodo). Mismo lenguaje que SegNav. */
export function Segmented<T extends string>({ label, value, options, onChange, tone }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; tone?: string }) {
  const id = useId()
  const calm = useReducedMotion()
  return (
    <div role="group" aria-label={label} className="seg" style={tone ? ({ '--seg-tone': tone } as React.CSSProperties) : undefined}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)} className="seg-item">
          {value === o.id && <motion.span layoutId={id} className="seg-thumb" transition={calm ? { duration: 0 } : spring} aria-hidden />}
          <span className="seg-label">{o.label}</span>
        </button>
      ))}
    </div>
  )
}

/** ‹ Octubre de 2026 ›  — con salto rápido a "este mes". */
export function MonthStepper({ month, onChange }: { month: string; onChange: (m: string) => void }) {
  return (
    <div className="stepper">
      <button className="stepper-btn" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Mes anterior"><ChevronLeft size={18} aria-hidden /></button>
      <h2 className="stepper-label" aria-live="polite">{monthLabel(month)}</h2>
      <button className="stepper-btn" onClick={() => onChange(shiftMonth(month, 1))} aria-label="Mes siguiente"><ChevronRight size={18} aria-hidden /></button>
      {month !== currentMonth() && <button className="stepper-today" onClick={() => onChange(currentMonth())}>Hoy</button>}
    </div>
  )
}

/** Sección de lista agrupada (como Ajustes de iOS): título pequeño arriba, filas dentro de una sola superficie. */
export function Group({ title, aside, footer, children, className = '' }: { title?: ReactNode; aside?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`group-sec ${className}`}>
      {(title || aside) && <div className="group-head"><h3>{title}</h3>{aside && <span>{aside}</span>}</div>}
      <ul className="group-list">{children}</ul>
      {footer && <p className="group-foot">{footer}</p>}
    </section>
  )
}

type RowProps = {
  title: ReactNode
  sub?: ReactNode
  /** Color del punto/ícono a la izquierda (cualquier var(--token) o hex). */
  tone?: string
  icon?: ReactNode
  value?: ReactNode
  valueTone?: 'pos' | 'neg' | 'soft'
  to?: string
  onClick?: () => void
  chevron?: boolean
  muted?: boolean
  /** Acción a la derecha, fuera del área tocable de la fila (p. ej. «Pagada»). */
  trailing?: ReactNode
  children?: ReactNode
}

/** Fila de lista: ícono/punto, título, detalle y valor alineado a la derecha. Es un enlace, un botón o texto según se use. */
export function Row({ title, sub, tone, icon, value, valueTone, to, onClick, chevron, muted, trailing, children }: RowProps) {
  const body = (
    <>
      {(icon || tone) && <span className="row-ico" style={tone ? ({ '--ico': tone } as React.CSSProperties) : undefined} aria-hidden>{icon ?? <i />}</span>}
      <span className="row-main"><span className="row-title" style={muted ? { color: 'var(--ink-faint)' } : undefined}>{title}</span>{sub && <span className="row-sub">{sub}</span>}</span>
      {value !== undefined && <span className={`row-value ${valueTone ?? ''}`}>{value}</span>}
      {(chevron ?? Boolean(to || onClick)) && <ChevronRight size={16} aria-hidden className="row-chev" />}
    </>
  )
  return (
    <li className={`row ${trailing ? 'row-split' : ''}`}>
      {to ? <Link to={to} className="row-hit">{body}</Link> : onClick ? <button type="button" onClick={onClick} className="row-hit">{body}</button> : <div className="row-hit">{body}</div>}
      {trailing && <span className="row-trail">{trailing}</span>}
      {children}
    </li>
  )
}

/** Cifra destacada con su etiqueta. Se agrupa en una sola tarjeta con `.stats`. */
export function Stat({ label, value, tone, note }: { label: string; value: ReactNode; tone?: 'pos' | 'neg'; note?: ReactNode }) {
  return (
    <div className="stat">
      <p className="stat-label">{label}</p>
      <p className={`stat-value ${tone ?? ''}`}>{value}</p>
      {note && <p className="stat-note">{note}</p>}
    </div>
  )
}

/** Interruptor estilo iOS. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="switch" data-on={checked}>
      <span aria-hidden />
    </button>
  )
}

/** Casilla redonda: se llena con un resorte corto al marcarla. */
export function Chk({ on, tone = 'var(--accent)' }: { on: boolean; tone?: string }) {
  return <span className="chk" data-on={on} style={{ ['--chk' as string]: tone }}><CheckIcon size={13} strokeWidth={3} aria-hidden /></span>
}
