import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Grafana-inspired dark palette
        'bg-primary': '#030712',     // gray-950
        'bg-surface': '#111827',     // gray-900
        'bg-raised': '#1F2937',      // gray-800
        'border': '#374151',         // gray-700
        // Signal type colors
        'mimir': '#C084FC',          // purple-400
        'loki': '#FACC15',           // yellow-400
        'tempo': '#22D3EE',          // cyan-400
        'pyroscope': '#FB923C',      // orange-400
        'faro': '#F472B6',           // pink-400
        // Severity colors
        'p1': '#EF4444',             // red-500
        'p2': '#F97316',             // orange-500
        'p3': '#EAB308',             // yellow-500
        'p4': '#3B82F6',             // blue-500
        'success': '#22C55E',        // green-500
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-in',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
