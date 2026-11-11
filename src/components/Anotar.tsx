import { useEffect, useMemo, useRef, useState } from 'react'
import { Mic } from 'lucide-react'
import Sheet from './Sheet'
import VoiceNotes from './VoiceNotes'
import { EXPENSE_CATEGORIES, KIND_LABEL, SWITCHABLE, entender, keyWord, takeDate, takeTime, type Entendido, type Kind, type Learned } from '../lib/anotar'
import { monthlyClients } from '../lib/incoming'
import { currentMonth, money, useProjects } from '../lib/projects'
import { getSettings, patchSettings } from '../lib/settings'
import { supabase } from '../lib/supabase'
import { localISO } from '../lib/time'
import { useTable } from '../lib/table'
import { lastAccount } from '../app/money/AccountPick'

export type Saved = { label: string; undo: () => Promise<void> }

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Cuando eliges a mano otro tipo, arma lo que haga falta a partir del texto. */
function coerce(base: Entendido, kind: Kind, text: string, today: string): Entendido {
  if (base.kind === kind) return base
  const num = text.match(/(\d+(?:[.,]\d+)?)/)
  const amount = num ? Number(num[1].replace(',', '.')) : undefined
  const rest = text.replace(/[+]?\s*q?\s*\d+(?:[.,]\d+)?/i, '').trim() || text
  if (kind === 'gasto' || kind === 'ingreso') return { kind, amount, title: cap(rest), category: kind === 'gasto' ? 'Otros' : 'Otros', area: 'personal', date: today, label: `${KIND_LABEL[kind]}${amount ? ` · Q ${amount.toFixed(2)}` : ' · falta el monto'}` }
  if (kind === 'evento') { const d = takeDate(text, today); const t = takeTime(d.rest); return { kind, title: cap(t.rest || text), date: d.date ?? today, startMin: t.min ?? 9 * 60, eventKind: 'other', label: 'Evento' } }
  if (kind === 'comprar') return { kind, title: cap(text), category: 'Súper y comida', label: `Por comprar · ${cap(text)}` }
  if (kind === 'promesa') { const d = takeDate(text, today); return { kind, title: cap(d.rest || text), date: d.date ?? undefined, label: 'Promesa' } }
  return { kind: 'bandeja', title: text, label: 'Bandeja · lo clasificas después' }
}

