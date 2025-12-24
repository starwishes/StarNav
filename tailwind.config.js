/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,vue,js,ts}'],
  darkMode: 'class',
  theme: {
    screens: {
      xl: { min: '1280px' },
      lg: { max: '1280px' },
      md: { max: '1024px' },
      sm: { max: '640px' }
    },
    extend: {
      colors: {
        'gray-0': '#ffffff',
        'gray-1000': '#000000',
        'gray-o5': 'rgba(255, 255, 255, 0.5)',
        'gray-o3': 'rgba(255, 255, 255, 0.3)',
        'gray-o7': 'rgba(255, 255, 255, 0.7)',
      },
      fontSize: {
        '10px': '10px',
        '12px': '12px',
        '14px': '14px',
        '16px': '16px',
        '18px': '18px',
        '20px': '20px',
        '22px': '22px',
        '24px': '24px',
        '26px': '26px',
        '28px': '28px',
        '30px': '30px',
        '32px': '32px'
      },
      spacing: {
        'px-98': '98px',
        'px-100': '100px',
        'px-120': '120px',
        'px-150': '150px',
        'px-200': '200px',
        'px-250': '250px',
        'px-300': '300px',
        'px-400': '400px',
        'px-500': '500px',
        'px-600': '600px',
        'px-700': '700px',
        'px-800': '800px',
      }
    }
  },
  plugins: []
}
