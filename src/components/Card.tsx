import { AnimatePresence, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { Download, Mail, RotateCw } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useRef, useState } from 'react'
import { availability, buildVCard, focuses, profile, type FocusKey } from '../lib/profile'
import Avatar, { type Prop } from './Avatar'
import Globe from './Globe'

const ease = [0.23, 1, 0.32, 1] as const
const keys = Object.keys(focuses) as FocusKey[]
const accent: Record<FocusKey, string> = { dev: 'var(--dev)', music: 'var(--music)', personal: 'var(--personal)' }
const avatarProp: Record<FocusKey, Prop> = { dev: 'laptop', music: 'guitar', personal: 'wave' }

// Guilloché: ondas finas concéntricas, como el fondo de un documento formal
const guilloche = Array.from({ length: 9 }, (_, k) => {
  const y = 20 + k * 12
  let d = `M0 ${y}`
  for (let x = 0; x <= 300; x += 10) d += ` L${x} ${(y + Math.sin((x + k * 14) / 18) * (5 + k * 0.6)).toFixed(1)}`
  return d
})

function Motif({ focus }: { focus: FocusKey }) {
  if (focus === 'dev')
    return (
      <div className="motif" aria-hidden>
        {[62, 38, 70].map((w, i) => (
          <span key={i} className="code-line" style={{ width: `${w}%`, animationDelay: `${i * 140}ms` }} />
        ))}
      </div>
    )
  if (focus === 'music')
    return (
      <div className="motif motif-eq" aria-hidden>
        {Array.from({ length: 14 }).map((_, i) => (
          <span key={i} className="eq-bar" style={{ animationDelay: `${(i * 97) % 900}ms`, animationDuration: `${1.6 + (i % 5) * 0.25}s` }} />
        ))}
      </div>
    )
  return (
    <svg className="motif motif-arcs" viewBox="0 0 200 200" aria-hidden>
      {[90, 68, 46].map((r, i) => (
        <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 7" className="arc" style={{ animationDuration: `${60 + i * 25}s` }} />
      ))}
    </svg>
  )
}

