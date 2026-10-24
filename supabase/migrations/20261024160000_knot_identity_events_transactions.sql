-- Knot production foundation. Legacy public.events/event_sources/event_updates are preserved.
create extension if not exists pgcrypto;

create or replace function public.knot_uid()
returns uuid language sql stable as $$ select auth.uid() $$;

create table public.knot_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null check (char_length(name) between 2 and 120),
  role text not null default 'participant' check (role in ('participant','organizer','admin')),
  workspace_admin boolean not null default false,
  age_band text not null check (age_band in ('under_13','13_15','16_17','18_plus')),
  age_band_confirmed_on timestamptz not null,
  account_status text not null default 'active' check (account_status in ('active','restricted','closed')),
  guardian_consent text not null default 'not_required' check (guardian_consent in ('not_required','pending','complete','withdrawn')),
  guardian_email text,
  area_locality_id text,
  radius_km integer not null default 10 check (radius_km between 1 and 200),
  interests text[] not null default '{}',
  skills text[] not null default '{}',
  learning_goals text[] not null default '{}',
  announcement_opt_out boolean not null default false,
  personalization_consent boolean not null default false,
  return_analytics_consent boolean not null default false,
  learned_interests text[] not null default '{}',
  experience_level text not null default 'not_stated',
  education text,
  availability text,
  max_price_inr numeric check (max_price_inr is null or max_price_inr >= 0),
  team_status text not null default 'not_stated',
  quiet_hours_start text,
  quiet_hours_end text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.knot_profiles enable row level security;

create or replace function public.knot_is_admin()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.knot_profiles p where p.id = auth.uid() and p.account_status = 'active' and (p.role = 'admin' or p.workspace_admin));
$$;
create or replace function public.knot_is_active_adult()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.knot_profiles p where p.id = auth.uid() and p.account_status = 'active' and p.age_band = '18_plus');
$$;
create or replace function public.knot_is_organizer()
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.knot_profiles p where p.id = auth.uid() and p.account_status = 'active' and p.age_band = '18_plus' and p.role in ('organizer','admin'));
$$;

create or replace function public.knot_handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
declare
  requested_age text := new.raw_user_meta_data ->> 'age_band';
  requested_role text := new.raw_user_meta_data ->> 'role';
  requested_name text := trim(coalesce(new.raw_user_meta_data ->> 'name', ''));
begin
  if requested_age is distinct from '18_plus' then
    raise exception 'KNOT_PRODUCTION_ADULTS_ONLY' using errcode = 'P0001';
  end if;
  if char_length(requested_name) < 2 or char_length(requested_name) > 120 then
    raise exception 'KNOT_INVALID_PROFILE_NAME' using errcode = 'P0001';
  end if;
  insert into public.knot_profiles (
    id, email, name, role, age_band, age_band_confirmed_on, area_locality_id, interests
  ) values (
    new.id, lower(coalesce(new.email, '')), requested_name,
    case when requested_role = 'organizer' then 'organizer' else 'participant' end,
    '18_plus', now(), nullif(new.raw_user_meta_data ->> 'area_locality_id', ''),
    case when jsonb_typeof(new.raw_user_meta_data -> 'interests') = 'array'
      then coalesce((select array_agg(value) from jsonb_array_elements_text(new.raw_user_meta_data -> 'interests') value), '{}')
      else '{}' end
  );
  return new;
end;
$$;
create trigger knot_on_auth_user_created
after insert on auth.users for each row execute function public.knot_handle_new_user();

create or replace function public.knot_protect_profile()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not public.knot_is_admin() then
    if new.role is distinct from old.role or new.workspace_admin is distinct from old.workspace_admin or new.account_status is distinct from old.account_status then
      raise exception 'KNOT_PRIVILEGED_PROFILE_FIELD' using errcode = 'P0001';
    end if;
    if new.age_band is distinct from old.age_band or new.guardian_consent is distinct from old.guardian_consent then
      raise exception 'KNOT_AGE_CHANGE_REQUIRES_REVIEW' using errcode = 'P0001';
    end if;
    if new.id is distinct from old.id or new.email is distinct from old.email then
      raise exception 'KNOT_IDENTITY_FIELD_IMMUTABLE' using errcode = 'P0001';
    end if;
  end if;
  new.updated_at := now();
  if new.age_band <> '18_plus' then
    new.personalization_consent := false;
    new.return_analytics_consent := false;
    new.learned_interests := '{}';
  end if;
  return new;
end;
$$;
create trigger knot_protect_profile_update before update on public.knot_profiles
for each row execute function public.knot_protect_profile();

create policy knot_profiles_read on public.knot_profiles for select to authenticated
  using (id = public.knot_uid() or public.knot_is_admin());
