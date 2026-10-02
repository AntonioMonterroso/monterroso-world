import { ShoppingBag } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PRIORITIES, pendingTotals, sortShopping, type ShopItem } from '../lib/inspire'
import { money } from '../lib/projects'
import { useTable } from '../lib/table'
import { Row } from './ui'

const SHOW = 4

/** Lo que tienes pendiente por comprar, lo más importante primero. Marcar uno lleva a confirmar el precio (y registrarlo como gasto). */
export default function ShoppingSpotlight() {
  const db = useTable<ShopItem>('shopping_items', { col: 'created_at', asc: false })
  const nav = useNavigate()
  const pending = useMemo(() => sortShopping(db.rows.filter((i) => i.status === 'pending')), [db.rows])
  const total = useMemo(() => Object.values(pendingTotals(db.rows))[0] ?? 0, [db.rows])
  if (db.loading || pending.length === 0) return null

  const shown = pending.slice(0, SHOW)
  const rest = pending.length - shown.length

  return (
    <section className="group-sec !mt-0" aria-labelledby="comprar-hoy">
      <div className="group-head">
        <h3 id="comprar-hoy" className="flex items-center gap-1.5"><ShoppingBag size={14} aria-hidden /> Por comprar</h3>
        <span>{total > 0 ? `${money(total)} en total` : `${pending.length} ${pending.length === 1 ? 'pendiente' : 'pendientes'}`}</span>
      </div>
      <ul className="group-list">
        {shown.map((i) => {
          const pr = PRIORITIES.find((p) => p.id === i.priority)!
          return (
            <Row key={i.id} tone={pr.color} icon={<ShoppingBag size={16} aria-hidden />} title={i.name} chevron={false} to="/app/compras"
              sub={<><span style={{ color: i.priority === 1 ? 'var(--neg)' : undefined }}>{pr.label}</span>{i.store ? ` · ${i.store}` : ` · ${i.category}`}</>}
              value={i.price ? money(Number(i.price)) : undefined} valueTone="soft"
              trailing={<button className="buy-check" aria-label={`Ya compré ${i.name}`} onClick={() => nav(`/app/compras?comprar=${i.id}`)}><span /></button>} />
          )
        })}
      </ul>
      <p className="group-foot"><Link to="/app/compras" className="underline">{rest > 0 ? `Ver las ${pending.length} cosas de tu lista` : 'Abrir mi lista'}</Link></p>
    </section>
  )
}
