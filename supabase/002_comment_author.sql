-- Add commenter name to existing WCAG Allyant comment rows.
-- Safe to re-run. Paste into Supabase SQL Editor if the table already exists.

alter table public.wcag_allyant_ticket_comments
  add column if not exists author text not null default '';
