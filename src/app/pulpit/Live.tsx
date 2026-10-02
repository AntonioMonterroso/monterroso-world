import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import Globe from '../../components/Globe'
import { liveChannel, sanitizePayload, type LivePayload } from '../../lib/pulpit'
import { supabase } from '../../lib/supabase'

const ease = [0.23, 1, 0.32, 1] as const

function Brand({ p }: { p: LivePayload['brand'] }) {
  return (
    <div className="grid place-items-center gap-6 text-center">
      {p.logo ? <img src={p.logo} alt="" referrerPolicy="no-referrer" className="max-h-[38vh] max-w-[60vw] object-contain" /> : <Globe size={140} />}
      <p className="font-display text-[clamp(2rem,6vw,5rem)]">{p.name}</p>
    </div>
  )
}

function SlideView({ p }: { p: LivePayload }) {
  const s = p.slide
  if (!s) return <Brand p={p.brand} />
  if (s.kind === 'verse')
    return (
      <div className="mx-auto max-w-[min(92vw,1400px)] text-center">
        <p className="font-display text-[clamp(1.8rem,4.6vw,4.6rem)]" style={{ lineHeight: 1.25 }}>“{s.body}”</p>
        {s.reference && <p className="mt-[3vh] text-[clamp(1.2rem,2.6vw,2.6rem)] font-semibold tracking-wide" style={{ color: 'var(--brass)' }}>{s.reference}</p>}
      </div>
    )
  if (s.kind === 'phrase')
    return <p className="mx-auto max-w-[min(90vw,1300px)] text-center font-display text-[clamp(2.2rem,6vw,6rem)]" style={{ lineHeight: 1.15 }}>{s.body}</p>
  if (s.kind === 'title')
    return (
      <div className="text-center">
        <h1 className="font-display text-[clamp(2.6rem,8vw,8rem)]" style={{ lineHeight: 1.05, color: 'var(--brass)' }}>{s.title}</h1>
        {s.body && <p className="mt-[3vh] text-[clamp(1.4rem,3vw,3rem)]" style={{ color: 'var(--ink-soft)' }}>{s.body}</p>}
      </div>
    )
  if (s.kind === 'image')
    return (
      <div className="grid h-full w-full place-items-center">
        <img src={s.url} alt={s.title ?? ''} referrerPolicy="no-referrer" className="max-h-[92vh] max-w-[96vw] object-contain" />
      </div>
    )
  return (
    <iframe title={s.title ?? 'Presentación'} src={s.url} className="h-full w-full border-0" allow="fullscreen; autoplay; encrypted-media" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" referrerPolicy="no-referrer" />
  )
}

/** Pantalla pública para la iglesia. No lee ninguna tabla: solo recibe lo que el control remoto le envía. */
export default function Live() {
  const { token } = useParams()
  const [p, setP] = useState<LivePayload | null>(null)
  const [online, setOnline] = useState(false)
  const got = useRef(false)

  useEffect(() => {
    if (!token || !/^[a-f0-9]{16,64}$/i.test(token)) return
    const ch = supabase.channel(liveChannel(token), { config: { broadcast: { self: false }, presence: { key: `display-${Math.random().toString(36).slice(2, 8)}` } } })
    let hello: ReturnType<typeof setInterval> | undefined
    ch.on('broadcast', { event: 'slide' }, ({ payload }) => {
      const clean = sanitizePayload(payload)
      if (clean) { got.current = true; setP(clean) }
    }).subscribe((status) => {
      setOnline(status === 'SUBSCRIBED')
      if (status === 'SUBSCRIBED') {
        ch.track({ role: 'display' })
        const ask = () => ch.send({ type: 'broadcast', event: 'hello', payload: {} })
        ask()
        hello = setInterval(() => { if (!got.current) ask() }, 8000)
      }
    })
    return () => { clearInterval(hello); supabase.removeChannel(ch) }
  }, [token])

  const key = p?.slide ? `${p.index}-${p.slide.kind}-${p.slide.url ?? p.slide.body ?? p.slide.title}` : 'brand'

  return (
    <div className="fixed inset-0 grid place-items-center overflow-hidden" style={{ background: 'radial-gradient(ellipse at 50% 30%, #17315c 0%, #08111f 70%)', cursor: 'none' }}>
      <AnimatePresence mode="wait">
        <motion.div key={key} className="grid h-full w-full place-items-center p-[3vw]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.45, ease }}>
          {p ? <SlideView p={p} /> : <Brand p={{ name: 'Monterroso World', logo: null }} />}
        </motion.div>
      </AnimatePresence>
      <span className="fixed right-3 bottom-3 size-2 rounded-full" style={{ background: online ? 'var(--pos)' : 'var(--neg)', opacity: 0.5 }} role="status" aria-label={online ? 'Conectado' : 'Reconectando'} />
    </div>
  )
}
