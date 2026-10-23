import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F2F7FD',
        ink: '#371A16',
        axo: {
          50: '#FFF1F5',
          100: '#FFE0E9',
          200: '#FBAEBC',
          300: '#F8899F',
          400: '#F4739A',
          500: '#EE5F8A',
          600: '#D4467A',
        },
        denim: {
          100: '#DCE8F6',
          200: '#B7CFEC',
          300: '#8FB8DC',
          400: '#76A8CE',
          500: '#4D83B4',
          600: '#366797',
        },
        mint: '#CDEBDD',
        sky: '#DCE8F6',
        butter: '#FCE7B0',
        stitch: '#F5B94A',
      },
      fontFamily: {
        sans: ['var(--font-nunito)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
}

export default config
