import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import Avatar, { propForHour, props, type Prop } from './Avatar'

const labels: Record<Prop, string> = {
  laptop: 'Programando', guitar: 'Tocando guitarra', drums: 'En la batería', piano: 'Al piano', wave: 'Saludando', rest: 'Descansando',
}

export default function HeroAvatar() {
  const [hour, setHour] = useState(() => new Date().getHours())
  const [override, setOverride] = useState<Prop | null>(null)
  const [hop, setHop] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setHour(new Date().getHours()), 60_000)
    return () => clearInterval(t)
  }, [])

  const current = override ?? propForHour(hour)
  const cycle = () => {
    setOverride(props[(props.indexOf(current) + 1) % props.length])
    setHop((n) => n + 1)
  }

  return (
    <figure className="relative mx-auto w-full max-w-[260px]">
      <div className="relative grid aspect-square place-items-center">
        <div className="absolute inset-[6%] rounded-full" style={{ background: 'radial-gradient(closest-side, color-mix(in oklab, var(--glow) 20%, transparent), transparent)' }} aria-hidden />
        <div className="absolute bottom-[7%] h-[5%] w-[56%] rounded-[50%]" style={{ background: 'radial-gradient(closest-side, rgba(0,0,0,.45), transparent)' }} aria-hidden />
        <button onClick={cycle} className="relative cursor-pointer rounded-3xl" aria-label={`Avatar: ${labels[current]}. Toca para cambiar de actividad`}>
          <AnimatePresence mode="wait">
            <motion.div key={current + hop} initial={{ opacity: 0, transform: 'translateY(8px) scale(0.96)' }} animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }} exit={{ opacity: 0 }} transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}>
              <Avatar prop={current} size={250} hop={hop > 0} />
            </motion.div>
          </AnimatePresence>
        </button>
      </div>
      <figcaption className="mt-1 text-center text-sm" style={{ color: 'var(--ink-soft)' }} aria-live="polite">
        {override ? labels[current] : `Ahora: ${labels[current].toLowerCase()}`}
        <span className="block text-xs" style={{ color: 'var(--ink-faint)' }}>Toca al avatar</span>
      </figcaption>
    </figure>
  )
}
