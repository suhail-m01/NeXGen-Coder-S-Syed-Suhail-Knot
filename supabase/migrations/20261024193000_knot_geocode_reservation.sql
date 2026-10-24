-- Serialized, bounded organizer geocoding on top of the existing private cache.
create table public.knot_geocode_state (
  singleton boolean primary key default true check (singleton),
  last_started_at timestamptz not null default 'epoch',
  in_flight boolean not null default false
);
insert into public.knot_geocode_state(singleton) values(true) on conflict(singleton) do nothing;
create index if not exists knot_geocode_cache_expires_idx on public.knot_geocode_cache(expires_at);
alter table public.knot_geocode_state enable row level security;
revoke all on public.knot_geocode_state from public,anon,authenticated;

create or replace function public.knot_geocode_reserve(p_user_id uuid,p_query_hash text)
returns jsonb language plpgsql security definer set search_path = public,pg_temp as $$
declare
  v_response jsonb;
  v_state public.knot_geocode_state%rowtype;
  v_wait numeric;
begin
  if p_user_id is null or coalesce(p_query_hash,'') !~ '^[0-9a-f]{64}$' then
    raise exception 'KNOT_INVALID_GEOCODE_REQUEST' using errcode = 'P0001';
  end if;
  if not exists(select 1 from public.knot_profiles where id = p_user_id and account_status = 'active' and age_band = '18_plus') then
    raise exception 'KNOT_ADULT_ORGANIZER_REQUIRED' using errcode = 'P0001';
  end if;
  if not public.knot_consume_rate_limit('geocode-user',p_user_id::text,30,3600) then
    raise exception 'KNOT_RATE_LIMITED' using errcode = 'P0001';
  end if;

  -- The short transaction lock coordinates all Edge instances without holding a
  -- database connection during the upstream HTTP request.
  perform pg_advisory_xact_lock(740194);
  select response into v_response from public.knot_geocode_cache
    where query_hash = p_query_hash and expires_at > now();
  if found then
    return jsonb_build_object('status','hit','response',v_response);
  end if;
  delete from public.knot_geocode_cache where query_hash = p_query_hash and expires_at <= now();
  if random() < 0.02 then delete from public.knot_geocode_cache where expires_at <= now(); end if;

  select * into v_state from public.knot_geocode_state where singleton for update;
  if v_state.in_flight and v_state.last_started_at > now() - interval '15 seconds' then
    return jsonb_build_object('status','retry','retryAfter',1);
  end if;
  v_wait := extract(epoch from (v_state.last_started_at + interval '1100 milliseconds' - now()));
  if v_wait > 0 then
    return jsonb_build_object('status','retry','retryAfter',greatest(1,ceil(v_wait)::integer));
  end if;
  if not public.knot_consume_rate_limit('geocode-upstream','nominatim-compatible',240,3600) then
    raise exception 'KNOT_GLOBAL_RATE_LIMITED' using errcode = 'P0001';
  end if;
  update public.knot_geocode_state set last_started_at = now(),in_flight = true where singleton;
  return jsonb_build_object('status','miss');
end;
$$;

create or replace function public.knot_geocode_finish()
returns void language sql security definer set search_path = public,pg_temp as $$
  update public.knot_geocode_state set in_flight = false where singleton;
$$;

revoke all on function public.knot_geocode_reserve(uuid,text) from public,anon,authenticated;
revoke all on function public.knot_geocode_finish() from public,anon,authenticated;
grant execute on function public.knot_geocode_reserve(uuid,text) to service_role;
grant execute on function public.knot_geocode_finish() to service_role;
