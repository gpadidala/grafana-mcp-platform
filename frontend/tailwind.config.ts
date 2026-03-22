import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design system tokens
        base:     '#050A14',
        surface:  '#0D1321',
        elevated: '#111827',
        // Accent
        'accent-blue': '#3B82F6',
        'accent-cyan': '#06B6D4',
        // Text
        'on-primary': '#F1F5F9',
        'on-muted':   '#64748B',
        'on-subtle':  '#334155',
        // Status
        'status-success': '#10B981',
        'status-warning': '#F59E0B',
        'status-error':   '#EF4444',
        // Legacy aliases (keep for existing TSX files)
        'grafana-canvas':    '#050A14',
        'grafana-primary':   '#0D1321',
        'grafana-secondary': '#0D1321',
        'grafana-elevated':  '#111827',
        'grafana-overlay':   '#111827',
        'orange-brand':      '#3B82F6',
        'orange-brand-hover':'#60A5FA',
        'ai':                '#3B82F6',
        'ai-hover':          '#60A5FA',
        'neural':            '#8B5CF6',
        'text-primary':      '#F1F5F9',
        'text-secondary':    '#64748B',
        'text-disabled':     '#334155',
        'text-ai':           '#93C5FD',
        'border-weak':       'rgba(59,130,246,0.12)',
        'border-medium':     'rgba(59,130,246,0.22)',
        'border-strong':     'rgba(59,130,246,0.45)',
        // Signal type colors
        'mimir':    '#C084FC',
        'loki':     '#FACC15',
        'tempo':    '#22D3EE',
        'pyroscope':'#FB923C',
        'faro':     '#F472B6',
        // Severity
        'p1': '#EF4444',
        'p2': '#F97316',
        'p3': '#F59E0B',
        'p4': '#3B82F6',
        // Status legacy
        'status-success-legacy': '#10B981',
        'status-error-legacy':   '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '10': ['10px', { lineHeight: '14px' }],
        '11': ['11px', { lineHeight: '16px' }],
        '12': ['12px', { lineHeight: '18px' }],
        '13': ['13px', { lineHeight: '20px' }],
        '14': ['14px', { lineHeight: '22px' }],
        '16': ['16px', { lineHeight: '24px' }],
        '20': ['20px', { lineHeight: '28px' }],
        '24': ['24px', { lineHeight: '32px' }],
        '28': ['28px', { lineHeight: '36px' }],
        '32': ['32px', { lineHeight: '40px' }],
      },
      borderRadius: {
        'sm': '4px',
        DEFAULT: '8px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'pill': '9999px',
        'full': '9999px',
      },
      boxShadow: {
        'card':     '0 0 0 1px rgba(59,130,246,0.12), 0 4px 24px rgba(0,0,0,0.4)',
        'glow':     '0 0 0 3px rgba(59,130,246,0.12)',
        'glow-lg':  '0 0 24px rgba(59,130,246,0.3)',
        'elevated': '0 8px 32px rgba(0,0,0,0.5)',
        'card-hover': '0 0 0 1px rgba(59,130,246,0.4), 0 8px 32px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'gradient-blue-cyan': 'linear-gradient(135deg, #1D4ED8, #0EA5E9)',
        'gradient-card':      'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, transparent 100%)',
      },
      animation: {
        'pulse-slow':    'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer':       'shimmer 2s linear infinite',
        'fade-in':       'fadeIn 0.2s ease',
        'slide-up':      'slideUp 0.3s ease',
        'glow-pulse':    'glowPulse 2s ease-in-out infinite',
        'spin-slow':     'spin 3s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(59,130,246,0.2)' },
          '50%':      { boxShadow: '0 0 24px rgba(59,130,246,0.5)' },
        },
      },
      spacing: {
        '18': '72px',
        '22': '88px',
      },
    },
  },
  plugins: [],
}

export default config