create policy knot_profiles_update on public.knot_profiles for update to authenticated
  using (id = public.knot_uid()) with check (id = public.knot_uid());

create table public.knot_events (
  id text primary key,
  slug text not null unique,
  organizer_id uuid not null references public.knot_profiles(id),
  title text not null check (char_length(title) between 3 and 240),
  status text not null check (status in ('draft','pending_review','published','changed','stale','cancelled','ended','archived')),
  visibility text not null default 'public' check (visibility in ('public','unlisted','private')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  registration_kind text not null check (registration_kind in ('external','native')),
  capacity integer check (capacity is null or capacity > 0),
  approval text not null default 'none' check (approval in ('none','manual')),
  waitlist_enabled boolean not null default false,
  registration_opens_at timestamptz,
  registration_deadline timestamptz,
  age_mode text not null default 'not_stated',
  min_age integer check (min_age is null or min_age >= 0),
  max_age integer check (max_age is null or max_age >= 0),
  public_data jsonb not null,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at),
  check (jsonb_typeof(public_data) = 'object'),
  check (not public_data ? 'onlineJoinUrl'),
  check (not public_data ? 'collaborators'),
  check (not public_data ? 'revisions')
);
create index knot_events_discovery on public.knot_events(status, visibility, starts_at);
create index knot_events_organizer on public.knot_events(organizer_id, updated_at desc);
alter table public.knot_events enable row level security;

create table public.knot_event_collaborators (
  event_id text not null references public.knot_events(id) on delete cascade,
  user_id uuid not null references public.knot_profiles(id) on delete cascade,
  role text not null check (role in ('co_organizer','volunteer','judge')),
  added_at timestamptz not null default now(),
  primary key(event_id, user_id, role)
);
alter table public.knot_event_collaborators enable row level security;

