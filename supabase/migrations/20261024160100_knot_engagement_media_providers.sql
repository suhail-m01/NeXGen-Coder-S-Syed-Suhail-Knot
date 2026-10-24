create table public.knot_saves (
  user_id uuid not null references public.knot_profiles(id) on delete cascade,
  event_id text not null references public.knot_events(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,event_id)
);
create table public.knot_follows (
  user_id uuid not null references public.knot_profiles(id) on delete cascade,
  community_id text not null,
  created_at timestamptz not null default now(), primary key(user_id,community_id)
);
create table public.knot_topic_follows (
  user_id uuid not null references public.knot_profiles(id) on delete cascade,
  topic text not null,
  created_at timestamptz not null default now(), primary key(user_id,topic)
);
create table public.knot_going (
  user_id uuid not null references public.knot_profiles(id) on delete cascade,
  event_id text not null references public.knot_events(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,event_id)
);
create table public.knot_saved_searches (
  id text primary key default 'search-' || gen_random_uuid()::text,
  user_id uuid not null references public.knot_profiles(id) on delete cascade,
  name text not null check(char_length(name) between 1 and 120),
  filters jsonb not null,
  last_checked_at timestamptz,
  last_seen_event_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.knot_saves enable row level security;
alter table public.knot_follows enable row level security;
alter table public.knot_topic_follows enable row level security;
alter table public.knot_going enable row level security;
alter table public.knot_saved_searches enable row level security;
create policy knot_saves_own on public.knot_saves for all to authenticated using(user_id = public.knot_uid()) with check(user_id = public.knot_uid());
create policy knot_follows_own on public.knot_follows for all to authenticated using(user_id = public.knot_uid()) with check(user_id = public.knot_uid());
create policy knot_topics_own on public.knot_topic_follows for all to authenticated using(user_id = public.knot_uid()) with check(user_id = public.knot_uid());
create policy knot_going_own on public.knot_going for all to authenticated using(user_id = public.knot_uid()) with check(user_id = public.knot_uid());
create policy knot_searches_own on public.knot_saved_searches for all to authenticated using(user_id = public.knot_uid()) with check(user_id = public.knot_uid());

create table public.knot_sources (
  id text primary key,
  name text not null,
  base_url text,
  permission text not null check(permission in ('owned','sample_only','review_required','approved','blocked')),
  approved_methods text[] not null default '{}',
  evidence_url text,
  active boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check(not active or (permission in ('owned','approved') and evidence_url is not null and approved_methods <> '{}'))
);
alter table public.knot_sources enable row level security;
create policy knot_sources_public_read on public.knot_sources for select to anon,authenticated using(active or public.knot_is_admin());
create policy knot_sources_admin on public.knot_sources for all to authenticated using(public.knot_is_admin()) with check(public.knot_is_admin());

create table public.knot_ingestion_runs (
  id text primary key default 'ingestion-' || gen_random_uuid()::text,
  source_id text not null references public.knot_sources(id),
  status text not null check(status in ('pending','running','review_required','failed','complete')),
  fetched_bytes integer,
  item_count integer not null default 0,
  error_code text,
  requested_by uuid references public.knot_profiles(id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table public.knot_ingestion_runs enable row level security;
create policy knot_ingestion_admin_read on public.knot_ingestion_runs for select to authenticated using(public.knot_is_admin());

create table public.knot_referral_campaigns (
  id text primary key,
  event_id text not null references public.knot_events(id) on delete cascade,
  label text not null check(char_length(label) between 1 and 120),
  token text not null unique default encode(gen_random_bytes(18),'hex'),
  active boolean not null default true,
  created_by uuid not null references public.knot_profiles(id),
  created_at timestamptz not null default now()
);
create table public.knot_referral_visits (
  id bigserial primary key,
  campaign_id text not null references public.knot_referral_campaigns(id) on delete cascade,
  session_hash text not null,
  opened_at timestamptz not null default now(),
  unique(campaign_id,session_hash)
);
alter table public.knot_referral_campaigns enable row level security;
alter table public.knot_referral_visits enable row level security;
create policy knot_referral_campaign_manage on public.knot_referral_campaigns for all to authenticated
  using(public.knot_can_manage_event(event_id)) with check(public.knot_can_manage_event(event_id) and created_by = public.knot_uid());
create policy knot_referral_visits_manage_read on public.knot_referral_visits for select to authenticated using(exists(
  select 1 from public.knot_referral_campaigns c where c.id = campaign_id and public.knot_can_manage_event(c.event_id)
));
alter table public.knot_registrations add constraint knot_registration_referral_fk
  foreign key(referral_campaign_id) references public.knot_referral_campaigns(id) on delete set null;

create or replace function public.knot_record_referral_visit(p_token text, p_session_key text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
declare v_campaign text; v_inserted boolean;
begin
  if char_length(coalesce(p_session_key,'')) < 16 or char_length(p_session_key) > 128 then raise exception 'KNOT_INVALID_SESSION_KEY' using errcode = 'P0001'; end if;
  select id into v_campaign from public.knot_referral_campaigns where token = p_token and active;
  if v_campaign is null then return false; end if;
  insert into public.knot_referral_visits(campaign_id,session_hash)
    values(v_campaign, encode(digest(p_session_key, 'sha256'),'hex')) on conflict do nothing returning true into v_inserted;
  return coalesce(v_inserted,false);
end;
$$;
revoke all on function public.knot_record_referral_visit(text,text) from public;
grant execute on function public.knot_record_referral_visit(text,text) to anon,authenticated;

create table public.knot_media_assets (
  id text primary key,
  event_id text not null references public.knot_events(id) on delete cascade,
  uploader_id uuid not null references public.knot_profiles(id),
  kind text not null check(kind in ('event_image','recap_photo','sponsor_logo')),
  title text not null,
  alt_text text not null,
  mime_type text not null check(mime_type = 'image/webp'),
  size_bytes integer not null check(size_bytes between 1 and 2097152),
  width integer not null check(width between 1 and 4096),
  height integer not null check(height between 1 and 4096),
  storage_path text not null unique,
  consent_basis text not null,
  status text not null default 'draft' check(status in ('draft','published','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.knot_media_assets enable row level security;
create policy knot_media_read on public.knot_media_assets for select to anon,authenticated using(
  status = 'published' or uploader_id = public.knot_uid() or public.knot_can_manage_event(event_id)
);
create policy knot_media_insert on public.knot_media_assets for insert to authenticated
  with check(uploader_id = public.knot_uid() and public.knot_can_manage_event(event_id) and status = 'draft');
create policy knot_media_update on public.knot_media_assets for update to authenticated
  using(public.knot_can_manage_event(event_id)) with check(public.knot_can_manage_event(event_id));
create policy knot_media_delete on public.knot_media_assets for delete to authenticated using(public.knot_can_manage_event(event_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('knot-media','knot-media',false,2097152,array['image/webp']) on conflict(id) do nothing;
create policy knot_media_object_read on storage.objects for select to anon,authenticated using(
  bucket_id = 'knot-media' and exists(select 1 from public.knot_media_assets m where m.storage_path = name and (m.status = 'published' or m.uploader_id = public.knot_uid() or public.knot_can_manage_event(m.event_id)))
);
create policy knot_media_object_insert on storage.objects for insert to authenticated with check(
  bucket_id = 'knot-media' and (storage.foldername(name))[1] = public.knot_uid()::text
  and exists(select 1 from public.knot_events e where e.id = (storage.foldername(name))[2] and public.knot_can_manage_event(e.id))
);
create policy knot_media_object_update on storage.objects for update to authenticated using(
  bucket_id = 'knot-media' and (storage.foldername(name))[1] = public.knot_uid()::text
) with check(
  bucket_id = 'knot-media' and (storage.foldername(name))[1] = public.knot_uid()::text
  and exists(select 1 from public.knot_events e where e.id = (storage.foldername(name))[2] and public.knot_can_manage_event(e.id))
);
create policy knot_media_object_delete on storage.objects for delete to authenticated using(
  bucket_id = 'knot-media' and ((storage.foldername(name))[1] = public.knot_uid()::text or exists(
    select 1 from public.knot_media_assets m where m.storage_path = name and public.knot_can_manage_event(m.event_id)
  ))
);

-- Provider and verification records are server-written. No client success claims.
create table public.knot_outbox (
  id text primary key default 'outbox-' || gen_random_uuid()::text,
  provider text not null check(provider in ('resend','razorpay','whatsapp','livekit','ingestion','series')),
  operation text not null,
  idempotency_key text not null unique,
  payload jsonb not null default '{}',
  status text not null default 'pending' check(status in ('pending','processing','confirmed','failed','cancelled')),
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  provider_reference text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.knot_webhook_events (
  provider text not null,
  external_event_id text not null,
  payload_hash text not null,
  received_at timestamptz not null default now(),
  primary key(provider,external_event_id)
);
create table public.knot_payment_orders (
  id text primary key,
  user_id uuid not null references public.knot_profiles(id),
  event_id text not null references public.knot_events(id),
  amount_inr numeric not null check(amount_inr > 0),
  currency text not null default 'INR' check(currency = 'INR'),
  status text not null check(status in ('created','pending','paid','failed','refunded','cancelled')),
  provider_order_id text unique,
  provider_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.knot_video_rooms (
  id text primary key,
  event_id text not null references public.knot_events(id) on delete cascade,
  provider text not null default 'livekit' check(provider = 'livekit'),
  provider_room_id text,
  status text not null check(status in ('requested','active','ended','failed')),
  created_by uuid not null references public.knot_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.knot_consent_verifications (
  id text primary key default 'consent-' || gen_random_uuid()::text,
  user_id uuid not null references public.knot_profiles(id) on delete cascade,
  subject_type text not null check(subject_type in ('guardian','media')),
  provider text,
  provider_reference text,
  status text not null check(status in ('pending','verified','rejected','expired','withdrawn')),
  evidence_hash text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.knot_outbox enable row level security;
alter table public.knot_webhook_events enable row level security;
alter table public.knot_payment_orders enable row level security;
alter table public.knot_video_rooms enable row level security;
alter table public.knot_consent_verifications enable row level security;
create policy knot_payment_self_read on public.knot_payment_orders for select to authenticated using(user_id = public.knot_uid() or public.knot_can_manage_event(event_id));
create policy knot_video_participant_read on public.knot_video_rooms for select to authenticated using(public.knot_can_manage_event(event_id) or public.knot_is_confirmed_participant(event_id));
create policy knot_consent_self_read on public.knot_consent_verifications for select to authenticated using(user_id = public.knot_uid() or public.knot_is_admin());

-- Do not expose operational/provider tables through accidental broad grants.
revoke all on public.knot_outbox, public.knot_webhook_events from anon, authenticated;
revoke all on public.knot_payment_orders, public.knot_video_rooms, public.knot_consent_verifications from anon;
