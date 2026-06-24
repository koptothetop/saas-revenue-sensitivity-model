import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0a",
        cream: "#faf8f3",
        coral: "#ff6b5b",
        blue: "#4a90e2",
        lime: "#c4ff00",
        newlogo: "#4a90e2",
        expansion: "#c4ff00",
        mint: "#7fffd4",
        line: "#e8e4dc",
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "Fira Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
