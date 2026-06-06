// Re-export the SHARED `Item` shape from upstream (@platform/schemas) — kept for
// the two-layer contract pattern even though the résumé domain doesn't use it.
// Upstream names the zod schema `Item` (value + type) with `ItemCreate`.
export { Item, ItemCreate } from "@platform/schemas";

// The product's own contract — the résumé / profile (single source of truth).
export * from "./resume";
