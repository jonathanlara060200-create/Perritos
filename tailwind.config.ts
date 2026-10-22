import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFF8F0',
        ink: '#3B2F3A',
        axo: {
          50: '#FFF1F4',
          100: '#FFE0E8',
          200: '#FBC4D3',
          300: '#F5A3B9',
          400: '#EE7F9C',
          500: '#E25C80',
          600: '#C73F66',
        },
        mint: '#CDEBDD',
        sky: '#D7ECF7',
        butter: '#FFF0BF',
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
