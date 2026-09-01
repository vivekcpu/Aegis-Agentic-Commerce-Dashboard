/**
 * Design tokens for Aegis.
 *
 * Keeping every color/spacing/animation choice here (instead of scattered
 * inline styles in components) is what keeps "Template B — Tactical Ops"
 * consistent across every screen. If the look ever needs to change,
 * it changes in one place.
 */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Renamed from "base" — Tailwind's font-size scale ALSO has a key
        // named "base" (the default 1rem size). Naming a custom color
        // "base" makes Tailwind generate `.text-base` as a COLOR utility
        // instead of a font-size one, silently breaking every `text-base`
        // used for sizing elsewhere (this was a real bug found by
        // rendering the actual page, not just reading the code — see
        // frontend/DEBUGGING_NOTES.md). Avoid short/common words for
        // custom tokens; prefix or use a distinct name instead.
        obsidian: "#0a0705",      // page background
        panel: "#120d09",      // card background
        "panel-border": "#3a2410",
        amber: {
          DEFAULT: "#f5a524",
          soft: "#f5a52433",
        },
        alert: {
          DEFAULT: "#e2413a",
          soft: "#e2413a33",
        },
        stone: {
          400: "#a89a86",
          500: "#8a7b66",
          600: "#6b5d4a",
        },
      },
      fontFamily: {
        display: ["Chakra Petch", "sans-serif"],
        mono: ["Space Mono", "monospace"],
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: 1 },
          "50%": { opacity: 0.15 },
        },
        "ring-expand": {
          "0%": { transform: "scale(0.4)", opacity: 0.8 },
          "100%": { transform: "scale(1.6)", opacity: 0 },
        },
        "fade-up": {
          "0%": { opacity: 0, transform: "translateY(8px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "bar-fill": {
          "0%": { width: "0%" },
        },
        scan: {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "0 40px" },
        },
      },
      animation: {
        blink: "blink 1.2s step-start infinite",
        "ring-expand": "ring-expand 2.2s ease-out infinite",
        "fade-up": "fade-up 0.5s ease-out both",
        scan: "scan 6s linear infinite",
      },
    },
  },
  plugins: [],
};
