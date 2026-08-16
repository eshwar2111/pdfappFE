/** @type {import('tailwindcss').Config} */

/**
 * Pastel-professional palette.
 *
 * The working surfaces are near-neutral so the document itself carries the
 * page; colour is reserved for state (ready / processing / failed) and for the
 * one primary action per view. Every pastel here is desaturated enough to hold
 * legible dark text on top of it, which is what keeps it from reading as toy-like.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f5f7fa',
          sunken: '#eef1f6',
          border: '#e3e8ef',
        },
        ink: {
          DEFAULT: '#1c2430',
          muted: '#5b6777',
          subtle: '#8b96a5',
        },
        // Dusty blue — calm enough to sit behind a document all day.
        brand: {
          50: '#f0f4fa',
          100: '#dee8f5',
          200: '#c3d5ec',
          300: '#9cbadf',
          400: '#83a8d4',
          500: '#6f97c7',
          600: '#557fb4',
          700: '#456894',
          800: '#375375',
        },
        // Sage — success / ready.
        sage: {
          50: '#eef5f0',
          100: '#dcebe1',
          500: '#7ba98c',
          700: '#4f7a60',
        },
        // Sand — processing / warning.
        sand: {
          50: '#fcf5e9',
          100: '#f7ead3',
          500: '#c99a55',
          700: '#8f6829',
        },
        // Clay — failure / destructive.
        clay: {
          50: '#fbefef',
          100: '#f5dcdc',
          500: '#c98080',
          600: '#b56565',
          700: '#9c4f4f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Slightly tighter than default for a denser, more workmanlike feel.
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lg: ['1.0625rem', { lineHeight: '1.6rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(28, 36, 48, 0.04), 0 1px 3px rgba(28, 36, 48, 0.06)',
        raised: '0 4px 12px rgba(28, 36, 48, 0.08), 0 1px 3px rgba(28, 36, 48, 0.06)',
        float: '0 8px 28px rgba(28, 36, 48, 0.16), 0 2px 6px rgba(28, 36, 48, 0.08)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'none' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out',
        'slide-up': 'slide-up 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
