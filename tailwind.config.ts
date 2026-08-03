import type { Config } from "tailwindcss";

// Tailwind exists ONLY for the ported PeekScout Studio (VideoStudio.tsx).
// Preflight is disabled so the landing page's plain-CSS styling is untouched.
// The ink/mist/accent tokens mirror PeekScout's dark studio theme, with the
// accent swapped to AfterShot sky.
const config: Config = {
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        ink: {
          950: "var(--ink-950)",
          900: "var(--ink-900)",
          800: "var(--ink-800)",
          700: "var(--ink-700)",
          DEFAULT: "var(--ink-900)",
        },
        mist: {
          100: "var(--mist-100)",
          200: "var(--mist-200)",
          300: "var(--mist-300)",
          400: "var(--mist-400)",
          600: "var(--mist-600)",
        },
        accent: {
          200: "var(--accent-200)",
          300: "var(--accent-300)",
          400: "var(--accent-400)",
          500: "var(--accent-500)",
          600: "var(--accent-600)",
          DEFAULT: "var(--accent-500)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
