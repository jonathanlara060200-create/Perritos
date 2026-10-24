import { Baloo_2, Chewy, Fredoka, Nunito, Pacifico } from 'next/font/google'

const fredoka = Fredoka({ subsets: ['latin'], display: 'swap' })
const baloo = Baloo_2({ subsets: ['latin'], display: 'swap', weight: '700' })
const pacifico = Pacifico({ subsets: ['latin'], display: 'swap', weight: '400' })
const chewy = Chewy({ subsets: ['latin'], display: 'swap', weight: '400' })
const nunito = Nunito({ subsets: ['latin'], display: 'swap', weight: '800' })

/** id de tipografía → font-family (cargadas con next/font, sin pedir nada a Google desde el navegador). */
export const PLATE_FONT_FAMILY: Record<string, string> = {
  fredoka: fredoka.style.fontFamily,
  baloo: baloo.style.fontFamily,
  pacifico: pacifico.style.fontFamily,
  chewy: chewy.style.fontFamily,
  nunito: nunito.style.fontFamily,
}
