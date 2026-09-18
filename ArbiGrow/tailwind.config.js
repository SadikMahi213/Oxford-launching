/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  safelist: [
    "responsive-card",
    "responsive-grid",
    "responsive-input",
    "btn-primary",
    "btn-secondary",
    "no-scrollbar",
    "touch-scroll",
    "safe-bottom",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0A122C',
      },
      screens: {
        'xs': '320px',
      },
    },
  },
  plugins: [],
}
