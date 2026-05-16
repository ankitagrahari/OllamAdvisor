/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        bg: '#09090b',
        surface: '#111113',
        's2': '#18181b',
        border: '#27272a',
        'b2': '#3f3f46',
        accent: '#f97316',
        'accent-hi': '#fb923c',
        'accent-lo': '#431407',
        muted: '#71717a',
        dim: '#3f3f46',
      },
      animation: {
        'bg-flow': 'bg-flow 28s ease-in-out infinite alternate',
        'card-in': 'card-in 0.45s ease-out both',
        'fade-in': 'fade-in 0.3s ease-out both',
        'slide-up': 'slide-up 0.4s ease-out both',
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
        'analyzing': 'analyzing 1.4s ease-in-out infinite',
      },
      keyframes: {
        'bg-flow': {
          '0%':   { opacity: '0.6', transform: 'scale(1) translate(0, 0)' },
          '100%': { opacity: '1',   transform: 'scale(1.1) translate(2%, -2%)' },
        },
        'card-in': {
          'from': { opacity: '0', transform: 'translateY(28px)' },
          'to':   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          'from': { opacity: '0' },
          'to':   { opacity: '1' },
        },
        'slide-up': {
          'from': { opacity: '0', transform: 'translateY(12px)' },
          'to':   { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(249,115,22,0.3)' },
          '50%':       { boxShadow: '0 0 0 8px rgba(249,115,22,0)' },
        },
        'analyzing': {
          '0%, 100%': { opacity: '0.4' },
          '50%':       { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
