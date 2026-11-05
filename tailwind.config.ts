import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        zeno: {
          navy: {
            DEFAULT: "#0A1931",
            50: "#EEF2FF",
            100: "#E0E7FF",
            200: "#C7D2FE",
            300: "#A5B4FC",
            400: "#818CF8",
            500: "#6366F1",
            600: "#4338CA",
            700: "#312E81",
            800: "#1E1B4B",
            900: "#0A1931",
            950: "#061021",
          },
          teal: {
            DEFAULT: "#00D4FF",
            light: "#67E8F9",
            50: "#F0FDFA",
            100: "#CCFBF1",
            200: "#99F6E4",
            300: "#5EEAD4",
            400: "#2DD4BF",
            500: "#00D4FF",
            600: "#06B6D4",
            700: "#0891B2",
            800: "#0E7490",
            900: "#155E75",
          },
          gold: {
            DEFAULT: "#D4A017",
            light: "#EAB308",
            50: "#FEFCE8",
            100: "#FEF9C3",
            200: "#FEF08A",
            300: "#FDE047",
            400: "#FACC15",
            500: "#D4A017",
            600: "#CA8A04",
            700: "#A16207",
          },
          cyan: "#7DD3FC",
          bg: "#F8FAFC",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        heading: ["Poppins", "Inter", "sans-serif"],
        mono: ["JetBrains Mono", "Courier New", "monospace"],
      },
      boxShadow: {
        card: "0 10px 30px -5px rgba(15, 29, 94, 0.08), 0 4px 10px -2px rgba(15, 29, 94, 0.04)",
        glow: "0 0 25px rgba(13, 181, 181, 0.35)",
        goldGlow: "0 0 25px rgba(212, 160, 23, 0.35)",
      },
      keyframes: {
        pulseTap: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.08)", opacity: "0.85" },
        },
        scanWave: {
          "0%": { top: "0%", opacity: "0.8" },
          "50%": { opacity: "1" },
          "100%": { top: "100%", opacity: "0.2" },
        },
      },
      animation: {
        pulseTap: "pulseTap 1.5s ease-in-out infinite",
        scanWave: "scanWave 2s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
