const preset = require("@app/config/tailwind").default;

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("nativewind/preset"), preset],
  content: ["./app/**/*.{ts,tsx}"],
};
