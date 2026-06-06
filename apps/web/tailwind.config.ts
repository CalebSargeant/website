import type { Config } from "tailwindcss";
import preset from "@app/config/tailwind";

export default {
  presets: [preset],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    // Pull class names out of the shared web component library too.
    "../../node_modules/@platform/ui/dist/**/*.js",
  ],
} satisfies Config;
