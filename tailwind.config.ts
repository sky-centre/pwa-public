import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sam-Zone brand tokens — pulled from the mark, not a generic dark theme
        void: {
          DEFAULT: "#07080B", // primary background, near-black
          raised: "#0F1218", // cards / sheets
          line: "#1B2029", // hairline borders on dark
        },
        haze: {
          DEFAULT: "#38BDF8", // neon blue — knock / primary action
          soft: "#7DD3FC",
          dim: "#1C4A63",
        },
        signal: {
          pending: "#F5B942", // amber — waiting on owner
          approved: "#34D399", // green — chat unlocked
          rejected: "#F4685B", // warm red — declined
          closed: "#6B7280", // grey — ended
        },
        ink: {
          DEFAULT: "#F3F5F8", // primary text on dark
          muted: "#9AA3B2", // secondary text
          faint: "#5B6472", // tertiary / placeholder
        },
      },
      fontFamily: {
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mark: ["var(--font-mark)", "cursive"],
      },
      boxShadow: {
        glow: "0 0 24px 0 rgba(56, 189, 248, 0.35)",
        "glow-sm": "0 0 12px 0 rgba(56, 189, 248, 0.25)",
        sheet: "0 -8px 30px rgba(0,0,0,0.45)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.6" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        "rise-in": {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "pulse-ring": "pulse-ring 2.2s cubic-bezier(0.4,0,0.6,1) infinite",
        "rise-in": "rise-in 0.35s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
