import type { Config } from 'tailwindcss'

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-page)',
        foreground: 'var(--text-primary)',
        card: { DEFAULT: 'var(--bg-card)', foreground: 'var(--text-primary)' },
        muted: { DEFAULT: '#f1f5f9', foreground: 'var(--text-muted)' },
        border: 'var(--border)',
        input: 'var(--border)',
        accent: { DEFAULT: '#f1f5f9', foreground: 'var(--text-primary)' },
        primary: { DEFAULT: 'var(--accent)', foreground: '#ffffff' },
        ring: 'var(--accent)',
        sidebar: 'var(--bg-sidebar)',
      },
      borderRadius: { lg: '0.75rem', md: '0.5rem', sm: '0.375rem' },
    },
  },
  plugins: [],
} satisfies Config
