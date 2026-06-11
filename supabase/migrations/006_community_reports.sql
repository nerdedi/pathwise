-- Add lightweight moderation reporting for community notes
alter table if exists venue_community_data
  add column if not exists report_count integer default 0;

create table if not exists venue_community_reports (
  id uuid primary key default uuid_generate_v4(),
  entry_id uuid not null references venue_community_data(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  created_at timestamptz default now(),
  unique(entry_id, user_id)
);

alter table venue_community_reports enable row level security;

drop policy if exists "Users can submit community reports" on venue_community_reports;
create policy "Users can submit community reports"
  on venue_community_reports for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own community reports" on venue_community_reports;
create policy "Users can read own community reports"
  on venue_community_reports for select
  using (auth.uid() = user_id);

create index if not exists idx_community_reports_entry_id on venue_community_reports(entry_id);
create index if not exists idx_community_reports_user_id on venue_community_reports(user_id);
