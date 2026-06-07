import type { Resume } from "./types";
// Bundle the shared single source of truth at build time. Editing
// content/profile.json and rebuilding updates the whole site + CV.
import raw from "../../../content/profile.json";

// Strip the editor-facing note key, then expose the typed résumé.
const { $note, ...rest } = raw as Record<string, unknown>;
void $note;

export const resume = rest as unknown as Resume;
