<<<<<<< HEAD
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
=======
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0A122C', // custom dark background
      },
    },
  },
  plugins: [],
}
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
