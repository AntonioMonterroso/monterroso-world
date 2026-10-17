/** Cotizaciones: precios públicos, propuestas por cliente y sus cuentas. Todo en quetzales. */
export type Feature = { text: string; included: boolean }
export type Pkg = { id: string; name: string; tagline: string | null; kind: 'closed' | 'custom'; setup_fee: number; monthly_fee: number; price_note: string | null; features: Feature[]; recommended: boolean; published: boolean; position: number }
export type Extra = { id: string; name: string; detail: string | null; amount: number; period: 'once' | 'month' | 'year'; approx: boolean; published: boolean; position: number }
export type Step = { title: string; text: string }
export type Faq = { q: string; a: string }
export type PageData = {
  brand: string; kicker: string; headline: string; sub: string
  monthlyTitle: string; monthlyText: string
  steps: Step[]; faq: Faq[]
  validity_days: number; footer: string
  phone: string; phone_display: string; whatsapp_text: string
  customTitle: string; customText: string
}
export type Period = 'once' | 'month' | 'year'
export type Line = { id: string; label: string; detail?: string; qty: number; unit: number; period: Period; optional?: boolean; on?: boolean }
export type IvaMode = 'none' | 'included' | 'added'
export type Template = 'web' | 'citas' | 'programa' | 'custom'
export type Status = 'draft' | 'sent' | 'accepted' | 'rejected'
export type Section = { title: string; items: string[] }
export type Body = { intro: string; sections: Section[]; exclusions: string[]; support: string; process: Step[]; conditions: string[]; notes: string }
export type Quote = { id: string; number: string; title: string; client_name: string; client_contact: string | null; template: Template; status: Status; lines: Line[]; iva: IvaMode; upfront_pct: number; valid_until: string | null; body: Body; shared: boolean; share_token: string | null; project_id: string | null; created_at?: string }

export const IVA_RATE = 0.12
export const PERIOD_LABEL: Record<Period, string> = { once: 'una vez', month: 'al mes', year: 'al año' }
export const STATUS_LABEL: Record<Status, string> = { draft: 'Borrador', sent: 'Enviada', accepted: 'Aceptada', rejected: 'Rechazada' }
export const TEMPLATE_LABEL: Record<Template, string> = { web: 'Página o sistema web', citas: 'Sistema de citas', programa: 'Programa a la medida', custom: 'En blanco' }

const r2 = (n: number) => Math.round(n * 100) / 100
export const uid = () => crypto.randomUUID().slice(0, 8)

// ───────── Cuentas ─────────
export type Amt = { base: number; iva: number; total: number }
export type Totals = { once: Amt; month: Amt; year: Amt }
export const lineTotal = (l: Pick<Line, 'qty' | 'unit'>) => r2(Math.max(0, Number(l.qty) || 0) * Math.max(0, Number(l.unit) || 0))
/** Una línea cuenta si es obligatoria o si la activaste (las opcionales empiezan apagadas). */
export const lineOn = (l: Line) => !l.optional || l.on === true

function amt(sum: number, iva: IvaMode): Amt {
  const s = r2(sum)
  if (iva === 'added') { const ivaAmt = r2(s * IVA_RATE); return { base: s, iva: ivaAmt, total: r2(s + ivaAmt) } }
  if (iva === 'included') { const base = r2(s / (1 + IVA_RATE)); return { base, iva: r2(s - base), total: s } }
  return { base: s, iva: 0, total: s }
}
/** Totales por periodo: lo que se paga una vez, cada mes y cada año. El IVA es opcional y se decide por propuesta. */
export function totalsOf(lines: Line[], iva: IvaMode): Totals {
  const by = (p: Period) => lines.filter((l) => l.period === p && lineOn(l)).reduce((s, l) => s + lineTotal(l), 0)
  return { once: amt(by('once'), iva), month: amt(by('month'), iva), year: amt(by('year'), iva) }
}

