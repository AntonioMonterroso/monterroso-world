import type { Body, Template } from './quotes'

/** Plantillas de propuesta por rubro: el mismo documento formal, con la introducción y los puntos que ese negocio necesita oír.
 *  Sin garantías ni promesas inventadas; precios siempre en quetzales desde tu catálogo. */
export type Rubro = { id: string; label: string; template: Template; title: string; match: RegExp; intro: string; needs: string[] }

export const RUBROS: Rubro[] = [
  { id: 'barberia', label: 'Barbería o salón', template: 'citas', title: 'Página y citas en línea', match: /barber|salon|salón|uñas|estetica|estética|\bspa\b/i,
    intro: 'Esta propuesta es para que tus clientes vean tus servicios y precios, y reserven su cita desde el teléfono sin tener que escribirte uno por uno.',
    needs: ['Lista de servicios con precio y duración', 'Reserva de citas por día y hora, por barbero o estilista', 'Recordatorio de la cita por WhatsApp', 'Galería de cortes o trabajos', 'Ubicación, horario y botón para llamar o escribir'] },
  { id: 'comida', label: 'Pastelería o restaurante', template: 'web', title: 'Menú en línea y pedidos', match: /pastel|reposter|restaur|comida|cafe|café|panader|antojit|comedor/i,
    intro: 'Esta propuesta es para que tu menú esté siempre a la mano, con fotos y precios, y que te puedan pedir con un toque.',
    needs: ['Menú con fotos, precios y categorías', 'Pedidos por WhatsApp con el detalle armado', 'Pedidos especiales con fecha de entrega (pasteles, eventos)', 'Horario, ubicación y zonas de entrega', 'Cambiar precios y productos tú mismo'] },
  { id: 'oficina', label: 'Oficina o servicios profesionales', template: 'web', title: 'Página profesional', match: /oficina|contad|abogad|despacho|consult|clinic|clínic|seguro|inmobil/i,
    intro: 'Esta propuesta es para que tu negocio se vea serio en internet, explique con claridad qué haces y facilite que un cliente nuevo te contacte.',
    needs: ['Servicios explicados en lenguaje sencillo', 'Formulario de contacto y botón de WhatsApp', 'Equipo, experiencia y forma de trabajo', 'Preguntas frecuentes', 'Dominio propio y correo con tu nombre'] },
  { id: 'tienda', label: 'Tienda o negocio de productos', template: 'web', title: 'Catálogo en línea', match: /tienda|venta|boutique|ferret|libreri|librería|variedad|ropa/i,
    intro: 'Esta propuesta es para que tus productos se puedan ver y pedir en línea, con precios claros y sin depender de mandar fotos una por una.',
    needs: ['Catálogo con fotos, precios y existencias', 'Pedido por WhatsApp con el carrito armado', 'Ofertas y productos destacados', 'Formas de pago y de entrega', 'Agregar y quitar productos tú mismo'] },
]

/** El rubro que mejor calza con lo que tienes anotado del cliente (o null). */
export const rubroFor = (text: string | null | undefined) => (text ? RUBROS.find((r) => r.match.test(text)) ?? null : null)

/** Arma el contenido de la propuesta para ese rubro a partir de la plantilla base. */
export function bodyForRubro(base: Body, r: Rubro): Body {
  return { ...base, intro: r.intro, sections: [{ title: `Lo que tu ${r.label.split(' o ')[0].toLowerCase()} necesita`, items: [...r.needs] }, ...base.sections] }
}
