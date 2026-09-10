#!/usr/bin/env python3
"""Regenerate src/data/issues.json from the Allyant CSV in Resources/."""

from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "Resources" / "trimble-trimble-unity-construct-2025-audit-ongoing-support-published-issues-2026-09-10-18_02_33.csv"
OUT = ROOT / "src" / "data" / "issues.json"


def urls(value: str | None) -> list[str]:
    if not value:
        return []
    return [part.strip() for part in re.split(r",\s*(?=https?://)", value) if part.strip()]


def yn(value: str | None) -> bool:
    return (value or "").strip().lower() == "yes"


def main() -> None:
    issues = []
    with SRC.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            issues.append(
                {
                    "hubId": (row.get("HUB ID") or "").strip(),
                    "location": (row.get("Location") or "").strip(),
                    "pageName": (row.get("Name") or "").strip(),
                    "sitewide": yn(row.get("Sitewide?")),
                    "affectedItem": (row.get("Affected item") or "").strip(),
                    "additionalElements": (row.get("Additional Elements") or "").strip(),
                    "component": (row.get("Component") or "").strip(),
                    "description": (row.get("Description of item/issue") or "").strip(),
                    "wcag": (row.get("WCAG Guideline") or "").strip(),
                    "affectedUsers": (row.get("Affected Users") or "").strip(),
                    "recommendedFix": (row.get("Recommended Fix") or "").strip(),
                    "priority": (row.get("Priority") or "").strip(),
                    "category": (row.get("Category") or "").strip(),
                    "commonIssueId": (row.get("Common Issue ID") or "").strip(),
                    "allyantStatus": (row.get("Allyant Status") or "").strip(),
                    "highRisk": yn(row.get("High Risk")),
                    "lastComment": (row.get("Last Comment") or "").strip(),
                    "screenshots": urls(row.get("All Screenshots") or row.get("Last Screenshot Link") or ""),
                    "issueLink": (row.get("Issue Link") or "").strip(),
                    "kbArticles": urls(row.get("Related Knowledge Base Articles") or ""),
                }
            )
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(issues, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(issues)} issues to {OUT}")


if __name__ == "__main__":
    main()
