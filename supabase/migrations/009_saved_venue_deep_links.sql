-- Link saved venue subscriptions to a preferred guide for deep-link notifications
alter table if exists user_saved_venues
  add column if not exists preferred_guide_id uuid references itineraries(id) on delete set null;

create index if not exists idx_user_saved_venues_preferred_guide_id
  on user_saved_venues(preferred_guide_id);
