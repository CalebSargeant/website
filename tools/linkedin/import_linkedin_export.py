"""Bootstrap content/profile.json from a LinkedIn data export (ToS-safe).

LinkedIn → Settings → Data privacy → Get a copy of your data. Point --export-dir at
the unzipped folder containing Profile.csv / Positions.csv / Education.csv / Skills.csv.
Only fields present in the export are filled; the rest of profile.json is preserved.
"""

from __future__ import annotations

import argparse
import csv
from pathlib import Path
from typing import Any

from _profile import load_profile, save_profile


def _read(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open(encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def _yyyy_mm(month: str, year: str) -> str:
    month, year = (month or "").strip(), (year or "").strip()
    if year and month:
        return f"{year}-{int(month):02d}"
    return year


def import_export(export_dir: Path) -> dict[str, Any]:
    profile = load_profile()

    profiles = _read(export_dir / "Profile.csv")
    if profiles:
        p = profiles[0]
        basics = profile.setdefault("basics", {})
        basics["name"] = f"{p.get('First Name', '')} {p.get('Last Name', '')}".strip() or basics.get("name")
        basics["label"] = p.get("Headline") or basics.get("label")
        basics["summary"] = p.get("Summary") or basics.get("summary")

    positions = _read(export_dir / "Positions.csv")
    if positions:
        profile["work"] = [
            {
                "name": pos.get("Company Name", ""),
                "position": pos.get("Title", ""),
                "location": pos.get("Location", ""),
                "startDate": _yyyy_mm(pos.get("Started On Month", ""), pos.get("Started On Year", ""))
                or pos.get("Started On", ""),
                "endDate": _yyyy_mm(pos.get("Finished On Month", ""), pos.get("Finished On Year", ""))
                or pos.get("Finished On", ""),
                "summary": pos.get("Description", ""),
                "highlights": [],
                "tech": [],
            }
            for pos in positions
        ]

    education = _read(export_dir / "Education.csv")
    if education:
        profile["education"] = [
            {
                "institution": e.get("School Name", ""),
                "area": e.get("Degree Name", "") or e.get("Notes", ""),
                "startDate": e.get("Start Date", ""),
                "endDate": e.get("End Date", ""),
            }
            for e in education
        ]

    skills = _read(export_dir / "Skills.csv")
    if skills:
        profile.setdefault("skills", [])
        names = [s.get("Name", "") for s in skills if s.get("Name")]
        if names:
            profile["skills"] = [{"name": "From LinkedIn", "keywords": names}]

    return profile


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--export-dir", required=True, type=Path)
    args = parser.parse_args()

    updated = import_export(args.export_dir)
    save_profile(updated)
    print(f"Updated {Path('content/profile.json')} from {args.export_dir}")
    print("Review the diff, then commit.")


if __name__ == "__main__":
    main()
