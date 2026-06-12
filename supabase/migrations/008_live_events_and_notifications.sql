-- Live venue state change events + per-user notifications
create table if not exists venue_live_events (
  id uuid primary key default uuid_generate_v4(),
  venue_url text not null,
  venue_name text,
  event_type text not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_venue_live_events_venue_url on venue_live_events(venue_url);
create index if not exists idx_venue_live_events_created_at on venue_live_events(created_at desc);

alter table venue_live_events enable row level security;

drop policy if exists "Public can read live venue events" on venue_live_events;
create policy "Public can read live venue events"
  on venue_live_events for select
  using (true);

create table if not exists user_notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_notifications_user_id_created_at
  on user_notifications(user_id, created_at desc);

alter table user_notifications enable row level security;

drop policy if exists "Users can read own notifications" on user_notifications;
create policy "Users can read own notifications"
  on user_notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own notifications" on user_notifications;
create policy "Users can update own notifications"
  on user_notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
