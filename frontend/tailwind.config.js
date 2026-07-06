/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          base: '#09090d',
          card: '#111118',
          raised: '#18181f',
          overlay: '#1e1e28',
          border: '#2a2a35',
          muted: '#3a3a48',
        },
        accent: {
          DEFAULT: '#6366f1',
          hover: '#818cf8',
          muted: '#6366f120',
          foreground: '#ffffff',
        },
        text: {
          primary: '#f1f1f5',
          secondary: '#a0a0b0',
          muted: '#60607a',
          inverted: '#09090d',
        },
        success: { DEFAULT: '#22c55e', muted: '#22c55e20' },
        warning: { DEFAULT: '#f59e0b', muted: '#f59e0b20' },
        danger:  { DEFAULT: '#ef4444', muted: '#ef444420' },
        info:    { DEFAULT: '#3b82f6', muted: '#3b82f620' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'slide-in-up': 'slideInUp 0.2s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to:   { transform: 'translateX(0)',    opacity: '1' },
        },
        slideInUp: {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to:   { transform: 'translateY(0)',   opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
