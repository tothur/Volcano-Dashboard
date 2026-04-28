/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        basalt: {
          950: "#07090d",
          900: "#0d1219",
          850: "#111923",
          800: "#15202b",
          700: "#1e2d3b",
        },
        sulfur: "#e8c547",
        magma: "#ef6b35",
        lava: "#ef4444",
        seismo: "#36c5a3",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 24px 80px rgba(0,0,0,0.28)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
