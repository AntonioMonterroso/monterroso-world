export type FocusKey = 'dev' | 'music' | 'personal'

export const profile = {
  name: 'Monterroso',
  email: 'Jocetony02@gmail.com',
  site: 'https://antoniomonterroso.github.io/',
  pageUrl: 'https://antoniomonterroso.github.io/monterroso-world/',
}

export const focuses: Record<
  FocusKey,
  { label: string; role: string; headline: string; body: string; items: string[] }
> = {
  dev: {
    label: 'Desarrollador',
    role: 'Desarrollador web freelance',
    headline: 'Sitios que cargan rápido y se ven hechos a mano.',
    body: 'Diseño y programo páginas, landings y apps web instalables. Me encargo del dominio, la base de datos y la publicación, para que solo tengas que usarlo.',
    items: ['Landings y sitios', 'Apps web (PWA)', 'Bases de datos y automatización', 'Mantenimiento y dominios'],
  },
  music: {
    label: 'Músico',
    role: 'Productor · Guitarrista · Baterista · Pianista',
    headline: 'Cuatro instrumentos, una sola idea a la vez.',
    body: 'Toco, arreglo y produzco. Si necesitas una guitarra en tu canción, una batería en vivo o un teclado en el servicio, escríbeme.',
    items: ['Producción y arreglos', 'Guitarra y batería en vivo', 'Piano y teclados', 'Tocadas y ensayos'],
  },
  personal: {
    label: 'Personal',
    role: 'Aprendo rápido y me gusta tener el control',
    headline: 'Hago muchas cosas, y las hago en orden.',
    body: 'Programo, toco y sirvo en la iglesia. Resuelvo cosas seguido y por eso armé este sistema para llevar mi vida sin perder el hilo.',
    items: ['Siempre aprendiendo', 'Código y música', 'Servicio en la iglesia', 'Sistemas propios'],
  },
}

export function buildVCard(focus: FocusKey): string {
  const f = focuses[focus]
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${profile.name}`,
    `N:${profile.name};;;;`,
    `TITLE:${f.role}`,
    `EMAIL:${profile.email}`,
    `URL:${profile.pageUrl}`,
    'END:VCARD',
  ].join('\r\n')
}
