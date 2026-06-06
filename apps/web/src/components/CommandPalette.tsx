import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useGenerateCv, useProfile } from "@app/api-client";
import { apiClient } from "../lib/api";

// ⌘K / Ctrl-K command palette. Quick actions + section jumps.
export function CommandPalette({ onOpenTerminal }: { onOpenTerminal: () => void }) {
  const [open, setOpen] = useState(false);
  const profile = useProfile(apiClient);
  const generate = useGenerateCv(apiClient);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const run = (fn: () => void) => {
    fn();
    setOpen(false);
  };

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  const email = profile.data?.basics.email;
  const linkedin = profile.data?.basics.profiles.find((p) => p.network === "LinkedIn")?.url;
  const github = profile.data?.basics.profiles.find((p) => p.network === "GitHub")?.url;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-32"
      onClick={() => setOpen(false)}
    >
      <Command
        className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command.Input
          autoFocus
          placeholder="Type a command or search…"
          className="w-full border-b px-4 py-3 text-sm outline-none"
        />
        <Command.List className="max-h-80 overflow-auto p-2">
          <Command.Empty className="px-3 py-2 text-sm text-gray-500">No results.</Command.Empty>

          <Command.Group heading="Actions" className="text-xs text-gray-400">
            <Item onSelect={() => run(() => generate.mutate("pdf"))}>⬇️ Download CV (PDF)</Item>
            <Item onSelect={() => run(() => jump("tailor"))}>✨ Tailor CV to a job</Item>
            <Item onSelect={() => run(() => jump("ask"))}>🤖 Ask my CV</Item>
            <Item onSelect={() => run(onOpenTerminal)}>🖥️ Open terminal</Item>
            {email && (
              <Item onSelect={() => run(() => navigator.clipboard.writeText(email))}>
                ✉️ Copy email
              </Item>
            )}
          </Command.Group>

          <Command.Group heading="Jump to" className="text-xs text-gray-400">
            <Item onSelect={() => run(() => jump("experience"))}>Experience</Item>
            <Item onSelect={() => run(() => jump("skills"))}>Skills</Item>
          </Command.Group>

          <Command.Group heading="Links" className="text-xs text-gray-400">
            {github && <Item onSelect={() => run(() => window.open(github, "_blank"))}>GitHub ↗</Item>}
            {linkedin && (
              <Item onSelect={() => run(() => window.open(linkedin, "_blank"))}>LinkedIn ↗</Item>
            )}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}

function Item({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="cursor-pointer rounded-md px-3 py-2 text-sm text-gray-800 aria-selected:bg-brand-accent aria-selected:text-white"
    >
      {children}
    </Command.Item>
  );
}
