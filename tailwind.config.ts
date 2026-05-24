import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { mono: ["var(--font-mono)"], sans: ["var(--font-sans)"] },
    },
  },
  plugins: [],
};

export default config;