/** ＋ Anotar: escribes como hablas, ves lo que entendió y Enter guarda. Si te equivocas, Deshacer. */
export default function Anotar({ open, initial = '', inboxId = null, onClose, onSaved }: { open: boolean; initial?: string; inboxId?: string | null; onClose: () => void; onSaved?: (s: Saved) => void }) {
  const work = useProjects()
  const accountsDb = useTable<{ id: string; name: string; archived?: boolean }>('fin_accounts', { col: 'position', asc: true })
  const [text, setText] = useState('')
  const [forced, setForced] = useState<Kind | null>(null)
  const [cat, setCat] = useState<string | null>(null)
  const [learned, setLearned] = useState<Learned>({})
  const [menu, setMenu] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const field = useRef<HTMLTextAreaElement>(null)
  // Dictado con el reconocimiento de voz del navegador (gratis, sin servicios externos de pago)
  type Rec = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }
  const SR = (typeof window !== 'undefined' ? ((window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: new () => Rec }).webkitSpeechRecognition) : undefined)
  const recRef = useRef<Rec | null>(null)
  const [listening, setListening] = useState(false)
  const dictate = () => {
    if (!SR) return
    if (listening) { recRef.current?.stop(); return }
    const r = new SR(); r.lang = 'es-GT'; r.interimResults = false; r.continuous = false
    r.onresult = (ev) => { const said = Array.from(ev.results).map((x) => x[0].transcript).join(' ').trim(); if (said) setText((cur) => (cur.trim() ? `${cur.trim()} ${said}` : said)) }
    r.onend = () => setListening(false); r.onerror = () => setListening(false)
    recRef.current = r; setListening(true); r.start()
  }
  const today = localISO()

  useEffect(() => {
    if (!open) return
    setErr(''); setForced(null); setCat(null); setMenu(false); setText(initial)
    setTimeout(() => field.current?.focus(), 80)
    void getSettings().then((s) => setLearned(((s as { anotarWords?: Learned }).anotarWords) ?? {}))
  }, [open, initial])

  const ctx = useMemo(() => ({ today, clients: work.projects.map((p) => ({ id: p.id, title: p.title, client: p.client })), learned, accounts: accountsDb.rows.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name })) }), [today, work.projects, learned, accountsDb.rows])
  const auto = useMemo(() => entender(text, ctx), [text, ctx])
  const e0 = useMemo(() => (forced ? coerce(auto, forced, text, today) : auto), [auto, forced, text, today])
  const e: Entendido = cat && (e0.kind === 'gasto' || e0.kind === 'ingreso') ? { ...e0, category: cat, label: `${KIND_LABEL[e0.kind]} · ${cat} · Q ${(e0.amount ?? 0).toFixed(2)}` } : e0
  const lineCount = text.split('\n').filter((x) => x.trim()).length
  const needsAmount = lineCount <= 1 && (e.kind === 'gasto' || e.kind === 'ingreso') && !(e.amount && e.amount > 0)

  const cycleCategory = () => {
    const i = EXPENSE_CATEGORIES.indexOf(e.category ?? '')
    setCat(EXPENSE_CATEGORIES[(i + 1) % EXPENSE_CATEGORIES.length])
  }

  const del = (table: string, id: string) => async () => { await supabase.from(table).delete().eq('id', id) }

  const save = async () => {
    const t = text.trim()
    if (!t || busy || needsAmount) return
    setBusy(true); setErr('')
    try {
      const persist = async (e: Entendido, t: string, auto: Entendido): Promise<Saved | null> => {
        let saved: Saved | null = null
        if (e.kind === 'gasto' || e.kind === 'ingreso') {
          const acct = lastAccount()
          const { data, error } = await supabase.from('fin_transactions').insert({ kind: e.kind === 'gasto' ? 'expense' : 'income', amount: e.amount, currency: 'GTQ', category: e.category ?? 'Otros', area: e.area ?? 'personal', tx_date: e.date ?? today, note: e.title ?? null, ...(acct ? { account_id: acct } : {}) }).select('id').single()
          if (error || !data) throw new Error('No pude guardar el movimiento.')
          saved = { label: `${KIND_LABEL[e.kind]} guardado`, undo: del('fin_transactions', data.id) }
          // aprende: si cambiaste la categoría a mano, la próxima vez ya la pone
          const w = keyWord(e.title ?? '')
          if (w && e.kind === 'gasto' && e.category && e.category !== auto.category) {
            const next = { ...learned, [w]: { category: e.category } }
            setLearned(next); void patchSettings({ anotarWords: next } as never)
          }
        } else if (e.kind === 'cobro') {
          const p = work.projects.find((x) => x.id === e.clientId)
          if (!p) throw new Error('No encontré al cliente.')
          const row = monthlyClients([p], work.payments, currentMonth(), new Date())[0]
          const acct = p.account_id ?? (lastAccount() || null)
          let amount: number, kind: 'monthly' | 'setup' | 'other', period: string | null = null
          if (e.amount) {
            // Con monto: si es la mensualidad o la instalación que toca, se anota como tal; si no, es un pago aparte
            amount = e.amount
            const m0 = row?.lateMonths[0] ?? (row && row.state !== 'paid' ? currentMonth() : null)
            if (row && m0 && Math.abs(amount - row.fee) < 0.01) { kind = 'monthly'; period = m0 }
            else if (row && row.setupDue > 0 && Math.abs(amount - row.setupDue) < 0.01) kind = 'setup'
            else kind = 'other'
          } else {
            if (!row || row.owed <= 0) throw new Error(`${p.title} no tiene nada por cobrar. Escribe el monto: «${p.title} pagó 500».`)
            period = row.lateMonths[0] ?? (row.state !== 'paid' ? currentMonth() : null)
            kind = !period && row.setupDue > 0 ? 'setup' : 'monthly'
            amount = kind === 'setup' ? row.setupDue : row.fee
            if (kind === 'setup') period = null
          }
          const pay = await work.addPayment({ project_id: p.id, amount, due_date: null, paid_at: e.date ?? today, method: null, note: null, kind, period, account_id: acct })
          if (!pay) throw new Error('No pude registrar el pago.')
          saved = { label: `Pago de ${p.title} · ${money(pay.amount)}`, undo: async () => { await work.removePayment(pay.id) } }
        } else if (e.kind === 'transferencia' && e.fromId && e.toId) {
          const { data, error } = await supabase.from('fin_transfers').insert({ from_id: e.fromId, to_id: e.toId, amount: e.amount, fee: 0, tx_date: e.date ?? today }).select('id').single()
          if (error || !data) throw new Error('No pude registrar la transferencia.')
          saved = { label: `Transferencia ${e.title} guardada`, undo: del('fin_transfers', data.id) }
        } else if (e.kind === 'evento') {
          const { data, error } = await supabase.from('events').insert({ type: 'event', title: e.title, kind: e.eventKind ?? 'other', start_date: e.date ?? today, start_min: e.startMin ?? 9 * 60, repeat: 'none', alerts: [10] }).select('id').single()
          if (error || !data) throw new Error('No pude crear el evento.')
          saved = { label: 'Evento guardado en Agenda', undo: del('events', data.id) }
        } else if (e.kind === 'comprar') {
          const { data, error } = await supabase.from('shopping_items').insert({ name: e.title, category: e.category ?? 'Súper y comida', priority: 2, currency: 'GTQ', status: 'pending' }).select('id').single()
          if (error || !data) throw new Error('No pude agregarlo a Por comprar.')
          saved = { label: 'Agregado a Por comprar', undo: del('shopping_items', data.id) }
        } else if (e.kind === 'prestado') {
          const { data, error } = await supabase.from('stuff').insert({ name: e.title, kind: 'lent', person: e.person ?? null }).select('id').single()
          if (error || !data) throw new Error('No pude anotar lo prestado.')
          saved = { label: 'Cosa prestada guardada', undo: del('stuff', data.id) }
        } else if (e.kind === 'promesa') {
          const { data, error } = await supabase.from('promises').insert({ text: e.title, person: e.person ?? null, due_date: e.date ?? null }).select('id').single()
          if (error || !data) throw new Error('No pude guardar la promesa.')
          saved = { label: 'Promesa guardada', undo: del('promises', data.id) }
        } else if (e.kind === 'video' && e.videoId) {
          const { data, error } = await supabase.from('videos').insert({ provider: 'youtube', video_id: e.videoId, title: e.title, status: 'queue' }).select('id').single()
          if (error || !data) throw new Error('No pude guardar el video.')
          saved = { label: 'Video guardado en Aprender', undo: del('videos', data.id) }
        } else if (e.kind === 'enlace' && e.url) {
          const { data, error } = await supabase.from('links').insert({ url: e.url, title: e.title, category: 'Otros' }).select('id').single()
          if (error || !data) throw new Error('No pude guardar el enlace.')
          saved = { label: 'Enlace guardado en Links', undo: del('links', data.id) }
        } else {
          const body = e.kind === 'idea' ? `Idea: ${e.title}` : t
          const { data, error } = await supabase.from('inbox_items').insert({ text: body }).select('id').single()
          if (error || !data) throw new Error('No pude guardarlo.')
          saved = { label: e.kind === 'idea' ? 'Idea guardada en Pendientes' : 'Anotado en Pendientes', undo: del('inbox_items', data.id) }
        }
        return saved
      }
      const lines = t.split('\n').map((x) => x.trim()).filter(Boolean)
      let saved: Saved | null
      if (lines.length > 1 && !forced) {
        // Varias cosas a la vez: una por línea, cada una con sus propias reglas
        const done: Saved[] = []
        for (const ln of lines) { const one = entender(ln, ctx); const r = await persist(one.kind === 'gasto' || one.kind === 'ingreso' ? one : one, ln, one); if (r) done.push(r) }
        saved = { label: `${done.length} ${done.length === 1 ? 'cosa guardada' : 'cosas guardadas'}`, undo: async () => { for (const d of done) await d.undo() } }
      } else saved = await persist(e, t, auto)
      // Si venía de Pendientes («Clasificar»), el original ya no hace falta
      if (inboxId && e.kind !== 'bandeja') await supabase.from('inbox_items').delete().eq('id', inboxId)
      setText(''); onClose()
      if (saved) onSaved?.(saved)
    } catch (x) { setErr(x instanceof Error ? x.message : 'No se pudo guardar.') } finally { setBusy(false) }
  }

  return (
    <Sheet open={open} title="Anotar" onClose={onClose}>
      <form className="grid gap-3" onSubmit={(ev) => { ev.preventDefault(); void save() }}>
        <label className="sr-only" htmlFor="anotar-in">Lo que quieres anotar</label>
        <textarea id="anotar-in" ref={field} className="field min-h-24" value={text} maxLength={2000} rows={3} onChange={(ev) => { setText(ev.target.value); setForced(null); setCat(null) }}
          placeholder="Q 45 almuerzo · ensayo vie 7pm · comprar leche… (una cosa por línea si son varias)"
          onKeyDown={(ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); void save() } }} />
        {SR && <button type="button" className="chip-btn w-fit" aria-pressed={listening} onClick={dictate}><Mic size={16} aria-hidden /> {listening ? 'Escuchando… toca para terminar' : 'Dictar'}</button>}
        {lineCount > 1 && <p className="text-sm" aria-live="polite">Se guardarán <strong>{lineCount} cosas</strong>, una por línea, cada una en su lugar.</p>}
        {text.trim() && lineCount <= 1 && (
          <div className="flex flex-wrap items-center gap-2" aria-live="polite">
            <button type="button" className="chip-btn" aria-expanded={menu} onClick={() => setMenu((v) => !v)} aria-label={`Entendí: ${e.label}. Toca para cambiar el tipo`}>{e.label}</button>
            {(e.kind === 'gasto' || e.kind === 'ingreso') && e.kind === 'gasto' && <button type="button" className="chip-btn" onClick={cycleCategory} aria-label="Cambiar categoría">Categoría: {e.category}</button>}
          </div>
        )}
        {menu && <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo">{SWITCHABLE.map((k) => <button key={k} type="button" className="chip-btn" aria-pressed={e.kind === k} onClick={() => { setForced(k); setMenu(false) }}>{KIND_LABEL[k]}</button>)}</div>}
        {needsAmount && <p className="text-sm" style={{ color: 'var(--aviso-texto)' }}>Escribe el monto, por ejemplo «Q 45 almuerzo».</p>}
        {err && <p role="alert" className="text-sm" style={{ color: 'var(--aviso-texto)' }}>{err}</p>}
        <p className="text-xs" style={{ color: 'var(--ink-soft)' }}>Enter guarda. Si no reconoce nada, queda en Pendientes para después.</p>
        <button className="btn btn-primary" disabled={!text.trim() || busy || needsAmount}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </form>
      <details className="mt-4"><summary className="min-h-11 cursor-pointer text-sm font-semibold">Prefiero grabar una nota de voz</summary><div className="mt-2"><VoiceNotes /></div></details>
    </Sheet>
  )
}
