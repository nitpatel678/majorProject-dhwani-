/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Core monochrome palette — inspired by premium Dribbble dashboards
        surface: {
          DEFAULT: '#000000',       // Pure black base
          '50': '#fafafa',          // Lightest — almost white
          '100': '#f5f5f5',
          '200': '#e5e5e5',
          '300': '#d4d4d4',
          '400': '#a3a3a3',
          '500': '#737373',
          '600': '#525252',
          '700': '#404040',
          '800': '#262626',
          '900': '#171717',
          '950': '#0a0a0a',         // Near-black — main bg
        },
        // Semantic colors — muted to fit monochrome aesthetic
        danger:  { DEFAULT: '#ef4444', light: '#fca5a5', dark: '#dc2626', muted: '#991b1b' },
        success: { DEFAULT: '#22c55e', light: '#86efac', dark: '#16a34a', muted: '#166534' },
        warning: { DEFAULT: '#f59e0b', light: '#fcd34d', dark: '#d97706', muted: '#92400e' },
        info:    { DEFAULT: '#3b82f6', light: '#93c5fd', dark: '#2563eb', muted: '#1e40af' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'card': '0 0 0 1px rgba(255,255,255,0.03), 0 1px 3px rgba(0,0,0,0.5)',
        'card-hover': '0 0 0 1px rgba(255,255,255,0.06), 0 4px 12px rgba(0,0,0,0.6)',
        'elevated': '0 4px 24px rgba(0,0,0,0.4)',
        'glow-white': '0 0 20px rgba(255,255,255,0.05)',
        'glow-danger': '0 0 20px rgba(239,68,68,0.15)',
        'inner-light': 'inset 0 1px 0 rgba(255,255,255,0.03)',
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
        'slide-in-left': 'slide-in-left 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
