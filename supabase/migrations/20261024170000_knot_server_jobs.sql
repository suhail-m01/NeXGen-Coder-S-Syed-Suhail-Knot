create extension if not exists pg_cron;

create table public.knot_series (
  id text primary key,
  organizer_id uuid not null references public.knot_profiles(id),
  title text not null check(char_length(title) between 2 and 160),
  template_event_id text references public.knot_events(id) on delete cascade,
  frequency text check(frequency in ('weekly','monthly')),
  next_at timestamptz,
  occurrences_remaining integer not null default 0 check(occurrences_remaining between 0 and 100),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  check(not active or (template_event_id is not null and frequency is not null and next_at is not null and occurrences_remaining > 0))
);
create table public.knot_series_runs (
  id text primary key default 'series-run-' || gen_random_uuid()::text,
  series_id text not null references public.knot_series(id) on delete cascade,
  template_event_id text not null references public.knot_events(id),
  cloned_event_id text not null references public.knot_events(id) on delete cascade,
  scheduled_for timestamptz not null,
  created_at timestamptz not null default now(),
  unique(series_id,scheduled_for)
);
create index knot_series_due on public.knot_series(next_at) where active;
alter table public.knot_series enable row level security;
alter table public.knot_series_runs enable row level security;
create policy knot_series_manage on public.knot_series for all to authenticated
  using(organizer_id = public.knot_uid() or public.knot_is_admin())
  with check((organizer_id = public.knot_uid() or public.knot_is_admin()) and public.knot_is_active_adult()
    and (template_event_id is null or public.knot_can_manage_event(template_event_id)));
create policy knot_series_runs_read on public.knot_series_runs for select to authenticated using(exists(
  select 1 from public.knot_series s where s.id = series_id and (s.organizer_id = public.knot_uid() or public.knot_is_admin())
));

create or replace function public.knot_process_series()
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_series public.knot_series;
  v_template public.knot_events;
  v_scheduled timestamptz;
  v_clone_id text;
  v_slug text;
  v_end timestamptz;
  v_data jsonb;
  v_catchup integer;
  v_created integer := 0;
begin
  for v_series in select * from public.knot_series where active and next_at <= now() order by next_at for update skip locked loop
    v_catchup := 0;
    while v_series.active and v_series.next_at <= now() and v_catchup < 3 loop
      v_scheduled := v_series.next_at;
      select * into v_template from public.knot_events where id = v_series.template_event_id;
      if v_template.id is null or v_template.organizer_id <> v_series.organizer_id or not exists(select 1 from public.knot_profiles p where p.id = v_series.organizer_id and p.age_band = '18_plus' and p.account_status = 'active') then
        v_series.active := false;
        exit;
      end if;
      if not exists(select 1 from public.knot_series_runs r where r.series_id = v_series.id and r.scheduled_for = v_scheduled) then
        v_clone_id := 'event-' || gen_random_uuid()::text;
        v_slug := left(v_template.slug || '-' || to_char(v_scheduled at time zone 'UTC','YYYYMMDD-HH24MI') || '-' || substr(gen_random_uuid()::text,1,8), 240);
        v_end := case when v_template.ends_at is null then null else v_scheduled + (v_template.ends_at - v_template.starts_at) end;
        v_data := v_template.public_data - 'recap' - 'showcaseEnabled' - 'sponsors' - 'safetyChecklist' - 'nativeSafetyChecklistComplete' || jsonb_build_object(
          'id', v_clone_id, 'slug', v_slug, 'organizerId', v_series.organizer_id, 'createdById', v_series.organizer_id,
          'seriesId', v_series.id, 'status', 'draft', 'visibility', 'private', 'startAt', v_scheduled, 'endAt', v_end,
          'registrationOpensAt', null, 'registrationDeadline', null, 'submissionDeadline', null,
          'nativeSafetyChecklistComplete', false, 'showcaseEnabled', false, 'recap', '', 'sponsors', '[]'::jsonb,
          'safetyChecklist', jsonb_build_object('safeguardingContact',false,'codeOfConduct',false,'supervisedEnvironment',false,'dataMinimization',false),
          'listings', '[]'::jsonb, 'createdAt', now(), 'updatedAt', now(), 'firstDiscoveredAt', now(), 'lastCheckedAt', now()
        );
        insert into public.knot_events(
          id,slug,organizer_id,title,status,visibility,starts_at,ends_at,registration_kind,capacity,approval,waitlist_enabled,
          registration_opens_at,registration_deadline,age_mode,min_age,max_age,public_data,created_at,updated_at
        ) values(
          v_clone_id,v_slug,v_series.organizer_id,v_template.title,'draft','private',v_scheduled,v_end,v_template.registration_kind,
          v_template.capacity,v_template.approval,v_template.waitlist_enabled,null,null,v_template.age_mode,v_template.min_age,v_template.max_age,v_data,now(),now()
        );
        insert into public.knot_event_private(event_id,online_join_url,participant_data) values(v_clone_id,null,'{}');
        insert into public.knot_series_runs(series_id,template_event_id,cloned_event_id,scheduled_for)
          values(v_series.id,v_template.id,v_clone_id,v_scheduled);
        insert into public.knot_audit_records(actor_id,action,target_type,target_id,details)
          values(null,'series_draft_cloned','event',v_clone_id,jsonb_build_object('series_id',v_series.id,'scheduled_for',v_scheduled,'system',true));
        v_created := v_created + 1;
      end if;
      v_series.next_at := case when v_series.frequency = 'weekly' then v_scheduled + interval '7 days' else v_scheduled + interval '1 month' end;
      v_series.occurrences_remaining := greatest(0,v_series.occurrences_remaining - 1);
      v_series.active := v_series.occurrences_remaining > 0;
      v_catchup := v_catchup + 1;
    end loop;
    update public.knot_series set next_at = v_series.next_at, occurrences_remaining = v_series.occurrences_remaining, active = v_series.active where id = v_series.id;
  end loop;
  return v_created;
