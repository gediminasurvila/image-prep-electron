/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Semantic tokens backed by CSS variables (see styles.css). Both light
      // and dark themes share these names, so components are theme-agnostic.
      colors: {
        surface: 'var(--surface)',
        panel: 'var(--panel)',
        'panel-2': 'var(--panel-2)',
        'panel-3': 'var(--panel-3)',
        canvas: 'var(--canvas)',
        line: 'var(--line)',
        fill: 'var(--fill)',
        'fill-strong': 'var(--fill-strong)',
        fg: 'var(--fg)',
        muted: 'var(--fg-muted)',
        subtle: 'var(--fg-subtle)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-soft': 'var(--accent-soft)',
        'accent-fg': 'var(--accent-fg)',
        'accent-border': 'var(--accent-border)',
        ok: 'var(--ok)',
        'ok-soft': 'var(--ok-soft)',
        warn: 'var(--warn)',
        'warn-soft': 'var(--warn-soft)',
        danger: 'var(--danger)',
        'danger-soft': 'var(--danger-soft)',
        'danger-border': 'var(--danger-border)',
        info: 'var(--info)',
        'info-soft': 'var(--info-soft)'
      }
    }
  },
  plugins: []
}
