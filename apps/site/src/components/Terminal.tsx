import { useEffect, useRef, useState } from "react";
import { resume } from "../profile";
import { downloadCv } from "../cvPdf";

type Line = { kind: "in" | "out"; text: string };

const HELP = [
  "Available commands:",
  "  help        show this help",
  "  whoami      name + current role",
  "  about       summary",
  "  experience  work history",
  "  skills      skills & tech",
  "  projects    notable projects",
  "  cv          download my CV (PDF)",
  "  contact     how to reach me",
  "  clear       clear the screen",
  "  sudo hire   ;)",
].join("\n");

export function Terminal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [lines, setLines] = useState<Line[]>([{ kind: "out", text: "caleb.sh — type `help` to start." }]);
  const [value, setValue] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo(0, bodyRef.current.scrollHeight);
  }, [lines]);

  const print = (text: string) => setLines((l) => [...l, { kind: "out", text }]);

  function run(raw: string) {
    const cmd = raw.trim();
    setLines((l) => [...l, { kind: "in", text: cmd }]);
    const b = resume.basics;
    const [name, ...rest] = cmd.split(" ");
    switch (name) {
      case "":
        break;
      case "help":
        print(HELP);
        break;
      case "whoami":
        print(`${b.name} — ${b.label ?? ""}`);
        break;
      case "about":
        print(b.summary ?? "…");
        break;
      case "experience":
        print(
          (resume.work ?? [])
            .map((w) => `• ${w.position} @ ${w.name} (${w.startDate}–${w.endDate || "now"})`)
            .join("\n") || "…",
        );
        break;
      case "skills":
        print((resume.skills ?? []).flatMap((s) => s.keywords ?? []).join(", ") || "…");
        break;
      case "projects":
        print((resume.projects ?? []).map((p) => `• ${p.name} — ${p.description ?? ""}`).join("\n") || "…");
        break;
      case "cv":
        print("Generating CV…");
        downloadCv(resume);
        break;
      case "contact":
        print(b.email ?? "see the ⌘K palette for links");
        break;
      case "sudo":
        print(rest[0] === "hire" ? `Permission granted ✅ → ${b.email ?? ""}` : "nice try.");
        break;
      case "clear":
        setLines([]);
        break;
      default:
        print(`command not found: ${name} (try \`help\`)`);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-3xl">
      <div className="m-3 overflow-hidden rounded-xl border border-slate-700 bg-[#0b1020] font-mono text-sm shadow-2xl">
        <div className="flex items-center justify-between bg-[#11182f] px-3 py-2">
          <span className="text-xs text-slate-400">caleb.sh</span>
          <button className="text-slate-400 hover:text-white" onClick={onClose}>✕</button>
        </div>
        <div ref={bodyRef} className="h-64 overflow-auto px-3 py-2 text-slate-200">
          {lines.map((l, i) => (
            <pre key={i} className="whitespace-pre-wrap">
              {l.kind === "in" ? <span className="text-brand-accent">$ </span> : null}
              {l.text}
            </pre>
          ))}
        </div>
        <form
          className="flex items-center gap-2 border-t border-slate-700 px-3 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            run(value);
            setValue("");
          }}
        >
          <span className="text-brand-accent">$</span>
          <input
            autoFocus
            className="flex-1 bg-transparent text-slate-100 outline-none"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </form>
      </div>
    </div>
  );
}
