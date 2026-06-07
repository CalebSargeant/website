import { useState } from "react";
import { resume } from "./profile";
import { downloadCv } from "./cvPdf";
import { Timeline3D } from "./components/Timeline3D";
import { Palette } from "./components/Palette";
import { Terminal } from "./components/Terminal";

export function App() {
  const [terminalOpen, setTerminalOpen] = useState(false);
  const { basics, work = [], skills = [], projects = [], education = [] } = resume;

  return (
    <div className="min-h-screen">
      <Palette onOpenTerminal={() => setTerminalOpen(true)} />
      <Terminal open={terminalOpen} onClose={() => setTerminalOpen(false)} />

      <main className="mx-auto max-w-3xl space-y-10 px-4 py-12">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold text-brand">{basics.name}</h1>
          {basics.label && <p className="text-xl text-brand-accent">{basics.label}</p>}
          {basics.summary && <p className="text-slate-600">{basics.summary}</p>}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white shadow hover:opacity-90"
              onClick={() => downloadCv(resume)}
            >
              ⬇️ Generate CV (PDF)
            </button>
            <button className="text-sm text-slate-500 underline" onClick={() => setTerminalOpen(true)}>
              Open terminal
            </button>
            <kbd className="rounded border bg-white px-2 py-1 text-xs text-slate-500">⌘K</kbd>
            {(basics.profiles ?? []).map((p) => (
              <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="text-sm text-slate-500 underline">
                {p.network}
              </a>
            ))}
          </div>
        </header>

        {work.length > 0 && <Timeline3D work={work} />}

        <Section id="experience" title="Experience">
          <ul className="space-y-4">
            {work.map((w, i) => (
              <li key={`${w.name}-${i}`} className="rounded-xl border border-slate-200 bg-white/70 p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">
                    {w.position} — {w.name}
                  </span>
                  <span className="text-sm text-slate-500">
                    {w.startDate} – {w.endDate || "Present"}
                  </span>
                </div>
                {w.summary && <p className="mt-1 text-sm text-slate-600">{w.summary}</p>}
                {(w.highlights ?? []).length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                    {w.highlights!.map((h, j) => (
                      <li key={j}>{h}</li>
                    ))}
                  </ul>
                )}
                {(w.tech ?? []).length > 0 && (
                  <p className="mt-2 text-xs text-slate-400">{w.tech!.join(" · ")}</p>
                )}
              </li>
            ))}
          </ul>
        </Section>

        {projects.length > 0 && (
          <Section id="projects" title="Projects">
            <ul className="grid gap-4 sm:grid-cols-2">
              {projects.map((p) => (
                <li key={p.name} className="rounded-xl border border-slate-200 bg-white/70 p-4">
                  <p className="font-medium">{p.name}</p>
                  {p.description && <p className="mt-1 text-sm text-slate-600">{p.description}</p>}
                  {(p.keywords ?? []).length > 0 && (
                    <p className="mt-2 text-xs text-slate-400">{p.keywords!.join(" · ")}</p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {skills.length > 0 && (
          <Section id="skills" title="Skills">
            <div className="flex flex-wrap gap-2">
              {skills.flatMap((s) => s.keywords ?? []).map((k) => (
                <span key={k} className="rounded-full bg-white px-3 py-1 text-sm shadow-sm">
                  {k}
                </span>
              ))}
            </div>
          </Section>
        )}

        {education.length > 0 && (
          <Section id="education" title="Education">
            <ul className="space-y-2">
              {education.map((e, i) => (
                <li key={i} className="text-sm text-slate-700">
                  <span className="font-medium">
                    {[e.studyType, e.area].filter(Boolean).join(" ")} — {e.institution}
                  </span>{" "}
                  <span className="text-slate-500">
                    ({e.startDate} – {e.endDate})
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <footer className="border-t pt-6 text-center text-xs text-slate-400">
          Built from a single source of truth · CV generated in-browser · Press ⌘K
        </footer>
      </main>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id}>
      <h2 className="mb-3 text-xl font-semibold text-brand">{title}</h2>
      {children}
    </section>
  );
}
