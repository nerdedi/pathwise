-- Ensure one sensory profile per user for safe upsert(onConflict: user_id)
create unique index if not exists idx_sensory_profiles_user_unique
  on sensory_profiles(user_id)
  where user_id is not null;
