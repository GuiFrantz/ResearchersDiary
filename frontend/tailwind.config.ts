import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#141f1a",
        dust: {
          50: "#f8f7f5",
          100: "#f0efeb",
          200: "#e9e7e1",
          300: "#e2dfd7",
          400: "#dad7cd",
          500: "#b6b09c",
          600: "#92896c",
          700: "#615b48",
          900: "#312e24",
        },
        sage: "#a3b18a",
        moss: "#859865",
        fern: "#588157",
        hunter: { DEFAULT: "#3a5a40", hover: "#2e4833" },
        pine: "#344e41",
        clay: { DEFAULT: "#9b4f3f", 100: "#f3e7e3", 200: "#e7d2cb" },
        leaf: { 100: "#dce7dc", 700: "#344c34" },
        olive: { 100: "#dae0d0", 700: "#434c33" },
        sand: { 100: "#f1ecd9", 200: "#e5dcc0", 700: "#6f6132" },
      },
      fontFamily: {
        sans: ["var(--font-plex-sans)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-plex-mono)", ...defaultTheme.fontFamily.mono],
      },
      boxShadow: {
        drawer: "-16px 0 48px rgba(20,31,26,0.12)",
        menu: "0 12px 32px rgba(20,31,26,0.10), 0 2px 6px rgba(20,31,26,0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
