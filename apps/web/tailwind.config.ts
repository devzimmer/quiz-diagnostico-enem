import animate from 'tailwindcss-animate'
import type { Config } from 'tailwindcss'

/** Tokens extraídos da LP e do site institucional (ver design/brand-reference.md). */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem' },
    extend: {
      colors: {
        tinta: { DEFAULT: '#0B2A5B', 2: '#3A4F73' },
        azul: {
          DEFAULT: '#0A7FFA',
          fundo: '#0A6DE6',
          texto: '#0866D6',
          esc: '#0749A8',
          claro: '#DCEBFF',
          suave: '#EAF3FF',
        },
        papel: '#FBFDFF',
        amarelo: { DEFAULT: '#FFE100', esc: '#D9AE00' },
        'verde-cta': { DEFAULT: '#0D8519', hover: '#0C7A17', esc: '#075E10' },
        marca: { DEFAULT: '#0021E1', hover: '#001BBD', suave: '#EEF1FE' },
        // admin (institucional)
        painel: { fundo: '#F4F6FA', borda: '#E2E7F0', texto: '#14254D', sub: '#5A6680' },
        erro: { DEFAULT: '#B30B00', fundo: '#FFF4F3', borda: '#F3C2BE' },
      },
      fontFamily: {
        display: ['Anton', 'Impact', '"Arial Narrow"', 'sans-serif'],
        sans: ['Rubik', 'system-ui', 'sans-serif'],
        hand: ['Kalam', 'cursive'],
        admin: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        cta: '0 5px 0 #075E10',
        opcao: '0 2px 0 #DCEBFF',
        'opcao-sel': '0 4px 0 #0A6DE6',
      },
    },
  },
  plugins: [animate],
} satisfies Config
