import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { resume } from "../profile";
import { downloadCv } from "../cvPdf";

// ⌘K / Ctrl-K command palette.
export function Palette({ onOpenTerminal }: { onOpenTerminal: () => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
  };
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const email = resume.basics.email;
  const links = resume.basics.profiles ?? [];

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-32" onClick={() => setOpen(false)}>
      <Command className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <Command.Input autoFocus placeholder="Type a command…" className="w-full border-b px-4 py-3 text-sm outline-none" />
        <Command.List className="max-h-80 overflow-auto p-2">
          <Command.Empty className="px-3 py-2 text-sm text-slate-500">No results.</Command.Empty>
          <Command.Group heading="Actions" className="px-2 text-xs text-slate-400">
            <Row onSelect={() => run(() => downloadCv(resume))}>⬇️ Download CV (PDF)</Row>
            <Row onSelect={() => run(onOpenTerminal)}>🖥️ Open terminal</Row>
            {email && <Row onSelect={() => run(() => navigator.clipboard.writeText(email))}>✉️ Copy email</Row>}
          </Command.Group>
          <Command.Group heading="Jump to" className="px-2 text-xs text-slate-400">
            <Row onSelect={() => run(() => jump("experience"))}>Experience</Row>
            <Row onSelect={() => run(() => jump("skills"))}>Skills</Row>
            <Row onSelect={() => run(() => jump("projects"))}>Projects</Row>
          </Command.Group>
          {links.length > 0 && (
            <Command.Group heading="Links" className="px-2 text-xs text-slate-400">
              {links.map((l) => (
                <Row key={l.url} onSelect={() => run(() => window.open(l.url, "_blank"))}>
                  {l.network} ↗
                </Row>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  );
}

function Row({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="cursor-pointer rounded-md px-3 py-2 text-sm text-slate-800 aria-selected:bg-brand-accent aria-selected:text-white"
    >
      {children}
    </Command.Item>
  );
}
