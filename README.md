# WCAG Allyant

Local ticket tracker for the Trimble Unity Construct 2025 Allyant accessibility audit.

Audit issues are imported from `Resources/trimble-trimble-unity-construct-2025-audit-ongoing-support-published-issues-2026-09-10-18_02_33.csv` into `src/data/issues.json`. Local status, notes, and comments are stored in this browser (`localStorage` key `wcag-allyant-tickets-v1`). Export progress from the dashboard if you want a JSON backup.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173/`).

Regenerate issue JSON after replacing the CSV:

```bash
npm run convert-csv
```
