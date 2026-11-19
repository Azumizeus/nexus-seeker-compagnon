/** @type {import('tailwindcss').Config} */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
      colors: {
        background: token("background"),
        surface: { DEFAULT: token("surface"), sunken: token("surface-sunken") },
        foreground: token("foreground"),
        muted: { foreground: token("muted-foreground") },
        border: { DEFAULT: token("border"), strong: token("border-strong") },
        primary: {
          DEFAULT: token("primary"),
          ink: token("primary-ink"),
          soft: token("primary-soft"),
          foreground: token("primary-foreground"),
        },
        secondary: {
          DEFAULT: token("secondary"),
          ink: token("secondary-ink"),
          soft: token("secondary-soft"),
          foreground: token("secondary-foreground"),
        },
        accent: { DEFAULT: token("accent"), ink: token("accent-ink"), soft: token("accent-soft") },
        danger: {
          DEFAULT: token("danger"),
          ink: token("danger-ink"),
          soft: token("danger-soft"),
          foreground: token("danger-foreground"),
        },
        warning: { DEFAULT: token("warning"), soft: token("warning-soft"), ink: token("warning-ink") },
        agent: {
          0: token("agent-0"),
          1: token("agent-1"),
          2: token("agent-2"),
          3: token("agent-3"),
          4: token("agent-4"),
          5: token("agent-5"),
          6: token("agent-6"),
        },
        ring: token("ring"),
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        xl: "calc(var(--radius) - 4px)",
        "2xl": "var(--radius)",
        "3xl": "calc(var(--radius) + 6px)",
      },
      minHeight: { tap: "var(--tap)" },
      minWidth: { tap: "var(--tap)" },
      height: { tap: "var(--tap)" },
      boxShadow: {
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
        float: "var(--shadow-float)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        bounce: "var(--ease-bounce)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
