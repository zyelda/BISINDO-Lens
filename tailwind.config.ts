import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F4EFE6",
        "paper-sunk": "#E8E1D4",
        ink: "#191714",
        "ink-muted": "#5A554B",
        rule: "rgba(25, 23, 20, 0.14)",
        accent: "#A63D24",
        "signal-ok": "#3F6B4A",
        "signal-warn": "#8A6414",
        "signal-stop": "#8C2F2F",
        stage: "#12110E",
      },
      fontFamily: {
        display: [
          "Fraunces",
          "Iowan Old Style",
          "Palatino Linotype",
          "Book Antiqua",
          "Georgia",
          "serif",
        ],
        sans: [
          "Inter",
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.08em" }],
      },
      maxWidth: {
        folio: "76rem",
      },
      transitionDuration: {
        120: "120ms",
      },
    },
  },
  plugins: [],
} satisfies Config;
