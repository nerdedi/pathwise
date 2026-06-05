-- Pathwise Database Schema
-- Run in Supabase SQL editor

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- Sensory profiles — users can save and update their profile
-- ============================================================
create table if not exists sensory_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  sound_sensitivity text not null default 'medium' check (sound_sensitivity in ('low','medium','high')),
  light_sensitivity text not null default 'medium' check (light_sensitivity in ('low','medium','high')),
  smell_sensitivity text not null default 'medium' check (smell_sensitivity in ('low','medium','high')),
  crowd_sensitivity text not null default 'medium' check (crowd_sensitivity in ('low','medium','high')),
  touch_sensitivity text not null default 'low' check (touch_sensitivity in ('low','medium','high')),
  change_sensitivity text not null default 'medium' check (change_sensitivity in ('low','medium','high')),
  visiting_with text not null default 'alone',
  communication_style text not null default 'mixed',
  detail_level text not null default 'detailed',
  needs_quiet_space boolean default false,
  needs_accessible_toilet boolean default false,
  needs_mobility_access boolean default false,
  needs_dietary_info boolean default false,
  uses_mobility_aid boolean default false,
  has_medical_needs boolean default false,
  coping_strategies text[] default '{}',
  exit_strategy text default '',
  prefers_dyslexic_font boolean default false,
  prefers_high_contrast boolean default false,
  prefers_reduced_motion boolean default false,
  wants_social_story boolean default true,
  wants_affirmations boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- Saved itineraries
-- ============================================================
create table if not exists itineraries (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  venue_name text not null,
  venue_url text not null,
  venue_address text,
  venue_suburb text,
  visit_date date,
  from_suburb text,
  itinerary_json jsonb not null,  -- full Itinerary object
  risk_score smallint,
  overall_sensory_rating text,
  is_public boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- Community venue data (crowdsourced sensory info)
-- ============================================================
create table if not exists venue_community_data (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  venue_url text not null,
  venue_name text not null,
  venue_suburb text,
  -- Sensory ratings (community-contributed)
  sound_rating smallint check (sound_rating between 1 and 10),
  light_rating smallint check (light_rating between 1 and 10),
  smell_rating smallint check (smell_rating between 1 and 10),
  crowd_rating smallint check (crowd_rating between 1 and 10),
  overall_rating smallint check (overall_rating between 1 and 10),
  -- Free text notes
  notes text,
  tips text,
  visit_date date,
  verified boolean default false,
  helpful_count integer default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Sensory profiles: users can only read/write their own
alter table sensory_profiles enable row level security;
create policy "Users can manage their own profile"
  on sensory_profiles for all
  using (auth.uid() = user_id);

-- Itineraries: users can manage their own; public ones are readable
alter table itineraries enable row level security;
create policy "Users can manage their own itineraries"
  on itineraries for all
  using (auth.uid() = user_id);
create policy "Public itineraries are readable"
  on itineraries for select
  using (is_public = true);

-- Community venue data: anyone can read; auth users can insert
alter table venue_community_data enable row level security;
create policy "Anyone can read community data"
  on venue_community_data for select
  using (true);
create policy "Auth users can contribute"
  on venue_community_data for insert
  with check (auth.uid() is not null);
create policy "Users can update their own contributions"
  on venue_community_data for update
  using (auth.uid() = user_id);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_itineraries_user on itineraries(user_id);
create index if not exists idx_itineraries_venue_url on itineraries(venue_url);
create index if not exists idx_community_venue_url on venue_community_data(venue_url);
