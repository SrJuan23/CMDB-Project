/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0945F7',
          dark: '#19255A',
          cyan: '#00CDE2',
          purple: '#5B53FF',
          navy: '#3B4779',
          teal: '#006671',
          deepBlue: '#001F90',
          bg: '#F7F8FD',
          surface: '#EDF0FF',
          borderLight: '#D7E2FF',
          accentLight: '#DDDDFE'
        }
      },
      fontFamily: {
        heading: ['Montserrat', 'sans-serif'],
        body: ['Lato', 'sans-serif']
      }
    },
  },
  plugins: [],
}
