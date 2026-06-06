import { useEffect, useRef, useState } from "react";
import { useProfile, useGenerateCv } from "@app/api-client";
import { apiClient } from "../lib/api";

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
  "  ask <q>     ask my CV anything",
  "  contact     how to reach me",
  "  clear       clear the screen",
  "  sudo hire   ;)",
].join("\n");

// A real typeable terminal — the classic dev-site flex.
export function Terminal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const profile = useProfile(apiClient);
  const generate = useGenerateCv(apiClient);
  const [lines, setLines] = useState<Line[]>([
    { kind: "out", text: "caleb.sh — type `help` to get started." },
  ]);
  const [value, setValue] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo(0, bodyRef.current.scrollHeight);
  }, [lines]);

  const print = (text: string) => setLines((l) => [...l, { kind: "out", text }]);

  async function run(raw: string) {
    const cmd = raw.trim();
    setLines((l) => [...l, { kind: "in", text: cmd }]);
    const p = profile.data;
    const [name, ...rest] = cmd.split(" ");

    switch (name) {
      case "":
        break;
      case "help":
        print(HELP);
        break;
      case "whoami":
        print(p ? `${p.basics.name} — ${p.basics.label ?? ""}` : "…");
        break;
      case "about":
        print(p?.basics.summary ?? "…");
        break;
      case "experience":
        print(
          (p?.work ?? [])
            .map((w) => `• ${w.position} @ ${w.name} (${w.startDate}–${w.endDate ?? "now"})`)
            .join("\n") || "…",
        );
        break;
      case "skills":
        print((p?.skills ?? []).flatMap((s) => s.keywords).join(", ") || "…");
        break;
      case "projects":
        print((p?.projects ?? []).map((pr) => `• ${pr.name} — ${pr.description ?? ""}`).join("\n") || "…");
        break;
      case "cv":
        print("Generating CV…");
        generate.mutate("pdf");
        break;
      case "contact":
        print(p?.basics.email ?? "see the links in the ⌘K palette");
        break;
      case "ask": {
        const q = rest.join(" ");
        if (!q) return print("usage: ask <your question>");
        print("🤔 thinking…");
        try {
          print(await apiClient.askCv(q));
        } catch {
          print("assistant unavailable right now.");
        }
        break;
      }
      case "sudo":
        print(rest[0] === "hire" ? "Permission granted ✅ → " + (p?.basics.email ?? "") : "nice try.");
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
      <div className="m-3 overflow-hidden rounded-xl border border-gray-700 bg-[#0b1020] font-mono text-sm shadow-2xl">
        <div className="flex items-center justify-between bg-[#11182f] px-3 py-2">
          <span className="text-xs text-gray-400">caleb.sh</span>
          <button className="text-gray-400 hover:text-white" onClick={onClose}>
            ✕
          </button>
        </div>
        <div ref={bodyRef} className="h-64 overflow-auto px-3 py-2 text-gray-200">
          {lines.map((l, i) => (
            <pre key={i} className="whitespace-pre-wrap">
              {l.kind === "in" ? <span className="text-brand-accent">$ </span> : null}
              {l.text}
            </pre>
          ))}
        </div>
        <form
          className="flex items-center gap-2 border-t border-gray-700 px-3 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            void run(value);
            setValue("");
          }}
        >
          <span className="text-brand-accent">$</span>
          <input
            autoFocus
            className="flex-1 bg-transparent text-gray-100 outline-none"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </form>
      </div>
    </div>
  );
}
