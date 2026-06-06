import { useState } from "react";
import { useTailorCv } from "@app/api-client";
import { Button } from "@platform/ui";
import { apiClient } from "../lib/api";

// Paste a job description -> Claude reorders/rewords the résumé (never invents) ->
// a tailored PDF downloads. Turns the single source of truth into targeted CVs.
export function TailorCv() {
  const tailor = useTailorCv(apiClient);
  const [jd, setJd] = useState("");

  return (
    <section className="rounded-xl border bg-white/50 p-5">
      <h2 className="mb-1 text-lg font-semibold text-brand">Tailor my CV to a job ✨</h2>
      <p className="mb-3 text-sm text-gray-500">
        Paste a job description — I'll re-emphasise the most relevant experience and
        generate a tailored PDF. (Facts stay honest; nothing is invented.)
      </p>
      <textarea
        className="h-32 w-full rounded-md border p-3 text-sm"
        placeholder="Paste the job description here…"
        value={jd}
        onChange={(e) => setJd(e.target.value)}
      />
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={() => tailor.mutate(jd)} disabled={tailor.isPending || jd.trim().length < 20}>
          {tailor.isPending ? "Tailoring…" : "Tailor & download"}
        </Button>
        {tailor.isError && <span className="text-sm text-red-600">Couldn't tailor right now.</span>}
        {tailor.isSuccess && <span className="text-sm text-green-600">Downloaded ✓</span>}
      </div>
    </section>
  );
}
