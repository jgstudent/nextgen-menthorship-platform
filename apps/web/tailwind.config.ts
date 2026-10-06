import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0B1220",
          sidebar: "#111827",
          blue: "#1D4ED8",
          hover: "#2563EB",
          green: "#10B981",
          gold: "#D4A017",
          mist: "#F8FAFC",
          card: "#FFFFFF",
          ink: "#1E293B",
          muted: "#64748B"
        }
      },
      boxShadow: {
        soft: "0 18px 45px rgba(15, 23, 42, 0.08)",
        panel: "0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.06)"
      }
    }
  },
  plugins: []
};

export default config;
