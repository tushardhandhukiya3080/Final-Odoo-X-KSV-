/** @type {import('tailwindcss').Config} */
// Scoped to the landing page (and any future Tailwind UI). Preflight is OFF so
// it never resets the existing plain-CSS pages. Theme ported verbatim from
// commuteshare-frontend so the landing renders exactly like the template.
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  corePlugins: { preflight: false },
  theme: {
    borderRadius: {
      none: "0",
      sm: "0.375rem",
      DEFAULT: "0.5rem",
      md: "0.625rem",
      lg: "0.75rem",
      xl: "1rem",
      "2xl": "1.25rem",
      "3xl": "1.5rem",
      full: "9999px",
    },
    boxShadow: {
      none: "none",
      sm: "0 1px 2px rgba(16,24,40,0.09)",
      DEFAULT: "0 1px 2px rgba(16,24,40,0.08), 0 6px 16px -6px rgba(16,24,40,0.16), inset 0 1px 0 rgba(255,255,255,0.65)",
      md: "0 1px 2px rgba(16,24,40,0.08), 0 8px 20px -6px rgba(16,24,40,0.18), inset 0 1px 0 rgba(255,255,255,0.65)",
      lg: "0 2px 4px rgba(16,24,40,0.08), 0 16px 32px -8px rgba(16,24,40,0.22), inset 0 1px 0 rgba(255,255,255,0.6)",
      xl: "0 4px 8px rgba(16,24,40,0.08), 0 24px 48px -12px rgba(16,24,40,0.28), inset 0 1px 0 rgba(255,255,255,0.6)",
      "2xl": "0 8px 16px rgba(16,24,40,0.10), 0 32px 64px -16px rgba(16,24,40,0.32)",
      inner: "inset 0 2px 4px rgba(16,24,40,0.14), inset 0 1px 1px rgba(16,24,40,0.08)",
      raised: "0 1px 2px rgba(16,24,40,0.08), 0 10px 24px -8px rgba(16,24,40,0.20), inset 0 1px 0 rgba(255,255,255,0.7)",
      btn: "inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -2px 4px rgba(0,0,0,0.14), 0 2px 4px rgba(16,24,40,0.20), 0 6px 12px -4px rgba(16,24,40,0.22)",
      "btn-active": "inset 0 2px 6px rgba(0,0,0,0.30)",
      press: "inset 0 2px 5px rgba(16,24,40,0.16)",
      brutal: "0 1px 2px rgba(16,24,40,0.08), 0 10px 24px -8px rgba(16,24,40,0.20), inset 0 1px 0 rgba(255,255,255,0.7)",
      "brutal-sm": "0 1px 2px rgba(16,24,40,0.08), 0 4px 10px -3px rgba(16,24,40,0.16)",
      "brutal-lg": "0 2px 4px rgba(16,24,40,0.08), 0 18px 36px -10px rgba(16,24,40,0.24), inset 0 1px 0 rgba(255,255,255,0.6)",
      "brutal-xl": "0 4px 8px rgba(16,24,40,0.08), 0 28px 56px -14px rgba(16,24,40,0.30)",
    },
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e3a8a",
          900: "#172554",
        },
        pop: {
          yellow: "#ee8a3c",
          pink: "#6366f1",
          cyan: "#38bdf8",
          lime: "#2dd4bf",
          orange: "#f97316",
          teal: "#2dd4bf",
          navy: "#1e3a8a",
          ink: "#08111f",
        },
        cream: {
          50: "#faf6ef",
          100: "#f6f1e8",
          200: "#efe7d9",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display-face)", "Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": { "0%": { opacity: "0", transform: "translateY(4px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
