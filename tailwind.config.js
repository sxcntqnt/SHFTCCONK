/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,svelte,ts}",
    "./src/**/*.svelte",  // ensure Svelte files are scanned
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          300: '#A8B5A2',
          400: '#8A9A8F',
          500: '#6F8A7A',
          600: '#5F7A6A',
          700: '#4A6154',
        },
        charcoal: {
          50: '#F5F5F5',
          100: '#E5E5E5',
          900: '#1F2526',
          950: '#111416',
        },
        'matatu-orange': '#FF6B35',  // vibrant energy
        'matatu-amber': '#F59E0B',
        'matatu-teal': '#2DD4BF',
      },
    },
  },
  daisyui: {
    themes: [
      {
        light: {  // or your preferred theme name
          primary: "#FF6B35",          // → btn-primary becomes orange
          "primary-content": "#ffffff",
          secondary: "#2DD4BF",        // teal for secondary buttons
          "secondary-content": "#ffffff",
          accent: "#F59E0B",           // amber accent
          neutral: "#1F2526",          // charcoal-900
          "base-100": "#F5F5F5",       // light charcoal-50
          "base-200": "#E5E5E5",       // charcoal-100
          "base-300": "#111416",       // charcoal-950
          info: "#2DD4BF",
          success: "#5F7A6A",          // sage-600
          warning: "#F59E0B",
          error: "#FF6B35",
        },
      },
      // You can add a 'dark' theme too if you want dark mode later
    ],
  },
  plugins: [require("daisyui")],
}