/** Estructura de pagos de lo que se paga una vez: un porcentaje al iniciar y el resto al entregar. */
export function paymentPlan(once: number, upfrontPct: number): { label: string; pct: number; amount: number }[] {
  if (!(once > 0)) return []
  const pct = Math.min(100, Math.max(0, Math.round(upfrontPct)))
  if (pct >= 100) return [{ label: 'Al confirmar', pct: 100, amount: r2(once) }]
  if (pct <= 0) return [{ label: 'Al entregar', pct: 100, amount: r2(once) }]
  const first = r2((once * pct) / 100)
  return [{ label: 'Al confirmar', pct, amount: first }, { label: 'Al entregar', pct: 100 - pct, amount: r2(once - first) }]
}

/** Número consecutivo por año: COT-2026-001. */
export function nextNumber(existing: string[], year: number): string {
  const re = new RegExp(`^COT-${year}-(\\d+)$`)
  const max = existing.reduce((m, n) => { const x = re.exec(n); return x ? Math.max(m, Number(x[1])) : m }, 0)
  return `COT-${year}-${String(max + 1).padStart(3, '0')}`
}

export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
export const isExpired = (validUntil: string | null, today: string) => Boolean(validUntil) && (validUntil as string) < today

export function newToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(18))
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export const isToken = (t: string) => /^[A-Za-z0-9_-]{16,64}$/.test(t)

