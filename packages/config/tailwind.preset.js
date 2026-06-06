// LOCAL Tailwind preset shared by web + mobile (NativeWind). NOTE: upstream
// @platform/config does NOT ship a tailwind preset, so this is a local addition.
// If one is added upstream, consume it here instead of defining tokens locally.

/** @type {Partial<import("tailwindcss").Config>} */
export default {
  theme: {
    extend: {
      colors: {
        // Minimal shared brand tokens for the calebsargeant.com product.
        brand: {
          DEFAULT: "#0f172a",
          accent: "#6366f1",
        },
      },
    },
  },
};
