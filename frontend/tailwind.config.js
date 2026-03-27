/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#121212',
        sand: '#f4efe7',
        ember: '#c75b39',
        pine: '#24463f',
        mist: '#e1ddd5',
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 18px 60px rgba(18,18,18,0.12)',
      },
      backgroundImage: {
        grain: 'radial-gradient(circle at top, rgba(199,91,57,0.08), transparent 40%), linear-gradient(135deg, #f6f1ea, #efe7da 55%, #e9efe7)',
      },
    },
  },
  plugins: [],
};
