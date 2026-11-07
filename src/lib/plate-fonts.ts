import { Fredoka, Lilita_One, Montserrat, Pacifico, Roboto_Slab } from 'next/font/google'

// Todas son gruesas y de trazo continuo: se imprimen en relieve sin partes frágiles.
const clasica = Roboto_Slab({ subsets: ['latin'], display: 'swap', weight: '800' })
const moderna = Montserrat({ subsets: ['latin'], display: 'swap', weight: '800' })
const redondeada = Fredoka({ subsets: ['latin'], display: 'swap', weight: '700' })
const divertida = Lilita_One({ subsets: ['latin'], display: 'swap', weight: '400' })
const elegante = Pacifico({ subsets: ['latin'], display: 'swap', weight: '400' })

/** id de tipografía → font-family (cargadas con next/font, sin pedir nada a Google desde el navegador). */
export const PLATE_FONT_FAMILY: Record<string, string> = {
  clasica: clasica.style.fontFamily,
  moderna: moderna.style.fontFamily,
  redondeada: redondeada.style.fontFamily,
  divertida: divertida.style.fontFamily,
  elegante: elegante.style.fontFamily,
}

/**
 * Ajuste del nombre dentro de la base (unidades de la caja 100×100 de la placa).
 * `maxSize`: tamaño máximo para que las letras (con sus colitas) no salgan de la base de 11 de alto.
 * `cap`: proporción de la altura de las mayúsculas, para centrar el nombre verticalmente.
 */
export const PLATE_FONT_FIT: Record<string, { maxSize: number; cap: number }> = {
  clasica: { maxSize: 9.5, cap: 0.7 },
  moderna: { maxSize: 9, cap: 0.7 },
  redondeada: { maxSize: 10, cap: 0.7 },
  divertida: { maxSize: 10, cap: 0.68 },
  elegante: { maxSize: 8.5, cap: 0.62 },
}

/** Por debajo de este tamaño las letras quedan muy chicas para imprimirse bien. */
export const MIN_COMFORT_SIZE = 6
