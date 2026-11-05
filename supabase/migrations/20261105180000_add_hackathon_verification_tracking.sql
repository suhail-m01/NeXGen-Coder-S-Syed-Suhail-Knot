-- Additive migration: Track periodic verification timestamp for official URLs
alter table public.hackathons add column if not exists last_verified_at timestamptz;
