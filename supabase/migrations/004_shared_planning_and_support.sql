-- Extend profiles with travel, support, and emergency-preference fields
alter table sensory_profiles
  add column if not exists wants_text_to_speech boolean default true,
  add column if not exists route_preference text default 'balanced',
  add column if not exists needs_level_boarding_info boolean default false,
  add column if not exists needs_live_lift_info boolean default false,
  add column if not exists support_card_name text default '',
  add column if not exists support_card_message text default '',
  add column if not exists emergency_contacts jsonb default '[]'::jsonb;

alter table itineraries
  add column if not exists shared_with_emails text[] default '{}';

drop policy if exists "Collaborators can read shared itineraries" on itineraries;
create policy "Collaborators can read shared itineraries"
  on itineraries for select
  using (
    lower(coalesce(auth.jwt() ->> 'email', '')) = any(shared_with_emails)
  );