end;
$$;
revoke all on function public.knot_process_series() from public,anon,authenticated;
grant execute on function public.knot_process_series() to service_role;
do $$ begin
  if not exists(select 1 from cron.job where jobname = 'knot-series-drafts') then
    perform cron.schedule('knot-series-drafts','*/5 * * * *','select public.knot_process_series();');
  end if;
end $$;

create or replace function public.knot_claim_outbox(p_limit integer default 10)
returns setof public.knot_outbox language plpgsql security definer set search_path = public,pg_temp as $$
begin
  if auth.role() <> 'service_role' then raise exception 'KNOT_SERVICE_ROLE_REQUIRED' using errcode = '42501'; end if;
  if p_limit < 1 or p_limit > 25 then raise exception 'KNOT_INVALID_JOB_LIMIT' using errcode = 'P0001'; end if;
  return query
    with candidates as (
      select id from public.knot_outbox where status = 'pending' and available_at <= now()
      order by created_at for update skip locked limit p_limit
    ), claimed as (
      update public.knot_outbox j set status = 'processing', attempts = j.attempts + 1, updated_at = now()
      from candidates c where j.id = c.id returning j.*
    ) select * from claimed;
end;
$$;
revoke all on function public.knot_claim_outbox(integer) from public,anon,authenticated;
grant execute on function public.knot_claim_outbox(integer) to service_role;

create table public.knot_ingestion_items (
  id text primary key default 'ingestion-item-' || gen_random_uuid()::text,
  run_id text not null references public.knot_ingestion_runs(id) on delete cascade,
  source_id text not null references public.knot_sources(id),
  external_id text,
  payload jsonb not null,
  raw_text text not null,
  status text not null default 'pending_review' check(status in ('pending_review','needs_info','published','merged','rejected')),
  created_at timestamptz not null default now(),
  unique(run_id,external_id)
);
alter table public.knot_ingestion_items enable row level security;
create policy knot_ingestion_items_admin on public.knot_ingestion_items for all to authenticated
  using(public.knot_is_admin()) with check(public.knot_is_admin());
revoke all on public.knot_ingestion_items from anon;
