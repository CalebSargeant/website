// Re-export the upstream Prettier preset. Extend, don't re-derive.
import platform from "@platform/config/prettier";

/** @type {import("prettier").Config} */
export default {
  ...platform,
};
