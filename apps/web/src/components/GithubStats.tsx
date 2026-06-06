import { useGithubStats } from "@app/api-client";
import { apiClient } from "../lib/api";

// Live GitHub activity — fetched server-side and surfaced here.
export function GithubStats() {
  const stats = useGithubStats(apiClient);
  if (stats.isLoading) return <p className="text-sm text-gray-500">Loading GitHub…</p>;
  if (stats.isError || !stats.data) return null;

  const s = stats.data;
  return (
    <section className="rounded-xl border bg-white/50 p-5">
      <h2 className="mb-3 text-lg font-semibold text-brand">Live from GitHub</h2>
      <div className="grid grid-cols-3 gap-3 text-center">
        <Stat label="Repos" value={s.public_repos} />
        <Stat label="Stars" value={s.total_stars} />
        <Stat label="Followers" value={s.followers} />
      </div>
      {s.top_languages.length > 0 && (
        <p className="mt-3 text-sm text-gray-500">
          Top: {s.top_languages.map((l) => l.name).join(" · ")}
        </p>
      )}
      {s.latest_repo && (
        <a
          className="mt-2 block text-sm text-brand-accent underline"
          href={s.latest_repo.url}
          target="_blank"
          rel="noreferrer"
        >
          Latest: {s.latest_repo.name}
        </a>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-gray-50 py-3">
      <div className="text-2xl font-bold text-brand">{value}</div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
    </div>
  );
}
