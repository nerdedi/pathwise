-- Live venue state + saved venue subscriptions for notifications
create table if not exists venue_live_state (
  venue_url text primary key,
  venue_name text,
  busyness_level text not null default 'moderate' check (busyness_level in ('quiet', 'moderate', 'busy', 'very_busy')),
  open_status text not null default 'closed' check (open_status in ('open', 'closes_soon', 'closed', 'special_closure')),
  next_change_at timestamptz,
  weather_condition text,
  temperature_c integer,
  weather_recommendation text,
  source text not null default 'derived',
  confidence integer not null default 60 check (confidence >= 0 and confidence <= 100),
  special_closure_note text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_venue_live_state_updated_at on venue_live_state(updated_at desc);

alter table venue_live_state enable row level security;

drop policy if exists "Public can read live venue state" on venue_live_state;
create policy "Public can read live venue state"
  on venue_live_state for select
  using (true);

create table if not exists user_saved_venues (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  venue_url text not null,
  venue_name text not null,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, venue_url)
);

create index if not exists idx_user_saved_venues_user_id on user_saved_venues(user_id);
create index if not exists idx_user_saved_venues_venue_url on user_saved_venues(venue_url);

alter table user_saved_venues enable row level security;

drop policy if exists "Users can manage saved venues" on user_saved_venues;
create policy "Users can manage saved venues"
  on user_saved_venues for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
