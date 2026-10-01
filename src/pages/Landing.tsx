import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowUpRight, Download, Mail } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import DayRing from '../components/DayRing'
import { buildVCard, focuses, profile, type FocusKey } from '../lib/profile'

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

function Card() {
  const [focus, setFocus] = useState<FocusKey>('dev')
  const [qr, setQr] = useState('')
  const f = focuses[focus]
  const link = `${profile.pageUrl}#${focus}`

  useEffect(() => {
    QRCode.toDataURL(link, { margin: 1, width: 220, color: { dark: '#0b1730', light: '#f1ebdd' } }).then(setQr)
  }, [link])

  const download = () => {
    const blob = new Blob([buildVCard(focus)], { type: 'text/vcard' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `monterroso-${focus}.vcf`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div id="tarjeta">
      <div role="tablist" aria-label="Enfoque de la tarjeta" className="flex gap-2">
        {(Object.keys(focuses) as FocusKey[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={focus === k}
            onClick={() => setFocus(k)}
            className="min-h-11 rounded-full px-4 text-sm font-semibold transition-colors"
            style={{
              background: focus === k ? 'var(--accent)' : 'transparent',
              color: focus === k ? 'var(--bg)' : 'var(--ink-soft)',
              border: focus === k ? '1px solid transparent' : '1px solid #2b4776',
            }}
          >
            {focuses[k].label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
        <AnimatePresence mode="wait">
          <motion.div
            key={focus}
            role="tabpanel"
            initial={{ opacity: 0, transform: 'translateY(8px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease }}
          >
            <p className="text-sm tracking-wide" style={{ color: 'var(--accent-soft)' }}>
              {f.role}
            </p>
            <h3 className="mt-2 font-display text-3xl md:text-4xl">{f.headline}</h3>
            <p className="mt-4 max-w-prose" style={{ color: 'var(--ink-soft)' }}>
              {f.body}
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {f.items.map((i) => (
                <li key={i} className="border-b pb-1" style={{ borderColor: '#2b4776' }}>
                  {i}
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-end gap-4 md:flex-col md:items-start">
          {qr && <img src={qr} alt={`Código QR de la tarjeta ${f.label}`} width={132} height={132} className="rounded-lg" />}
          <button onClick={download} className="btn btn-ghost">
            <Download size={18} aria-hidden /> Guardar contacto
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <span className="font-display text-lg">Monterroso World</span>
        <nav aria-label="Principal" className="flex items-center gap-1 text-sm">
          <a href="#tarjeta" className="hidden min-h-11 items-center px-3 sm:inline-flex">Tarjeta</a>
          <a href="#obra" className="hidden min-h-11 items-center px-3 sm:inline-flex">Mi trabajo</a>
          <Link to="/app" className="btn btn-ghost">Entrar</Link>
        </nav>
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
              <h2 className="mb-8 font-display text-3xl md:text-4xl">Una tarjeta, tres enfoques</h2>
            </Reveal>
            <Reveal delay={0.05}>
              <Card />
            </Reveal>
          </div>
        </section>

        <section id="obra" className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
          <Reveal>
            <h2 className="font-display text-3xl md:text-4xl">Mi trabajo</h2>
            <p className="mt-4 max-w-md" style={{ color: 'var(--ink-soft)' }}>
              Los sitios que he publicado viven en mi estudio. Ahí puedes verlos funcionando.
            </p>
            <a href={profile.site} target="_blank" rel="noreferrer" className="btn btn-primary mt-6">
              Abrir el estudio <ArrowUpRight size={18} aria-hidden />
            </a>
          </Reveal>
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
