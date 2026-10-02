import { motion, useDragControls, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

const useDesktop = () => {
  const q = typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)') : null
  const [d, setD] = useState(q?.matches ?? false)
  useEffect(() => {
    if (!q) return
    const h = () => setD(q.matches)
    q.addEventListener('change', h)
    return () => q.removeEventListener('change', h)
  }, [q])
  return d
}

/** Hoja inferior en teléfono (se arrastra hacia abajo para cerrar, con el impulso del gesto) y diálogo centrado en escritorio. */
export default function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const desktop = useDesktop()
  const calm = useReducedMotion()
  const y = useMotionValue(0)
  const scrim = useTransform(y, [0, 360], [1, 0.15])
  const controls = useDragControls()

  // La hoja se desmonta con un temporizador propio: nunca depende de que termine una animación,
  // y mientras se cierra deja pasar los toques, así que jamás puede dejar la pantalla bloqueada.
  const [mounted, setMounted] = useState(open)
  useEffect(() => {
    if (open) { setMounted(true); return }
    const t = setTimeout(() => { setMounted(false); y.set(0) }, 380)
    return () => clearTimeout(t)
  }, [open, y])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])

  const enter = calm ? { opacity: 0 } : desktop ? { opacity: 0, scale: 0.97, y: 12 } : { y: '100%' }
  const shown = calm ? { opacity: 1 } : desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }

  if (!mounted) return null
  return (
    <>
      {(
        <motion.div className="fixed inset-0 z-40 grid items-end justify-items-center md:items-center" style={{ pointerEvents: open ? 'auto' : 'none' }} initial={{ opacity: 0 }} animate={{ opacity: open ? 1 : 0 }} transition={{ duration: 0.22 }}>
          <motion.div className="sheet-scrim absolute inset-0" style={{ background: 'rgba(4,8,18,.55)', opacity: scrim }} onPointerDown={onClose} aria-hidden />
          <motion.div role="dialog" aria-modal="true" aria-label={title} className="sheet-max relative w-full max-w-lg overflow-auto rounded-t-[28px] p-5 pt-2 md:rounded-[28px] md:pt-5"
            style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-pop)', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))', y: desktop ? undefined : y, touchAction: 'pan-y' }}
            initial={enter} animate={open ? shown : enter} transition={calm ? { duration: 0.18 } : { type: 'spring', bounce: 0, duration: 0.45 }}
            drag={desktop || calm ? false : 'y'} dragControls={controls} dragListener={false} dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.04, bottom: 0.7 }}
            onDragEnd={(_, info) => { if (info.offset.y + info.velocity.y * 0.25 > 150) onClose() }}>
            {/* Asa: solo desde aquí se arrastra, para no pelear con el desplazamiento del contenido */}
            <div className="sheet-grab md:hidden" onPointerDown={(e) => controls.start(e)} aria-hidden><span /></div>
            <div className="flex items-center justify-between" onPointerDown={(e) => { if (!desktop && !(e.target as HTMLElement).closest('button')) controls.start(e) }}>
              <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
              <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full" style={{ background: 'var(--surface-2)' }} aria-label="Cerrar"><X size={18} aria-hidden /></button>
            </div>
            <div className="mt-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </>
  )
}
