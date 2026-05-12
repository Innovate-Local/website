import type { Config } from 'tailwindcss'

/*
  Modern Bureau design system — Tailwind config.
  Token names mirror the Stitch-generated design system (bg-surface, text-on-surface, etc.)
  so that HTML output from Stitch ports directly into React with no class renaming.

  All values come from CSS custom properties defined in app/globals.css. Changing the
  accent palette (ochre → rust → umber) means swapping the CSS variables, not the Tailwind
  config or the component classes.
*/

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        headline: ['var(--font-newsreader)', 'Georgia', 'serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        label: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        'surface-bright': 'var(--color-surface-bright)',
        'surface-dim': 'var(--color-surface-dim)',
        'surface-variant': 'var(--color-surface-variant)',
        'surface-container': 'var(--color-surface-container)',
        'surface-container-low': 'var(--color-surface-container-low)',
        'surface-container-lowest': 'var(--color-surface-container-lowest)',
        'surface-container-high': 'var(--color-surface-container-high)',
        'surface-container-highest': 'var(--color-surface-container-highest)',
        'surface-tint': 'var(--color-surface-tint)',

        'on-background': 'var(--color-on-background)',
        'on-surface': 'var(--color-on-surface)',
        'on-surface-variant': 'var(--color-on-surface-variant)',

        primary: 'var(--color-primary)',
        'primary-container': 'var(--color-primary-container)',
        'primary-fixed': 'var(--color-primary-fixed)',
        'primary-fixed-dim': 'var(--color-primary-fixed-dim)',
        'on-primary': 'var(--color-on-primary)',
        'on-primary-container': 'var(--color-on-primary-container)',

        secondary: 'var(--color-secondary)',
        'secondary-container': 'var(--color-secondary-container)',
        'secondary-fixed': 'var(--color-secondary-fixed)',
        'secondary-fixed-dim': 'var(--color-secondary-fixed-dim)',
        'on-secondary': 'var(--color-on-secondary)',
        'on-secondary-container': 'var(--color-on-secondary-container)',

        tertiary: 'var(--color-tertiary)',
        'tertiary-container': 'var(--color-tertiary-container)',
        'tertiary-fixed': 'var(--color-tertiary-fixed)',
        'tertiary-fixed-dim': 'var(--color-tertiary-fixed-dim)',
        'on-tertiary': 'var(--color-on-tertiary)',
        'on-tertiary-container': 'var(--color-on-tertiary-container)',

        outline: 'var(--color-outline)',
        'outline-variant': 'var(--color-outline-variant)',

        error: 'var(--color-error)',
        'error-container': 'var(--color-error-container)',
        'on-error': 'var(--color-on-error)',
        'on-error-container': 'var(--color-on-error-container)',

        'inverse-surface': 'var(--color-inverse-surface)',
        'inverse-on-surface': 'var(--color-inverse-on-surface)',
        'inverse-primary': 'var(--color-inverse-primary)',
      },
      borderRadius: {
        DEFAULT: '0px',
        none: '0',
        sm: '0px',
        md: '0px',
        lg: '0px',
        xl: '0px',
        '2xl': '0px',
        '3xl': '0px',
        full: '0px',
      },
    },
  },
  plugins: [],
}

export default config
