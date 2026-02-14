/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'rl-bg': '#0a0e1a',
        'rl-panel': '#111827',
        'rl-border': '#1f2937',
        'rl-grid': '#1a2035',
        'rl-cyan': '#00d4ff',
        'rl-orange': '#ff6b35',
        'rl-green': '#00ff88',
        'rl-yellow': '#ffcc00',
        'rl-purple': '#a855f7',
      },
      fontFamily: {
        mono: ['"Space Mono"', 'monospace'],
        heading: ['"Rajdhani"', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};
