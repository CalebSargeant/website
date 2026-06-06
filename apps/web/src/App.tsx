import { useProfile } from "@app/api-client";
import { apiClient } from "./lib/api";
import { CvButton } from "./components/CvButton";
import { AskMyCv } from "./components/AskMyCv";
import { GithubStats } from "./components/GithubStats";
import { CareerTimeline3D } from "./components/CareerTimeline3D";

export function App() {
  const profile = useProfile(apiClient);

  if (profile.isLoading) return <Centered>Loading…</Centered>;
  if (profile.isError || !profile.data) return <Centered>Could not load profile.</Centered>;

  const { basics, work, skills } = profile.data;

  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-brand">{basics.name}</h1>
        {basics.label && <p className="text-lg text-brand-accent">{basics.label}</p>}
        {basics.summary && <p className="text-gray-600">{basics.summary}</p>}
        <div className="pt-3">
          <CvButton />
        </div>
      </header>

      {work.length > 0 && <CareerTimeline3D work={work} />}

      <div className="grid gap-6 sm:grid-cols-2">
        <AskMyCv />
        <GithubStats />
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-brand">Experience</h2>
        <ul className="space-y-4">
          {work.map((w, i) => (
            <li key={`${w.name}-${i}`} className="rounded-lg border p-4">
              <div className="flex justify-between">
                <span className="font-medium">
                  {w.position} — {w.name}
                </span>
                <span className="text-sm text-gray-500">
                  {w.startDate} – {w.endDate ?? "Present"}
                </span>
              </div>
              {w.summary && <p className="mt-1 text-sm text-gray-600">{w.summary}</p>}
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
                {w.highlights.map((h, j) => (
                  <li key={j}>{h}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      {skills.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-semibold text-brand">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {skills.flatMap((s) => s.keywords).map((k) => (
              <span key={k} className="rounded-full bg-gray-100 px-3 py-1 text-sm">
                {k}
              </span>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex h-screen items-center justify-center text-gray-500">{children}</div>;
}
