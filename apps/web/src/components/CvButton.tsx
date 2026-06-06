import { useGenerateCv } from "@app/api-client";
import { Button } from "@platform/ui";
import { apiClient } from "../lib/api";

// Generates the CV on demand from the live profile data — never a stale artifact.
export function CvButton() {
  const generate = useGenerateCv(apiClient);
  return (
    <div className="flex items-center gap-3">
      <Button onClick={() => generate.mutate("pdf")} disabled={generate.isPending}>
        {generate.isPending ? "Generating…" : "Generate CV (PDF)"}
      </Button>
      <a className="text-sm text-brand-accent underline" href={apiClient.cvUrl("json")}>
        JSON Resume
      </a>
    </div>
  );
}
