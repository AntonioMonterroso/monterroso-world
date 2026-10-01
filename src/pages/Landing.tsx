import { motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight, Check, Copy, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card from '../components/Card'
import DayRing from '../components/DayRing'
import { profile } from '../lib/profile'

const ease = [0.23, 1, 0.32, 1] as const

function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={{ opacity: 0, transform: reduce ? 'translateY(0px)' : 'translateY(14px)' }}
      whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
      viewport={{ once: true, margin: '-8% 0px' }}
      transition={{ duration: 0.6, delay, ease }}
    >
      {children}
    </motion.div>
  )
}

const steps = [
  ['Hablamos', 'Me cuentas qué necesitas y para quién. Te respondo con un plan claro y un precio antes de empezar.'],
  ['Lo construyo', 'Diseño y programo por etapas. Ves avances reales, no capturas, y opinas mientras se hace.'],
  ['Lo publicamos', 'Sale con tu dominio, rápido y seguro. Te dejo todo ordenado y sigo disponible para cambios.'],
]

function CopyEmail() {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email)
      setDone(true)
      setTimeout(() => setDone(false), 1800)
    } catch { /* sin permiso de portapapeles */ }
  }
  return (
    <button onClick={copy} className="btn btn-ghost" aria-live="polite">
      {done ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />} {done ? 'Copiado' : 'Copiar correo'}
    </button>
  )
}

export default function Landing() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  return (
    <>
      <header
        className="sticky top-0 z-20 transition-colors"
        style={{
          background: scrolled ? 'rgba(11,23,48,.92)' : 'transparent',
          borderBottom: `1px solid ${scrolled ? '#1d3560' : 'transparent'}`,
          backdropFilter: scrolled ? 'blur(8px)' : undefined,
        }}
      >
       <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 md:px-8">
        <span className="font-display text-lg">Monterroso World</span>
        <nav aria-label="Principal" className="flex items-center gap-1 text-sm">
          <a href="#tarjeta" className="hidden min-h-11 items-center px-3 sm:inline-flex">Tarjeta</a>
          <a href="#obra" className="hidden min-h-11 items-center px-3 sm:inline-flex">Mi trabajo</a>
          <Link to="/app" className="btn btn-ghost">Entrar</Link>
        </nav>
       </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-5 pt-8 pb-20 md:grid-cols-[1.25fr_1fr] md:items-center md:px-8 md:pt-16 md:pb-28">
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, ease }}
              className="text-sm tracking-widest uppercase"
              style={{ color: 'var(--accent-soft)' }}
            >
              Desarrollador web · Músico
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, transform: 'translateY(16px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: 0.7, delay: 0.08, ease }}
              className="mt-4 font-display text-[clamp(2.6rem,7vw,5.2rem)] leading-[1.02]"
            >
              Código de día.
              <br />
              <span style={{ color: 'var(--accent)' }}>Música de noche.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, transform: 'translateY(12px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: 0.7, delay: 0.2, ease }}
              className="mt-6 max-w-md text-lg"
              style={{ color: 'var(--ink-soft)' }}
            >
              Soy Monterroso. Hago sitios web y apps, y toco como productor, guitarrista, baterista y pianista.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.35, ease }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <a href={`mailto:${profile.email}`} className="btn btn-primary">
                <Mail size={18} aria-hidden /> Escríbeme
              </a>
              <a href="#tarjeta" className="btn btn-ghost">Ver mi tarjeta</a>
            </motion.div>
          </div>
          <motion.div
            initial={{ opacity: 0, transform: 'scale(0.95)' }}
            animate={{ opacity: 1, transform: 'scale(1)' }}
            transition={{ duration: 0.8, delay: 0.15, ease }}
          >
            <DayRing />
          </motion.div>
        </section>

        <section className="py-16 md:py-24" style={{ background: 'var(--bg-raised)' }}>
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <Reveal>
              <p className="text-sm tracking-widest uppercase" style={{ color: 'var(--accent-soft)' }}>Mi tarjeta</p>
              <h2 className="mb-10 mt-2 font-display text-3xl md:text-4xl">Una persona, tres presentaciones</h2>
            </Reveal>
            <Reveal delay={0.05}>
              <Card />
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <div className="grid gap-10 md:grid-cols-[1fr_1.6fr]">
            <Reveal>
              <p className="text-sm tracking-widest uppercase" style={{ color: 'var(--accent-soft)' }}>Cómo trabajo</p>
              <h2 className="mt-2 font-display text-3xl md:text-4xl">Simple y sin sorpresas</h2>
            </Reveal>
            <ol className="grid gap-8">
              {steps.map(([t, d], i) => (
                <li key={t}>
                  <Reveal delay={i * 0.06}>
                    <div className="flex gap-5 border-t pt-5" style={{ borderColor: '#1d3560' }}>
                      <span className="font-display text-3xl" style={{ color: 'var(--accent)' }}>0{i + 1}</span>
                      <div>
                        <h3 className="text-lg font-semibold">{t}</h3>
                        <p className="mt-1 max-w-md" style={{ color: 'var(--ink-soft)' }}>{d}</p>
                      </div>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="obra" className="py-16 md:py-24" style={{ background: 'var(--bg-raised)' }}>
         <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-2 md:px-8">
          <Reveal>
            <p className="text-sm tracking-widest uppercase" style={{ color: 'var(--accent-soft)' }}>Mi trabajo</p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl">Míralo funcionando</h2>
            <p className="mt-4 max-w-md" style={{ color: 'var(--ink-soft)' }}>
              Los sitios que he publicado viven en mi estudio. Ahí puedes recorrerlos y ver cómo responden.
            </p>
            <a href={profile.site} target="_blank" rel="noreferrer" className="btn btn-primary mt-6">
              Abrir el estudio <ArrowUpRight size={18} aria-hidden />
            </a>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="text-sm tracking-widest uppercase" style={{ color: 'var(--accent-soft)' }}>Contacto</p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl">¿Tienes algo en mente?</h2>
            <p className="mt-4 max-w-md break-words" style={{ color: 'var(--ink-soft)' }}>
              Un sitio, una app, una canción o un instrumento para tu proyecto. Escríbeme a {profile.email}.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={`mailto:${profile.email}`} className="btn btn-primary"><Mail size={18} aria-hidden /> Escribir</a>
              <CopyEmail />
            </div>
          </Reveal>
         </div>
        </section>
      </main>

      <footer className="border-t px-5 py-8 text-center text-sm" style={{ borderColor: '#1d3560', color: 'var(--ink-soft)' }}>
        <p>© {new Date().getFullYear()} Monterroso World</p>
        <p className="mt-1">
          Built with Claude Web Builder by{' '}
          <a href="https://tododeia.com" className="underline">Tododeia</a>
        </p>
      </footer>
    </>
  )
}
