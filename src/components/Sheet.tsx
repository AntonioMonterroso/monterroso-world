import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect } from 'react'

/** Hoja inferior en teléfono y diálogo centrado en escritorio. */
export default function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-40 grid items-end justify-items-center md:items-center" style={{ background: 'rgba(5,10,24,.6)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onMouseDown={onClose}>
          <motion.div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()} className="sheet-max w-full max-w-lg overflow-auto rounded-t-3xl border p-5 md:rounded-3xl"
            style={{ background: 'var(--surface)', borderColor: 'var(--line)', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
            initial={{ transform: 'translateY(40px)', opacity: 0 }} animate={{ transform: 'translateY(0px)', opacity: 1 }} exit={{ transform: 'translateY(40px)', opacity: 0 }} transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">{title}</h2>
              <button type="button" onClick={onClose} className="grid size-11 place-items-center rounded-full" aria-label="Cerrar"><X size={20} aria-hidden /></button>
            </div>
            <div className="mt-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
