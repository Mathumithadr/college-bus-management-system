/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070d18',
          900: '#0a1222',
          800: '#0c162b',
          700: '#101e38',
          600: '#14233e',
          500: '#1b2b4c',
        },
      },
      keyframes: {
        radarPulse: {
          '0%, 100%': { transform: 'scale(0.95)', opacity: '0.8' },
          '50%': { transform: 'scale(1.3)', opacity: '0' },
        },
      },
      animation: {
        'radar-pulse': 'radarPulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
