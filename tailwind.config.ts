import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/types/**/*.{js,ts}',
    './src/hooks/**/*.{js,ts}',
  ],
  // Safelist for dynamic user colors that can't be detected by purge
  safelist: [
    'bg-blue-500',
    'bg-blue-100',
    'text-blue-600',
    'bg-emerald-500',
    'bg-emerald-100',
    'text-emerald-600',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config