export const waLink = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`

// ───────── Página pública: elegir paquete y extras ─────────
export type Choice = { pkg?: Pkg; extras: Extra[] }
/** Lo que pagaría alguien que elige un paquete y algunos extras: una vez, cada mes y cada año. */
export function pickTotals(p: Choice): { once: number; month: number; year: number } {
  let once = Number(p.pkg?.setup_fee ?? 0), month = Number(p.pkg?.monthly_fee ?? 0), year = 0
  for (const e of p.extras) { if (e.period === 'once') once += Number(e.amount); else if (e.period === 'month') month += Number(e.amount); else year += Number(e.amount) }
  return { once: r2(once), month: r2(month), year: r2(year) }
}
/** Las líneas de una propuesta que salen de un paquete y sus extras. */
export function linesFromPick(p: Choice): Line[] {
  const out: Line[] = []
  if (p.pkg) {
    if (p.pkg.setup_fee > 0) out.push({ id: uid(), label: `Activación · ${p.pkg.name}`, detail: 'Pago único para comenzar', qty: 1, unit: Number(p.pkg.setup_fee), period: 'once' })
    if (p.pkg.monthly_fee > 0) out.push({ id: uid(), label: `Mensualidad · ${p.pkg.name}`, detail: p.pkg.tagline ?? undefined, qty: 1, unit: Number(p.pkg.monthly_fee), period: 'month' })
  }
  for (const e of p.extras) out.push({ id: uid(), label: e.name, detail: e.detail ?? undefined, qty: 1, unit: Number(e.amount), period: e.period })
  return out
}

// ───────── Contenido de arranque ─────────
const f = (text: string, included = true): Feature => ({ text, included })
export const DEFAULT_PAGE: PageData = {
  brand: 'Monterroso Dev Studio',
  kicker: 'Precios y servicios',
  headline: 'Sistemas y páginas web para tu negocio',
  sub: 'Elige un paquete listo o cuéntame tu idea y la cotizo a tu medida. Precios en quetzales, sin letra pequeña.',
  monthlyTitle: 'Qué incluye la mensualidad',
  monthlyText: 'El sistema funcionando 24/7, soporte por WhatsApp, cambios de precios, fotos y ajustes pequeños, actualizaciones continuas, respaldo diario de datos y la infraestructura. Mínimo de permanencia inicial de 3 meses. Tus datos son 100% tuyos. Los cambios grandes se analizan y pueden ajustar la mensualidad.',
  steps: [
    { title: 'Inicio del proyecto', text: 'Se abona la activación para comenzar con tu marca, logotipo, precios e imágenes.' },
    { title: 'Configuración e integración', text: 'Dejamos listo tu catálogo, horarios y el panel de administración en tu teléfono.' },
    { title: 'Capacitación (30 min)', text: 'Te muestro cómo usar tu panel, gestionar tu información y revisar tus números.' },
    { title: 'Entrega y puesta en marcha', text: 'Se entrega en aproximadamente 1 semana, o menos, listo para compartir con tus clientes.' },
  ],
  faq: [
    { q: '¿Cómo reservan mis clientes?', a: 'Eligen el servicio, la fecha y la hora disponible y confirman con su nombre y teléfono, sin crear contraseñas.' },
    { q: '¿Y si prefieren escribirme?', a: 'Pueden seguir escribiéndote por WhatsApp con el botón integrado en la página.' },
    { q: '¿Mis datos están seguros?', a: 'Sí. Tu base de clientes, historial y finanzas son privados y solo se ven desde tu cuenta de administrador.' },
    { q: '¿Puedo cambiar de paquete después?', a: 'Sí. Puedes empezar con uno y subir al otro cuando quieras, pagando solo la diferencia.' },
  ],
  validity_days: 15,
  footer: 'Precios expresados en quetzales. Si necesitas factura con IVA, se agrega el 12% al total. Los montos del dominio son aproximados y los fijan los proveedores globales.',
  phone: '50237645139', phone_display: '3764 5139', whatsapp_text: 'Hola, vi tus precios y me interesa',
  customTitle: 'A tu medida', customText: 'Programas y sistemas hechos para tu operación: contabilidad, inventarios, citas, paneles. Hacemos un análisis, definimos módulos y te entrego una propuesta formal.',
}
export const SEED_PACKAGES: Omit<Pkg, 'id'>[] = [
  { name: 'Página de presentación', tagline: 'Tu vitrina en internet. Muestra tu negocio de manera profesional.', kind: 'closed', setup_fee: 500, monthly_fee: 250, price_note: null, recommended: false, published: true, position: 1,
    features: [f('Diseño propio con tus colores, logo y fotos'), f('Catálogo de servicios con precios'), f('Estilos, ubicación y horario'), f('Botón de WhatsApp para pedir cita'), f('Vista previa bonita al compartir el link'), f('Sin reservas en línea', false), f('Sin panel de administración', false)] },
  { name: 'Sistema completo de citas', tagline: 'Todo lo anterior, más el sistema automatizado que trabaja por ti.', kind: 'closed', setup_fee: 600, monthly_fee: 350, price_note: null, recommended: true, published: true, position: 2,
    features: [f('Reserva en línea con horas libres en tiempo real'), f('El cliente confirma, reprograma o cancela solo'), f('Panel en el teléfono (se instala como app)'), f('Avisos al teléfono: cita nueva, cancelación, confirmación'), f('Recordatorio de mañana por WhatsApp en un toque'), f('Clientes, faltas, cumpleaños y ficha de preferencias'), f('Descansos, bloqueos y lista de espera'), f('Puntos de fidelidad, referidos y combos (opcionales)'), f('Finanzas: ingresos, gastos, reportes y cierre de caja'), f('Recibo en imagen para enviar al cliente'), f('Datos de clientes totalmente protegidos y privados')] },
  { name: 'Programa a tu medida', tagline: 'Sistemas hechos para tu operación, con módulos a tu elección.', kind: 'custom', setup_fee: 0, monthly_fee: 0, price_note: 'Se cotiza según módulos', recommended: false, published: true, position: 3,
    features: [f('Análisis de lo que necesitas'), f('Módulos a tu elección'), f('Instalación, adecuación y capacitación'), f('Soporte y garantía inicial'), f('Respaldo de la información'), f('Propuesta formal por escrito')] },
]
export const SEED_EXTRAS: Omit<Extra, 'id'>[] = [
  { name: 'Dominio propio (.com)', detail: 'Tu cliente entra escribiendo tunegocio.com. Se registra a tu nombre y se paga al registrador; ronda entre US$10 y US$11 al año.', amount: 85, period: 'year', approx: true, published: true, position: 1 },
]

const proc = (a: [string, string][]): Step[] => a.map(([title, text]) => ({ title, text }))
export const TEMPLATES: Record<Template, { intro: string; sections: Section[]; exclusions: string[]; support: string; process: Step[]; conditions: string[] }> = {
  web: {
    intro: 'Con gusto te presento esta propuesta para tu página web: una vitrina profesional que muestra lo que ofreces y facilita que tus clientes te contacten.',
    sections: [{ title: 'Qué incluye', items: ['Diseño propio con tus colores, logo y fotos', 'Catálogo de servicios con precios', 'Ubicación, horarios y botón de WhatsApp', 'Vista previa al compartir el enlace', 'Publicación y puesta en marcha'] }],
    exclusions: ['Reservas en línea y panel de administración (disponibles en un paquete superior)', 'Registro del dominio, que se paga aparte al registrador'],
    support: 'La mensualidad incluye el sitio funcionando, soporte por WhatsApp, cambios pequeños y respaldo. Los cambios grandes se analizan y pueden ajustar el precio.',
    process: proc([['Inicio', 'Se abona la activación y recibo tu marca y contenido.'], ['Diseño y configuración', 'Armo tu sitio y lo revisamos juntos.'], ['Entrega', 'Publicación en aproximadamente 1 semana.']]),
    conditions: ['Mínimo de permanencia inicial de 3 meses.', 'Los datos y contenidos son tuyos.'],
  },
  citas: {
    intro: 'Con gusto te presento esta propuesta de sistema de citas: tus clientes reservan solos desde el teléfono, tú ves todo el día en una pantalla y los recordatorios salen casi solos.',
    sections: [
      { title: 'Para tus clientes', items: ['Reserva en línea con horas libres en tiempo real', 'Confirmar, reprogramar o cancelar sin contraseñas', 'Botón de WhatsApp para escribirte directamente'] },
      { title: 'Para ti', items: ['Panel en el teléfono (se instala como app)', 'Avisos de cita nueva, cancelación y confirmación', 'Clientes, faltas, cumpleaños y preferencias', 'Descansos, bloqueos y lista de espera', 'Finanzas: ingresos, gastos, reportes y cierre de caja'] },
    ],
    exclusions: ['Registro del dominio, que se paga aparte al registrador', 'Equipo de cómputo, red o impresoras'],
    support: 'La mensualidad incluye el sistema funcionando 24/7, soporte por WhatsApp, actualizaciones continuas, respaldo diario de datos y la infraestructura.',
    process: proc([['Inicio del proyecto', 'Se abona la activación para comenzar con tu marca, precios e imágenes.'], ['Configuración', 'Catálogo, horarios y panel de administración listos.'], ['Capacitación (30 min)', 'Uso del panel, recordatorios y cierres de caja.'], ['Entrega', 'En aproximadamente 1 semana, o menos.']]),
    conditions: ['Mínimo de permanencia inicial de 3 meses.', 'Tus datos de clientes son 100% tuyos.'],
  },
  programa: {
    intro: 'Con gusto te presento esta propuesta de programa a la medida. Después de conocer tu operación, definimos los módulos que necesitas y los dejamos funcionando con instalación, capacitación y soporte.',
    sections: [
      { title: 'Módulo principal', items: ['Descripción del módulo 1', 'Reportes que se generan solos', 'Usuarios y permisos'] },
      { title: 'Módulo complementario', items: ['Descripción del módulo 2', 'Integración con tus procesos actuales'] },
      { title: 'Capacitación', items: ['Conociendo el programa', 'Uso diario y casos frecuentes', 'Cierre de periodos y reportes'] },
    ],
    exclusions: ['Equipo de cómputo, instalación de red u otros accesorios', 'Licencias de sistema operativo, antivirus y otras, según tus necesidades'],
    support: 'Incluye horas de capacitación y un periodo de asesoría y soporte por internet después de la implementación. Se recomienda un respaldo automático de la información y al menos dos mantenimientos al año.',
    process: proc([['Análisis', 'Entendemos tu operación y definimos módulos.'], ['Desarrollo y adecuación', 'Configuramos el sistema a tu medida.'], ['Instalación y capacitación', 'En tus equipos, con tu personal.'], ['Soporte', 'Acompañamiento después de la entrega.']]),
    conditions: ['El equipo de cómputo debe ser revisado y aprobado previamente.', 'Se recomienda un respaldo automático de la información.'],
  },
  custom: { intro: '', sections: [], exclusions: [], support: '', process: [], conditions: [] },
}
export const bodyFor = (t: Template): Body => ({ ...structuredClone(TEMPLATES[t]), notes: '' })
