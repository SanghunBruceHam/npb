import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'npb-blue': '#0f172a',
        'npb-red': '#dc2626',
        'central': '#1e40af',
        'pacific': '#059669',
      },
    },
  },
  plugins: [],
}
export default config