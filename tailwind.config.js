/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#F9F6F0",
        foreground: "#2C332A",
        primary: {
          DEFAULT: "#059669",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#D1FAE5",
          foreground: "#065F46",
        },
        muted: {
          DEFAULT: "#E8E6E1",
          foreground: "#7B8579",
        },
        accent: {
          DEFAULT: "#A7F3D0",
          foreground: "#064E3B",
        },
        destructive: {
          DEFAULT: "#C97A7E",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#2C332A",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#2C332A",
        },
        border: "#E2DFD8",
        input: "#F0EFEA",
        ring: "#059669",
        chart: {
          1: "#059669",
          2: "#C97A7E",
          3: "#DDA77B",
          4: "#859CA9",
          5: "#B4A89C",
        },
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
        "6xl": "3rem",
      },
      fontFamily: {
        sans: ["NunitoSans_400Regular", "sans-serif"],
        heading: ["NunitoSans_800ExtraBold", "sans-serif"],
        semibold: ["NunitoSans_600SemiBold", "sans-serif"],
        bold: ["NunitoSans_700Bold", "sans-serif"],
        serif: ["PlayfairDisplay_400Regular", "serif"],
      },
    },
  },
  plugins: [],
};
