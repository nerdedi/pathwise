-- Track helpful votes to prevent one user voting multiple times on the same note
create table if not exists venue_community_votes (
  id uuid primary key default uuid_generate_v4(),
  entry_id uuid not null references venue_community_data(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(entry_id, user_id)
);

alter table venue_community_votes enable row level security;

create policy "Users can cast their own helpful votes"
  on venue_community_votes for insert
  with check (auth.uid() = user_id);

create policy "Users can read their own helpful votes"
  on venue_community_votes for select
  using (auth.uid() = user_id);

create index if not exists idx_community_votes_entry_id on venue_community_votes(entry_id);
create index if not exists idx_community_votes_user_id on venue_community_votes(user_id);
