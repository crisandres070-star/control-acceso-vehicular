import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          50: "#f4f0ff",
          100: "#e9deff",
          200: "#d1bcff",
          300: "#b392ff",
          400: "#9567ff",
          500: "#7c3aed",
          600: "#6926d9",
          700: "#571db2",
          800: "#46188c",
          900: "#341267",
        },
      },
      boxShadow: {
        panel: "0 24px 70px rgba(15, 23, 42, 0.08)",
      },
      backgroundImage: {
        "mesh-glow": "radial-gradient(circle at 10% 20%, rgba(124, 58, 237, 0.2), transparent 32%), radial-gradient(circle at 90% 10%, rgba(244, 114, 182, 0.18), transparent 28%), linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(245, 243, 255, 0.92))",
      },
    },
  },
  plugins: [],
};

export default config;