create or replace function public.knot_can_manage_event(target_event text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.knot_is_admin() or exists(
    select 1 from public.knot_events e where e.id = target_event and e.organizer_id = auth.uid()
  ) or exists(
    select 1 from public.knot_event_collaborators c where c.event_id = target_event and c.user_id = auth.uid() and c.role = 'co_organizer'
  );
$$;
create or replace function public.knot_can_check_in_event(target_event text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.knot_can_manage_event(target_event) or exists(
    select 1 from public.knot_event_collaborators c where c.event_id = target_event and c.user_id = auth.uid() and c.role = 'volunteer'
  );
$$;

create policy knot_events_public_read on public.knot_events for select to anon, authenticated using (
  (visibility in ('public','unlisted') and status in ('published','changed','stale','cancelled','ended'))
  or organizer_id = public.knot_uid() or public.knot_can_manage_event(id)
);
create policy knot_events_insert on public.knot_events for insert to authenticated
  with check (organizer_id = public.knot_uid() and public.knot_is_organizer());
create policy knot_events_update on public.knot_events for update to authenticated
  using (public.knot_can_manage_event(id)) with check (public.knot_can_manage_event(id));
create policy knot_collaborators_read on public.knot_event_collaborators for select to authenticated
  using (user_id = public.knot_uid() or public.knot_can_manage_event(event_id));
create policy knot_collaborators_write on public.knot_event_collaborators for all to authenticated
  using (public.knot_can_manage_event(event_id)) with check (public.knot_can_manage_event(event_id));

create table public.knot_event_private (
  event_id text primary key references public.knot_events(id) on delete cascade,
  online_join_url text,
  participant_data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.knot_event_private enable row level security;

create table public.knot_registrations (
  id text primary key default 'registration-' || gen_random_uuid()::text,
  event_id text not null references public.knot_events(id) on delete cascade,
  user_id uuid not null references public.knot_profiles(id) on delete cascade,
  kind text not null check (kind in ('native','external')),
  status text not null check (status in ('opened_externally','self_confirmed_registered','registered','pending','approved','waitlisted','rejected','cancelled','checked_in','attended')),
  self_declared_age_rule_met boolean not null default false,
  answers jsonb not null default '{}',
  referral_campaign_id text,
  check_in_token text unique default encode(gen_random_bytes(24), 'hex'),
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index knot_one_active_registration on public.knot_registrations(event_id, user_id)
  where status not in ('cancelled','rejected');
create index knot_registrations_event_status on public.knot_registrations(event_id, status, created_at);
create index knot_registrations_user on public.knot_registrations(user_id, updated_at desc);
alter table public.knot_registrations enable row level security;

create or replace function public.knot_is_confirmed_participant(target_event text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists(select 1 from public.knot_registrations r where r.event_id = target_event and r.user_id = auth.uid()
    and r.status in ('registered','approved','checked_in','attended'));
$$;
create policy knot_event_private_read on public.knot_event_private for select to authenticated
  using (public.knot_can_manage_event(event_id) or public.knot_is_confirmed_participant(event_id));
create policy knot_event_private_write on public.knot_event_private for all to authenticated
  using (public.knot_can_manage_event(event_id)) with check (public.knot_can_manage_event(event_id));
create policy knot_registrations_read on public.knot_registrations for select to authenticated
  using (user_id = public.knot_uid() or public.knot_can_manage_event(event_id));

create table public.knot_audit_records (
  id text primary key default 'audit-' || gen_random_uuid()::text,
  actor_id uuid references public.knot_profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.knot_audit_records enable row level security;
create policy knot_audit_read on public.knot_audit_records for select to authenticated using (public.knot_is_admin());

create or replace function public.knot_audit(p_action text, p_target_type text, p_target_id text, p_details jsonb default '{}')
returns void language sql security definer set search_path = public, pg_temp as $$
  insert into public.knot_audit_records(actor_id, action, target_type, target_id, details)
  values(auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_details, '{}'));
$$;

create or replace function public.knot_register_native(
  p_event_id text, p_answers jsonb default '{}', p_self_declared_age_rule_met boolean default false,
  p_referral_campaign_id text default null
) returns public.knot_registrations language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_event public.knot_events;
  v_profile public.knot_profiles;
  v_existing uuid;
  v_confirmed integer;
  v_status text;
  v_result public.knot_registrations;
  v_question jsonb;
  v_answer text;
begin
  if auth.uid() is null then raise exception 'KNOT_AUTH_REQUIRED' using errcode = '42501'; end if;
  select * into v_profile from public.knot_profiles where id = auth.uid();
  if v_profile.id is null or v_profile.account_status <> 'active' or v_profile.age_band <> '18_plus' then
    raise exception 'KNOT_ACTIVE_ADULT_REQUIRED' using errcode = '42501';
  end if;
  select * into v_event from public.knot_events where id = p_event_id for update;
  if v_event.id is null or v_event.registration_kind <> 'native' or v_event.status not in ('published','changed') then
    raise exception 'KNOT_REGISTRATION_CLOSED' using errcode = 'P0001';
  end if;
  if v_event.registration_opens_at is not null and v_event.registration_opens_at > now() then
    raise exception 'KNOT_REGISTRATION_NOT_OPEN' using errcode = 'P0001';
  end if;
  if v_event.registration_deadline is not null and v_event.registration_deadline <= now() then
    raise exception 'KNOT_REGISTRATION_CLOSED' using errcode = 'P0001';
  end if;
  if v_event.age_mode = 'under_18_only' or (v_event.max_age is not null and v_event.max_age < 18) then
    raise exception 'KNOT_AGE_NOT_ELIGIBLE' using errcode = 'P0001';
  end if;
  if v_event.min_age is not null and v_event.min_age > 18 and not p_self_declared_age_rule_met then
    raise exception 'KNOT_AGE_RULE_CONFIRMATION_REQUIRED' using errcode = 'P0001';
  end if;
  select r.user_id into v_existing from public.knot_registrations r
    where r.event_id = p_event_id and r.user_id = auth.uid() and r.status not in ('cancelled','rejected') limit 1;
  if v_existing is not null then raise exception 'KNOT_DUPLICATE_REGISTRATION' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_answers) is distinct from 'object' then raise exception 'KNOT_INVALID_ANSWERS' using errcode = 'P0001'; end if;
  for v_question in select value from jsonb_array_elements(coalesce(v_event.public_data #> '{registration,questions}', '[]'::jsonb)) loop
    if coalesce((v_question ->> 'required')::boolean, false) then
      v_answer := trim(coalesce(p_answers ->> (v_question ->> 'id'), ''));
      if v_answer = '' then raise exception 'KNOT_REQUIRED_ANSWER_MISSING' using errcode = 'P0001'; end if;
      if v_question ->> 'kind' = 'single_choice' and not exists(
        select 1 from jsonb_array_elements_text(coalesce(v_question -> 'options', '[]'::jsonb)) option_value where option_value = v_answer
      ) then raise exception 'KNOT_INVALID_ANSWER_CHOICE' using errcode = 'P0001'; end if;
    end if;
  end loop;
  select count(*) into v_confirmed from public.knot_registrations r
    where r.event_id = p_event_id and r.status in ('registered','approved','checked_in','attended');
  if v_event.capacity is not null and v_confirmed >= v_event.capacity then
    if not v_event.waitlist_enabled then raise exception 'KNOT_EVENT_FULL' using errcode = 'P0001'; end if;
    v_status := 'waitlisted';
  else
    v_status := case when v_event.approval = 'manual' then 'pending' else 'registered' end;
  end if;
  if p_referral_campaign_id is not null and not exists(
    select 1 from public.knot_referral_campaigns c where c.id = p_referral_campaign_id and c.event_id = p_event_id and c.active
  ) then raise exception 'KNOT_INVALID_REFERRAL' using errcode = 'P0001'; end if;
  insert into public.knot_registrations(event_id, user_id, kind, status, self_declared_age_rule_met, answers, referral_campaign_id)
    values(p_event_id, auth.uid(), 'native', v_status, p_self_declared_age_rule_met, p_answers, nullif(p_referral_campaign_id, ''))
    returning * into v_result;
  perform public.knot_audit('registration_created', 'registration', v_result.id, jsonb_build_object('event_id', p_event_id, 'status', v_status));
  return v_result;
end;
$$;

create or replace function public.knot_cancel_registration(p_registration_id text)
returns public.knot_registrations language plpgsql security definer set search_path = public, pg_temp as $$
declare v_result public.knot_registrations; v_event_id text; v_candidate text; v_approval text; v_previous_status text; v_capacity integer; v_confirmed integer;
begin
  select r.event_id, r.status into v_event_id, v_previous_status from public.knot_registrations r where r.id = p_registration_id and r.user_id = auth.uid() for update;
  if v_event_id is null then raise exception 'KNOT_REGISTRATION_NOT_FOUND' using errcode = 'P0002'; end if;
  select approval, capacity into v_approval, v_capacity from public.knot_events where id = v_event_id for update;
  update public.knot_registrations set status = 'cancelled', updated_at = now()
    where id = p_registration_id and user_id = auth.uid() and status not in ('cancelled','rejected') returning * into v_result;
  if v_result.id is null then raise exception 'KNOT_REGISTRATION_NOT_ACTIVE' using errcode = 'P0001'; end if;
  if v_previous_status in ('registered','approved','checked_in','attended') then
    select count(*) into v_confirmed from public.knot_registrations r where r.event_id = v_event_id and r.status in ('registered','approved','checked_in','attended');
    if v_capacity is null or v_confirmed < v_capacity then
      select r.id into v_candidate from public.knot_registrations r where r.event_id = v_event_id and r.status = 'waitlisted' order by r.created_at, r.id limit 1 for update skip locked;
      if v_candidate is not null then
        update public.knot_registrations set status = case when v_approval = 'manual' then 'pending' else 'registered' end, updated_at = now() where id = v_candidate;
      end if;
    end if;
  end if;
  perform public.knot_audit('registration_cancelled', 'registration', p_registration_id, jsonb_build_object('event_id', v_event_id));
  return v_result;
end;
$$;

create or replace function public.knot_review_registration(p_registration_id text, p_decision text)
returns public.knot_registrations language plpgsql security definer set search_path = public, pg_temp as $$
declare v_event public.knot_events; v_current public.knot_registrations; v_confirmed integer; v_status text; v_result public.knot_registrations;
begin
  if p_decision not in ('approve','reject') then raise exception 'KNOT_INVALID_DECISION' using errcode = 'P0001'; end if;
  select * into v_current from public.knot_registrations where id = p_registration_id;
  if v_current.id is null then raise exception 'KNOT_REGISTRATION_NOT_FOUND' using errcode = 'P0002'; end if;
  select * into v_event from public.knot_events where id = v_current.event_id for update;
  if not public.knot_can_manage_event(v_event.id) then raise exception 'KNOT_ORGANIZER_REQUIRED' using errcode = '42501'; end if;
  if v_current.status not in ('pending','waitlisted') then raise exception 'KNOT_REGISTRATION_NOT_REVIEWABLE' using errcode = 'P0001'; end if;
  if p_decision = 'reject' then v_status := 'rejected';
  else
    select count(*) into v_confirmed from public.knot_registrations r where r.event_id = v_event.id and r.status in ('registered','approved','checked_in','attended');
    v_status := case when v_event.capacity is not null and v_confirmed >= v_event.capacity and v_event.waitlist_enabled then 'waitlisted'
      when v_event.capacity is not null and v_confirmed >= v_event.capacity then null else 'approved' end;
    if v_status is null then raise exception 'KNOT_EVENT_FULL' using errcode = 'P0001'; end if;
  end if;
  update public.knot_registrations set status = v_status, updated_at = now() where id = p_registration_id returning * into v_result;
  perform public.knot_audit('registration_reviewed', 'registration', p_registration_id, jsonb_build_object('status', v_status));
  return v_result;
end;
$$;

revoke all on function public.knot_register_native(text,jsonb,boolean,text) from public, anon;
revoke all on function public.knot_cancel_registration(text) from public, anon;
revoke all on function public.knot_review_registration(text,text) from public, anon;
grant execute on function public.knot_register_native(text,jsonb,boolean,text) to authenticated;
grant execute on function public.knot_cancel_registration(text) to authenticated;
grant execute on function public.knot_review_registration(text,text) to authenticated;

