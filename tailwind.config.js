/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Georgia', 'serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1B1B1B',
          light: '#2F2F2F',
          dark: '#121212',
        },
        graphite: {
          DEFAULT: '#2F2F2F',
          light: '#3A3A3A',
          dark: '#252525',
        },
        metallic: {
          DEFAULT: '#4A4A4A',
          light: '#5C5C5C',
          dark: '#3D3D3D',
        },
        accent: {
          DEFAULT: '#C9A24D',
          light: '#E2C27B',
          dark: '#A8873A',
        },
        cream: '#2F2F2F',
        warm: '#252525',
        surface: '#1B1B1B',
        border: '#3D3D3D',
        'text-light': '#A3A3A3',
        ink: '#F5F5F5',
      },
      boxShadow: {
        soft: '0 4px 24px rgba(0, 0, 0, 0.35)',
        premium: '0 12px 40px rgba(0, 0, 0, 0.45)',
        gold: '0 8px 28px rgba(201, 162, 77, 0.25)',
        'gold-lg': '0 12px 40px rgba(201, 162, 77, 0.35)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C9A24D 0%, #E2C27B 50%, #C9A24D 100%)',
        'dark-gradient': 'linear-gradient(180deg, #1B1B1B 0%, #2F2F2F 100%)',
        'hero-overlay': 'linear-gradient(105deg, rgba(27,27,27,0.92) 0%, rgba(27,27,27,0.55) 55%, rgba(27,27,27,0.25) 100%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float-slow': 'floatY 9s ease-in-out infinite',
        'float-slower': 'floatY 14s ease-in-out infinite reverse',
        'energy-shift': 'energyShift 3.5s ease infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(30px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        floatY: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-18px)' },
        },
        energyShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};
