-- WCAG Allyant — isolated tables for this app only.
-- Safe to run on a shared or empty Supabase project.
-- Does not alter, drop, or grant access to any other tables.
--
-- Paste this entire file into: Supabase Dashboard → SQL Editor → New query → Run.
--
-- All objects are prefixed wcag_allyant_ so later apps can use public without colliding.

create table if not exists public.wcag_allyant_ticket_overlays (
  hub_id text primary key,
  status text not null
    check (status in ('open', 'in_progress', 'resolved', 'wont_fix')),
  notes text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists public.wcag_allyant_ticket_comments (
  id text primary key,
  hub_id text not null
    references public.wcag_allyant_ticket_overlays (hub_id)
    on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists wcag_allyant_ticket_comments_hub_id_idx
  on public.wcag_allyant_ticket_comments (hub_id, created_at);

comment on table public.wcag_allyant_ticket_overlays is
  'WCAG Allyant ticket status and notes. Do not reuse from other apps.';
comment on table public.wcag_allyant_ticket_comments is
  'WCAG Allyant ticket comments. Do not reuse from other apps.';

alter table public.wcag_allyant_ticket_overlays enable row level security;
alter table public.wcag_allyant_ticket_comments enable row level security;

-- Open access (no login), scoped to these two tables only.
drop policy if exists wcag_allyant_overlays_select on public.wcag_allyant_ticket_overlays;
drop policy if exists wcag_allyant_overlays_insert on public.wcag_allyant_ticket_overlays;
drop policy if exists wcag_allyant_overlays_update on public.wcag_allyant_ticket_overlays;
drop policy if exists wcag_allyant_overlays_delete on public.wcag_allyant_ticket_overlays;
drop policy if exists wcag_allyant_comments_select on public.wcag_allyant_ticket_comments;
drop policy if exists wcag_allyant_comments_insert on public.wcag_allyant_ticket_comments;
drop policy if exists wcag_allyant_comments_update on public.wcag_allyant_ticket_comments;
drop policy if exists wcag_allyant_comments_delete on public.wcag_allyant_ticket_comments;

create policy wcag_allyant_overlays_select
  on public.wcag_allyant_ticket_overlays
  for select
  to anon, authenticated
  using (true);

create policy wcag_allyant_overlays_insert
  on public.wcag_allyant_ticket_overlays
  for insert
  to anon, authenticated
  with check (true);

create policy wcag_allyant_overlays_update
  on public.wcag_allyant_ticket_overlays
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy wcag_allyant_overlays_delete
  on public.wcag_allyant_ticket_overlays
  for delete
  to anon, authenticated
  using (true);

create policy wcag_allyant_comments_select
  on public.wcag_allyant_ticket_comments
  for select
  to anon, authenticated
  using (true);

create policy wcag_allyant_comments_insert
  on public.wcag_allyant_ticket_comments
  for insert
  to anon, authenticated
  with check (true);

create policy wcag_allyant_comments_update
  on public.wcag_allyant_ticket_comments
  for update
  to anon, authenticated
  using (true)
  with check (true);

create policy wcag_allyant_comments_delete
  on public.wcag_allyant_ticket_comments
  for delete
  to anon, authenticated
  using (true);

grant select, insert, update, delete
  on public.wcag_allyant_ticket_overlays
  to anon, authenticated;

grant select, insert, update, delete
  on public.wcag_allyant_ticket_comments
  to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wcag_allyant_ticket_overlays'
  ) then
    execute 'alter publication supabase_realtime add table public.wcag_allyant_ticket_overlays';
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'wcag_allyant_ticket_comments'
  ) then
    execute 'alter publication supabase_realtime add table public.wcag_allyant_ticket_comments';
  end if;
end $$;
