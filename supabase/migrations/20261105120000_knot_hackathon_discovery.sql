-- Additive Hackathon Discovery Agent catalog. Existing Event and Knot tables are unchanged.
create extension if not exists pgcrypto;

create table public.hackathons (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  title text not null check (char_length(title) between 3 and 240),
  description text,
  organizer text,
  mode text not null check (mode in ('online','offline','hybrid')),
  city text,
  area text,
  state text,
  country text,
  venue text,
  latitude double precision check (latitude is null or latitude between -90 and 90),
  longitude double precision check (longitude is null or longitude between -180 and 180),
  location_precision text not null default 'none' check (location_precision in ('exact','approximate','city','none')),
  start_date timestamptz not null,
  end_date timestamptz,
  registration_deadline timestamptz,
  timezone text,
  start_time_known boolean not null default true,
  end_time_known boolean not null default true,
  is_free boolean,
  price_amount numeric check (price_amount is null or price_amount >= 0),
  currency text check (currency is null or char_length(currency) = 3),
  prize_pool text,
  tags text[] not null default '{}',
  eligibility text,
  team_size text,
  image_url text,
  official_url text not null,
  official_url_verified boolean not null default false,
  source_url text not null,
  source_platform text not null,
  sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array'),
  extraction_method text not null check (extraction_method in ('json-ld','opengraph','css','llm','api')),
  status text not null check (status in ('upcoming','ongoing','ended')),
  first_discovered_at timestamptz not null default now(),
  last_checked_at timestamptz not null default now(),
  last_meaningful_change_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date),
  check (registration_deadline is null or registration_deadline <= end_date or end_date is null),
  check (is_free is distinct from true or price_amount is null or price_amount = 0),
  check (official_url ~ '^https?://' and source_url ~ '^https?://')
);

create index hackathons_city_idx on public.hackathons(city);
create index hackathons_start_date_idx on public.hackathons(start_date);
create index hackathons_is_free_idx on public.hackathons(is_free);
create index hackathons_status_idx on public.hackathons(status);
create index hackathons_discovery_idx on public.hackathons(status, start_date, city, is_free);
create index hackathons_area_idx on public.hackathons(area) where area is not null;
create index hackathons_tags_idx on public.hackathons using gin(tags);
alter table public.hackathons enable row level security;
create policy hackathons_public_read on public.hackathons for select to anon, authenticated using (true);

create table public.hackathon_interests (
  id uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references public.hackathons(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  interest_context text not null default 'web' check (interest_context in ('web','home','my_interests')),
  check (interest_context <> 'my_interests' or user_id is not null)
);
create unique index hackathon_interests_user_unique on public.hackathon_interests(hackathon_id, user_id) where user_id is not null;
create index hackathon_interests_user_recent on public.hackathon_interests(user_id, clicked_at desc) where user_id is not null;
create index hackathon_interests_aggregate on public.hackathon_interests(hackathon_id, clicked_at);
alter table public.hackathon_interests enable row level security;
create policy hackathon_interests_own_read on public.hackathon_interests for select to authenticated using (user_id = public.knot_uid());

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'run' check (kind in ('run','city_request')),
  status text not null check (status in ('queued','running','consumed','completed','completed_with_errors','failed')),
  trigger_source text not null default 'manual' check (trigger_source in ('manual','cron','local','user_search')),
  requested_city text,
  requested_by_run_id uuid references public.agent_runs(id) on delete set null,
  sources jsonb not null default '[]'::jsonb,
  items_found integer not null default 0 check (items_found >= 0),
  items_saved integer not null default 0 check (items_saved >= 0),
  errors jsonb not null default '[]'::jsonb,
  stats jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  check ((kind = 'city_request' and requested_city is not null) or kind = 'run')
);
create index agent_runs_recent on public.agent_runs(kind, status, created_at desc);
create index agent_runs_city_queue on public.agent_runs(status, created_at) where kind = 'city_request' and status = 'queued';
alter table public.agent_runs enable row level security;
create policy agent_runs_admin_read on public.agent_runs for select to authenticated using (public.knot_is_admin());

revoke all on public.hackathons from anon, authenticated;
revoke all on public.hackathon_interests from anon, authenticated;
revoke all on public.agent_runs from anon, authenticated;
grant select on public.hackathons to anon, authenticated;
grant select on public.hackathon_interests to authenticated;
grant select on public.agent_runs to authenticated;
grant all on public.hackathons, public.hackathon_interests, public.agent_runs to service_role;
