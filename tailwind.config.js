/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          50: '#F5F6F8',
          100: '#EBECEF',
          200: '#D5D7DE',
          300: '#AAB0BD',
          400: '#7B8394',
          500: '#545C6E',
          600: '#3D4353',
          700: '#282C37',
          800: '#1A1D27',
          900: '#11131A',
          950: '#0B0C10',
        },
        gold: {
          50: '#FDFBF5',
          100: '#F9F5E6',
          200: '#F2E8C4',
          300: '#E8D69A',
          400: '#DEC06B',
          500: '#C5A84D', // Primary LuxeStudio Gold
          600: '#B08F35',
          700: '#8C6F25',
          800: '#69511B',
          900: '#4D3B14',
          950: '#2A1F08',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        card: '0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        hover: '0 10px 15px -3px rgba(0, 0, 0, 0.06), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
