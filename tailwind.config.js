/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#1e2230',
        'panel-2': '#262b3c',
        'panel-3': '#2f3650',
        accent: '#5b8cff'
      }
    }
  },
  plugins: []
}
