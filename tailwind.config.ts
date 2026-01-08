import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  content: ["./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        "argo-bg": "var(--bg)",
        "argo-card": "var(--card)",
        "argo-text": "var(--text)",
        "argo-muted": "var(--muted)",
        "argo-border": "var(--border)",
        "argo-accent": "var(--accent)",
        "argo-accent-2": "var(--accent-2)",
      },
    },
  },
  plugins: [typography],
} satisfies Config;
