/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#ff4d1c",
        "primary-dark": "#af2900",
        secondary: "#1b1bff",
        "secondary-dark": "#0600cc",
        ink: "#141414",
        bone: "#fcf9f8",
        surface: "#fcf9f8",
        "surface-container": "#f0edec",
        "surface-container-high": "#ebe7e7",
        "surface-variant": "#e5e2e1",
        "on-surface": "#1c1b1b",
        "on-surface-variant": "#5c4039",
        tertiary: "#5d5c55",
        "tertiary-fixed": "#e5e2da",
      },
      fontFamily: {
        headline: ["Anton", "sans-serif"],
        body: ["'Space Grotesk'", "sans-serif"],
        mono: ["'Space Grotesk'", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0px",
        none: "0px",
        pill: "9999px",
      },
    },
  },
  plugins: [],
}
