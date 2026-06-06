import { z } from "zod";

// ---------------------------------------------------------------------------
// Re-export the SHARED `Item` shape from upstream (@platform/schemas). We
// reference it from Widget, so we re-export (never redefine) it — the foreign
// type isn't duplicated. Upstream names the zod schema `Item` (value + type).
// ---------------------------------------------------------------------------
export { Item, ItemCreate } from "@platform/schemas";

// ---------------------------------------------------------------------------
// NEW entity owned by THIS repo: Widget. Single source of truth (zod side).
// `item_id` is a foreign reference to the shared Item.
// ---------------------------------------------------------------------------
export const Widget = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  item_id: z.string().uuid(),
  created_at: z.string().datetime(),
});
export type Widget = z.infer<typeof Widget>;

// Payload for creating a Widget (server assigns id + created_at).
export const WidgetCreate = Widget.pick({ name: true, item_id: true });
export type WidgetCreate = z.infer<typeof WidgetCreate>;

export const WidgetList = z.array(Widget);
export type WidgetList = z.infer<typeof WidgetList>;