export default function Card() {
  const reduce = useReducedMotion()
  const [focus, setFocus] = useState<FocusKey>('dev')
  const [flipped, setFlipped] = useState(false)
  const [qr, setQr] = useState('')
  const f = focuses[focus]
  const link = `${profile.pageUrl}#${focus}`
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 140, damping: 22 })
  const sy = useSpring(my, { stiffness: 140, damping: 22 })
  const rotateY = useTransform(sx, [-0.5, 0.5], [-7, 7])
  const rotateX = useTransform(sy, [-0.5, 0.5], [6, -6])
  const gx = useTransform(sx, [-0.5, 0.5], [20, 80])
  const gy = useTransform(sy, [-0.5, 0.5], [15, 85])
  const spec = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.12), transparent 45%)`
  const avX = useTransform(sx, [-0.5, 0.5], [-8, 8])
  const avY = useTransform(sy, [-0.5, 0.5], [-4, 4])
  const hour = new Date().getHours()

  useEffect(() => {
    QRCode.toDataURL(link, { margin: 1, width: 240, color: { dark: '#0b1730', light: '#f1ebdd' } }).then(setQr)
  }, [link])

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }
  const onLeave = () => { mx.set(0); my.set(0) }

  const onKey = (e: React.KeyboardEvent) => {
    const i = keys.indexOf(focus)
    const next = e.key === 'ArrowRight' ? keys[(i + 1) % keys.length] : e.key === 'ArrowLeft' ? keys[(i + keys.length - 1) % keys.length] : null
    if (next) { e.preventDefault(); setFocus(next); tabRefs.current[next]?.focus() }
  }

  const download = () => {
    const blob = new Blob([buildVCard(focus)], { type: 'text/vcard' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `monterroso-${focus}.vcf`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div id="tarjeta" className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center" style={{ ['--focus' as string]: accent[focus] }}>
      <div className="order-2 lg:order-1">
        <div role="tablist" aria-label="Enfoque de la tarjeta" onKeyDown={onKey} className="relative inline-flex gap-1 rounded-full p-1" style={{ background: 'var(--bg)' }}>
          {keys.map((k) => (
            <button
              key={k}
              ref={(el) => { tabRefs.current[k] = el }}
              role="tab"
              id={`tab-${k}`}
              aria-selected={focus === k}
              aria-controls="panel-focus"
              tabIndex={focus === k ? 0 : -1}
              onClick={() => setFocus(k)}
              className="relative min-h-11 rounded-full px-4 text-sm font-semibold"
              style={{ color: focus === k ? 'var(--bg)' : 'var(--ink-soft)', transition: 'color 200ms var(--ease-out)' }}
            >
              {focus === k && (
                <motion.span layoutId="tab-pill" className="absolute inset-0 rounded-full" style={{ background: accent[k] }} transition={{ duration: 0.35, ease }} />
              )}
              <span className="relative">{focuses[k].label}</span>
            </button>
          ))}
        </div>

        <div id="panel-focus" role="tabpanel" aria-labelledby={`tab-${focus}`} className="mt-7 min-h-[17rem]">
          <AnimatePresence mode="wait">
            <motion.div key={focus} initial={{ opacity: 0, transform: 'translateY(10px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }} exit={{ opacity: 0 }} transition={{ duration: 0.26, ease }}>
              <p className="text-sm tracking-wide" style={{ color: 'var(--focus)' }}>{f.role}</p>
              <h3 className="mt-2 font-display text-3xl leading-tight md:text-4xl">{f.headline}</h3>
              <p className="mt-4 max-w-prose" style={{ color: 'var(--ink-soft)' }}>{f.body}</p>
              <ul className="mt-6 grid max-w-md gap-2 text-sm sm:grid-cols-2">
                {f.items.map((it, i) => (
                  <motion.li key={it} initial={{ opacity: 0, transform: 'translateX(-8px)' }} animate={{ opacity: 1, transform: 'translateX(0px)' }} transition={{ duration: 0.4, delay: 0.1 + i * 0.05, ease }} className="flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--line)' }}>
                    <span className="size-1.5 rounded-full" style={{ background: 'var(--focus)' }} aria-hidden />
                    {it}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="order-1 lg:order-2">
        <div className="mx-auto w-full max-w-[560px]" style={{ perspective: 1200 }} onPointerMove={onMove} onPointerLeave={onLeave}>
          <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}>
            <motion.div
              className="relative aspect-[1.75/1] w-full"
              style={{ transformStyle: 'preserve-3d' }}
              animate={{ transform: `rotateY(${flipped ? 180 : 0}deg)` }}
              transition={{ duration: reduce ? 0 : 0.8, ease }}
            >
              <article className="card-face" aria-hidden={flipped}>
                <svg className="guilloche" viewBox="0 0 300 140" preserveAspectRatio="none" aria-hidden>
                  {guilloche.map((d, i) => <path key={i} d={d} />)}
                </svg>
                <AnimatePresence mode="wait">
                  <motion.div key={focus} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                    <Motif focus={focus} />
                  </motion.div>
                </AnimatePresence>
                <motion.div className="pointer-events-none absolute inset-0" style={{ background: spec }} aria-hidden />
                <div className="card-sheen" key={`sheen-${focus}`} aria-hidden />
                <div className="relative flex h-full flex-col justify-between p-[6%]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-display text-[clamp(1.5rem,5vw,2.25rem)] leading-none">Monterroso</p>
                      <p className="mt-2 max-w-[62%] text-[clamp(0.7rem,2vw,0.9rem)] leading-snug" style={{ color: 'var(--focus)' }}>{f.role}</p>
                    </div>
                    <Globe size={30} />
                  </div>
                  <div className="text-[clamp(0.62rem,1.8vw,0.78rem)]" style={{ color: 'var(--ink-soft)' }}>
                    <p className="flex items-center gap-2"><span className="status-dot" aria-hidden />{availability(hour)}</p>
                    <p className="mt-1">{profile.email}</p>
                  </div>
                </div>
                <motion.div className="absolute right-[4%] bottom-[2%] w-[36%]" style={{ x: avX, y: avY }}>
                  <AnimatePresence mode="wait">
                    <motion.div key={avatarProp[focus]} initial={{ opacity: 0, transform: 'translateY(6px)' }} animate={{ opacity: 1, transform: 'translateY(0px)' }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease }}>
                      <Avatar prop={avatarProp[focus]} size={200} />
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </article>

              <article className="card-face card-back" aria-hidden={!flipped}>
                <div className="flex h-full items-center gap-[6%] p-[6%]">
                  {qr && <img src={qr} alt={`Código QR de la tarjeta ${f.label}`} className="aspect-square h-full rounded-lg" />}
                  <div className="min-w-0 text-[clamp(0.7rem,2vw,0.9rem)]">
                    <p className="font-display text-[clamp(1.1rem,3.5vw,1.6rem)]">{f.label}</p>
                    <p className="mt-1 truncate" style={{ color: 'var(--ink-soft)' }}>{profile.email}</p>
                    <p className="truncate" style={{ color: 'var(--ink-soft)' }}>antoniomonterroso.github.io</p>
                  </div>
                </div>
              </article>
            </motion.div>
          </motion.div>
        </div>

        <div className="mx-auto mt-6 flex max-w-[560px] flex-wrap gap-3">
          <button onClick={() => setFlipped((v) => !v)} className="btn btn-ghost" aria-pressed={flipped}>
            <RotateCw size={18} aria-hidden /> {flipped ? 'Ver frente' : 'Ver reverso'}
          </button>
          <button onClick={download} className="btn btn-primary">
            <Download size={18} aria-hidden /> Guardar contacto
          </button>
          <a href={`mailto:${profile.email}`} className="btn btn-ghost">
            <Mail size={18} aria-hidden /> Escribir
          </a>
        </div>
      </div>
    </div>
  )
}
