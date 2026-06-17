/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#0A0A0C",
          card: "#141416",
          border: "#232326",
          input: "#1C1C1E",
          inputBorder: "#2C2C2E",
          black: "#060608"
        }
      }
    },
  },
  plugins: [],
};