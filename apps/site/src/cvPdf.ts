import { jsPDF } from "jspdf";
import type { Resume } from "./types";

// Client-side CV generation — mirrors the backend reportlab layout closely enough
// that the static site needs no API to produce a real, downloadable PDF.

const ACCENT = "#6366f1";
const INK = "#0f172a";
const MUTED = "#64748b";
const MARGIN = 16;

export function generateCvPdf(resume: Resume): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  let y = MARGIN;

  const ensure = (h: number) => {
    if (y + h > pageH - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  };
  const text = (
    s: string,
    size: number,
    opts: { color?: string; style?: "normal" | "bold" | "italic"; gap?: number; indent?: number } = {},
  ) => {
    const { color = INK, style = "normal", gap = 1.5, indent = 0 } = opts;
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(color);
    const lines = doc.splitTextToSize(s, contentW - indent) as string[];
    for (const line of lines) {
      ensure(size * 0.45);
      doc.text(line, MARGIN + indent, y);
      y += size * 0.45 + gap;
    }
  };
  const section = (title: string) => {
    y += 3;
    ensure(10);
    text(title.toUpperCase(), 12, { color: INK, style: "bold", gap: 1 });
    doc.setDrawColor(ACCENT);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, y - 1, pageW - MARGIN, y - 1);
    y += 2;
  };

  const b = resume.basics;
  text(b.name, 22, { style: "bold", gap: 1 });
  if (b.label) text(b.label, 12, { color: ACCENT });
  const contact = [b.email, b.phone, b.url, b.location?.city, ...(b.profiles ?? []).map((p) => p.url)]
    .filter(Boolean)
    .join("  •  ");
  if (contact) text(contact, 9, { color: MUTED });
  if (b.summary) {
    y += 1;
    text(b.summary, 10, { color: INK });
  }

  if (resume.work?.length) {
    section("Experience");
    for (const w of resume.work) {
      text(`${w.position} — ${w.name}`, 11, { style: "bold", gap: 0.8 });
      const meta = [`${w.startDate ?? ""} – ${w.endDate || "Present"}`, w.location].filter(Boolean).join("  •  ");
      if (meta) text(meta, 9, { color: MUTED });
      if (w.summary) text(w.summary, 9.5, { indent: 2 });
      for (const h of w.highlights ?? []) text(`•  ${h}`, 9.5, { indent: 3 });
      if (w.tech?.length) text(w.tech.join(" · "), 8.5, { color: MUTED, style: "italic" });
      y += 1;
    }
  }

  if (resume.projects?.length) {
    section("Projects");
    for (const p of resume.projects) {
      text(p.name, 11, { style: "bold", gap: 0.8 });
      if (p.description) text(p.description, 9.5, { indent: 2 });
      for (const h of p.highlights ?? []) text(`•  ${h}`, 9.5, { indent: 3 });
    }
  }

  if (resume.skills?.length) {
    section("Skills");
    for (const s of resume.skills) {
      const kw = s.keywords?.length ? `: ${s.keywords.join(", ")}` : "";
      text(`${s.name}${kw}`, 9.5, { indent: 2 });
    }
  }

  if (resume.education?.length) {
    section("Education");
    for (const e of resume.education) {
      const degree = [`${e.studyType ?? ""} ${e.area ?? ""}`.trim(), e.institution].filter(Boolean).join(" — ");
      text(degree, 11, { style: "bold", gap: 0.8 });
      const rng = `${e.startDate ?? ""} – ${e.endDate ?? ""}`.trim();
      if (rng !== "–") text(rng, 9, { color: MUTED });
    }
  }

  if (resume.certificates?.length) {
    section("Certifications");
    for (const c of resume.certificates) {
      text([c.name, c.issuer, c.date].filter(Boolean).join("  •  "), 9.5, { indent: 2 });
    }
  }

  return doc;
}

export function downloadCv(resume: Resume): void {
  const doc = generateCvPdf(resume);
  doc.save(`${resume.basics.name.replace(/\s+/g, "_")}_CV.pdf`);
}
