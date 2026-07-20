/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0A0A0F',
          surface: '#12121A',
          elevated: '#1A1A25',
          hover: '#22222F',
        },
        border: {
          DEFAULT: 'rgba(255, 255, 255, 0.06)',
          hover: 'rgba(255, 255, 255, 0.12)',
          active: 'rgba(255, 255, 255, 0.2)',
        },
        primary: {
          DEFAULT: '#6C5CE7',
          light: '#A78BFA',
          dark: '#5B4ACF',
          50: '#EDE9FE',
          100: '#DDD6FE',
          200: '#C4B5FD',
          300: '#A78BFA',
          400: '#8B5CF6',
          500: '#6C5CE7',
          600: '#5B4ACF',
          700: '#4C3DB5',
          800: '#3D319A',
          900: '#2E2580',
        },
        accent: {
          DEFAULT: '#00D9FF',
          light: '#67E8F9',
          dark: '#00B8D9',
        },
        success: { DEFAULT: '#00E676', light: '#69F0AE', dark: '#00C853' },
        warning: { DEFAULT: '#FFB74D', light: '#FFD54F', dark: '#FF9800' },
        danger: { DEFAULT: '#FF5252', light: '#FF8A80', dark: '#D32F2F' },
        info: { DEFAULT: '#42A5F5', light: '#90CAF9', dark: '#1E88E5' },
        text: {
          primary: '#F0F0F5',
          secondary: '#8B8BA3',
          muted: '#5A5A72',
          inverse: '#0A0A0F',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Geologica', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
        '4xl': '1.5rem',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-sm': '0 4px 16px rgba(0, 0, 0, 0.2)',
        glow: '0 0 20px rgba(108, 92, 231, 0.3)',
        'glow-accent': '0 0 20px rgba(0, 217, 255, 0.3)',
        'glow-danger': '0 0 20px rgba(255, 82, 82, 0.3)',
        'glow-success': '0 0 20px rgba(0, 230, 118, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
