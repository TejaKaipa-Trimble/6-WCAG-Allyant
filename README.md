# WCAG Allyant

Ticket tracker for the Trimble Unity Construct 2025 Allyant accessibility audit.

Audit issues are imported from `Resources/trimble-trimble-unity-construct-2025-audit-ongoing-support-published-issues-2026-09-10-18_02_33.csv` into `src/data/issues.json`. Status, notes, and comments sync to this app’s own Supabase tables (`wcag_allyant_ticket_overlays`, `wcag_allyant_ticket_comments`). Status is shared between Modus and Unity users. Unique issues are grouped by Modus component + finding description; changing status on one HUB updates every HUB chip for that same finding. Those tables are prefixed so later apps in the same project will not collide. Export progress from the dashboard if you want a JSON backup.

## Supabase (first run)

1. Open **SQL Editor** in the Supabase project and run `supabase/001_wcag_allyant.sql`.
2. Confirm `.env.local` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (anon / publishable key only).
3. Restart `npm run dev` after changing env vars.

There is no login. Anyone who can open the deployed app can read and write these two tables. Existing local browser progress is uploaded once if the tables are empty.

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
