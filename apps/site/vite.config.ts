import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so it works under a GitHub Pages project subpath (/website/).
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    fs: {
      // Allow importing the shared content/profile.json from the repo root.
      // Entries are resolved relative to this app's root (apps/site).
      allow: ["../.."],
    },
  },
});
