/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      animation: {
        'spin-slot': 'spin 0.1s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'jackpot-pulse': 'jackpot-pulse 1s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #fff' },
          '50%': { boxShadow: '0 0 20px #00ff88, 0 0 30px #00ff88' },
          '100%': { boxShadow: '0 0 5px #fff' },
        },
        'jackpot-pulse': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      colors: {
        slot: {
          gold: '#f39c12',
          win: '#00ff88',
          lose: '#e74c3c',
          jackpot: '#f1c40f',
        },
      },
    },
  },
  plugins: [],
} 