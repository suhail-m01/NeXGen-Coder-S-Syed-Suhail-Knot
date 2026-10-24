create extension if not exists postgis;
create extension if not exists pg_trgm;

alter table public.knot_events add column if not exists search_document tsvector;
alter table public.knot_events add column if not exists search_text text;
alter table public.knot_events add column if not exists venue_geog geography(Point,4326);
alter table public.knot_events add column if not exists event_type text;
alter table public.knot_events add column if not exists mode text;
alter table public.knot_events add column if not exists price_kind text;
alter table public.knot_events add column if not exists team_mode text;
alter table public.knot_events add column if not exists interests text[] not null default '{}';
alter table public.knot_events add column if not exists skills text[] not null default '{}';
alter table public.knot_events add column if not exists first_discovered_at timestamptz;

create or replace function public.knot_prepare_event_discovery()
returns trigger language plpgsql security invoker set search_path = public,pg_temp as $$
declare v_latitude double precision; v_longitude double precision;
begin
  new.event_type := coalesce(new.public_data->>'eventType','other');
  new.mode := coalesce(new.public_data->>'mode','in_person');
  new.price_kind := coalesce(new.public_data#>>'{price,kind}','unknown');
  new.team_mode := coalesce(new.public_data#>>'{team,mode}','not_stated');
  new.interests := case when jsonb_typeof(new.public_data->'interests') = 'array'
    then coalesce((select array_agg(value) from jsonb_array_elements_text(new.public_data->'interests') value),'{}') else '{}' end;
  new.skills := case when jsonb_typeof(new.public_data->'skills') = 'array'
    then coalesce((select array_agg(value) from jsonb_array_elements_text(new.public_data->'skills') value),'{}') else '{}' end;
  new.search_text := left(concat_ws(' ',new.title,new.public_data->>'summary',new.public_data->>'description',
    new.public_data->>'organizerName',new.event_type,new.public_data->'interests',new.public_data->'skills'),20000);
  new.search_document := to_tsvector('english'::regconfig,coalesce(new.search_text,''));
  new.venue_geog := null;
  if jsonb_typeof(new.public_data->'venue') = 'object'
    and jsonb_typeof(new.public_data#>'{venue,latitude}') = 'number'
    and jsonb_typeof(new.public_data#>'{venue,longitude}') = 'number' then
    begin
      v_latitude := (new.public_data#>>'{venue,latitude}')::double precision;
      v_longitude := (new.public_data#>>'{venue,longitude}')::double precision;
      if v_latitude between -90 and 90 and v_longitude between -180 and 180 then
        new.venue_geog := st_setsrid(st_makepoint(v_longitude,v_latitude),4326)::geography;
      end if;
    exception when others then new.venue_geog := null;
    end;
  end if;
  begin
    new.first_discovered_at := coalesce((new.public_data->>'firstDiscoveredAt')::timestamptz,new.created_at);
  exception when others then new.first_discovered_at := new.created_at;
  end;
  return new;
end;
$$;

drop trigger if exists knot_event_discovery_prepare on public.knot_events;
create trigger knot_event_discovery_prepare before insert or update of title,public_data,created_at on public.knot_events
for each row execute function public.knot_prepare_event_discovery();
update public.knot_events set public_data = public_data;

create index if not exists knot_events_search_document on public.knot_events using gin(search_document);
create index if not exists knot_events_search_trgm on public.knot_events using gin(search_text gin_trgm_ops);
create index if not exists knot_events_venue_geog on public.knot_events using gist(venue_geog);
create index if not exists knot_events_interests on public.knot_events using gin(interests);
create index if not exists knot_events_skills on public.knot_events using gin(skills);
create index if not exists knot_events_keyset on public.knot_events(status,visibility,starts_at,id);

create table public.knot_interest_signals (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.knot_profiles(id) on delete cascade,
  event_id text not null references public.knot_events(id) on delete cascade,
  action text not null check(action in ('view','save','share','participation')),
  interests text[] not null check(cardinality(interests) between 1 and 20),
  occurred_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days',
  signal_day date not null default current_date,
  unique(user_id,event_id,action,signal_day)
);
create index knot_interest_signals_learning on public.knot_interest_signals(user_id,expires_at,occurred_at) include(interests,action);
alter table public.knot_interest_signals enable row level security;
create policy knot_interest_signals_own_read on public.knot_interest_signals for select to authenticated using(user_id = public.knot_uid());
create policy knot_interest_signals_own_delete on public.knot_interest_signals for delete to authenticated using(user_id = public.knot_uid());
revoke all on public.knot_interest_signals from anon;

create table public.knot_rate_limits (
  action text not null,
  key_hash text not null,
  window_started_at timestamptz not null,
  hits integer not null default 1,
  primary key(action,key_hash,window_started_at)
);
alter table public.knot_rate_limits enable row level security;
revoke all on public.knot_rate_limits from public,anon,authenticated;

create or replace function public.knot_consume_rate_limit(p_action text,p_key text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = public,pg_temp as $$
declare v_window timestamptz; v_hits integer;
begin
  if p_action !~ '^[a-z0-9_-]{2,60}$' or char_length(coalesce(p_key,'')) < 8 or char_length(p_key) > 256
    or p_limit < 1 or p_limit > 100000 or p_window_seconds < 10 or p_window_seconds > 86400 then
    raise exception 'KNOT_INVALID_RATE_LIMIT' using errcode = 'P0001';
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.knot_rate_limits(action,key_hash,window_started_at,hits)
    values(p_action,encode(digest(p_key,'sha256'),'hex'),v_window,1)
  on conflict(action,key_hash,window_started_at) do update set hits = public.knot_rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;
revoke all on function public.knot_consume_rate_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.knot_consume_rate_limit(text,text,integer,integer) to service_role;

create or replace function public.knot_record_referral_visit(p_token text,p_session_key text)
returns boolean language plpgsql security definer set search_path = public,pg_temp as $$
declare v_campaign text; v_inserted boolean;
begin
  if char_length(coalesce(p_session_key,'')) < 16 or char_length(p_session_key) > 128 then raise exception 'KNOT_INVALID_SESSION_KEY' using errcode = 'P0001'; end if;
  select id into v_campaign from public.knot_referral_campaigns where token = p_token and active;
  if v_campaign is null then return false; end if;
  if not public.knot_consume_rate_limit('referral-session',p_session_key,30,3600)
    or not public.knot_consume_rate_limit('referral-campaign',v_campaign,1000,3600) then return false; end if;
  insert into public.knot_referral_visits(campaign_id,session_hash)
    values(v_campaign,encode(digest(p_session_key,'sha256'),'hex')) on conflict do nothing returning true into v_inserted;
  return coalesce(v_inserted,false);
end;
$$;
revoke all on function public.knot_record_referral_visit(text,text) from public;
grant execute on function public.knot_record_referral_visit(text,text) to anon,authenticated;

create or replace function public.knot_record_interest_signal(p_event_id text,p_action text,p_dwell_seconds integer default null)
returns jsonb language plpgsql security definer set search_path = public,pg_temp as $$
declare v_profile public.knot_profiles; v_interests text[]; v_result jsonb;
begin
  if auth.uid() is null then raise exception 'KNOT_AUTH_REQUIRED' using errcode = '42501'; end if;
  select * into v_profile from public.knot_profiles where id = auth.uid();
  if v_profile.id is null or v_profile.age_band <> '18_plus' or v_profile.account_status <> 'active' or not v_profile.personalization_consent then
    return jsonb_build_object('recorded',false,'reason','ADULT_PERSONALIZATION_CONSENT_REQUIRED');
  end if;
  if p_action not in ('view','save','share','participation') then raise exception 'KNOT_INVALID_SIGNAL' using errcode = 'P0001'; end if;
  if p_action = 'view' and coalesce(p_dwell_seconds,0) < 5 then return jsonb_build_object('recorded',false,'reason','DWELL_TOO_SHORT'); end if;
  if not exists(select 1 from public.knot_events e where e.id = p_event_id and e.visibility = 'public' and e.status in ('published','changed','stale')) then
    raise exception 'KNOT_EVENT_NOT_PUBLIC' using errcode = 'P0001';
  end if;
  if not public.knot_consume_rate_limit('interest-signal',auth.uid()::text,120,3600) then raise exception 'KNOT_RATE_LIMITED' using errcode = 'P0001'; end if;
  select case when jsonb_typeof(e.public_data->'interests') = 'array'
    then coalesce((select array_agg(value) from (select distinct value from jsonb_array_elements_text(e.public_data->'interests') value limit 20) distinct_values),'{}') else '{}' end
    into v_interests from public.knot_events e where e.id = p_event_id;
  if coalesce(cardinality(v_interests),0) = 0 then return jsonb_build_object('recorded',false,'reason','NO_INTERESTS'); end if;
  insert into public.knot_interest_signals(user_id,event_id,action,interests)
    values(auth.uid(),p_event_id,p_action,v_interests) on conflict(user_id,event_id,action,signal_day) do nothing;
  with scores as (
    select interest,sum((case s.action when 'view' then 1 when 'share' then 2 when 'save' then 3 else 4 end)
      * power(2::numeric,-greatest(0,extract(epoch from now()-s.occurred_at))/86400/30)
      / cardinality(s.interests))::double precision as score
    from public.knot_interest_signals s cross join lateral unnest(s.interests) interest
    where s.user_id = auth.uid() and s.expires_at > now() group by interest
  ), ranked as (select interest from scores order by score desc,interest limit 12)
  update public.knot_profiles p set learned_interests = coalesce((select array_agg(interest) from ranked),'{}')
    where p.id = auth.uid() returning jsonb_build_object('recorded',true,'learnedInterests',p.learned_interests) into v_result;
  return coalesce(v_result,jsonb_build_object('recorded',false));
end;
$$;
revoke all on function public.knot_record_interest_signal(text,text,integer) from public,anon;
grant execute on function public.knot_record_interest_signal(text,text,integer) to authenticated;

create or replace function public.knot_protect_profile()
returns trigger language plpgsql security definer set search_path = public,pg_temp as $$
begin
  if not public.knot_is_admin() then
    if new.role is distinct from old.role or new.workspace_admin is distinct from old.workspace_admin or new.account_status is distinct from old.account_status then
      raise exception 'KNOT_PRIVILEGED_PROFILE_FIELD' using errcode = 'P0001';
    end if;
    if new.age_band is distinct from old.age_band or new.guardian_consent is distinct from old.guardian_consent then
      raise exception 'KNOT_AGE_CHANGE_REQUIRES_REVIEW' using errcode = 'P0001';
    end if;
    if new.id is distinct from old.id or new.email is distinct from old.email then raise exception 'KNOT_IDENTITY_FIELD_IMMUTABLE' using errcode = 'P0001'; end if;
  end if;
  new.updated_at := now();
  if new.age_band <> '18_plus' or not new.personalization_consent then
    new.personalization_consent := false;
    new.learned_interests := '{}';
  end if;
  if new.age_band <> '18_plus' then new.return_analytics_consent := false; end if;
  return new;
end;
$$;

create or replace function public.knot_withdraw_personalization_data()
returns trigger language plpgsql security definer set search_path = public,pg_temp as $$
begin
  if (old.personalization_consent and not new.personalization_consent)
    or (old.age_band = '18_plus' and new.age_band <> '18_plus')
    or (old.account_status = 'active' and new.account_status <> 'active') then
    delete from public.knot_interest_signals where user_id = old.id;
  end if;
  return new;
end;
$$;
drop trigger if exists knot_profile_withdraw_personalization on public.knot_profiles;
create trigger knot_profile_withdraw_personalization after update on public.knot_profiles
for each row execute function public.knot_withdraw_personalization_data();

create or replace function public.knot_cleanup_personalization()
returns integer language plpgsql security definer set search_path = public,pg_temp as $$
declare v_count integer;
begin
  delete from public.knot_interest_signals where expires_at <= now();
  get diagnostics v_count = row_count;
  delete from public.knot_rate_limits where window_started_at < now() - interval '2 days';
  return v_count;
end;
$$;
revoke all on function public.knot_cleanup_personalization() from public,anon,authenticated;
grant execute on function public.knot_cleanup_personalization() to service_role;
do $$ begin
  if not exists(select 1 from cron.job where jobname = 'knot-personalization-retention') then
    perform cron.schedule('knot-personalization-retention','17 * * * *','select public.knot_cleanup_personalization();');
  end if;
end $$;

create or replace function public.knot_search_events(p_filters jsonb default '{}'::jsonb,p_cursor jsonb default null,p_limit integer default 24)
returns jsonb language plpgsql stable security invoker set search_path = public,pg_temp as $$
declare
  v_query text; v_type text; v_mode text; v_price text; v_source text; v_team text; v_interest text; v_skill text;
  v_age_rule text; v_age_band text; v_sort text; v_origin geography; v_radius double precision; v_travel double precision;
  v_from timestamptz; v_to timestamptz; v_bbox double precision[]; v_band_min integer; v_band_max integer;
  v_events jsonb; v_total integer; v_has_more boolean; v_next jsonb; v_length integer;
begin
  if jsonb_typeof(p_filters) is distinct from 'object' then raise exception 'KNOT_INVALID_FILTER' using errcode = 'P0001'; end if;
  if p_limit < 1 or p_limit > 50 then raise exception 'KNOT_INVALID_PAGE_SIZE' using errcode = 'P0001'; end if;
  v_query := left(coalesce(p_filters->>'query',''),200);
  v_type := nullif(p_filters->>'eventType','all'); v_mode := nullif(p_filters->>'mode','all');
  v_price := nullif(p_filters->>'price','all'); v_source := nullif(p_filters->>'source','');
  v_team := nullif(p_filters->>'team','all'); v_interest := nullif(p_filters->>'interest',''); v_skill := nullif(p_filters->>'skill','');
  v_age_rule := nullif(p_filters->>'ageRule','all'); v_age_band := nullif(p_filters->>'ageBand','');
  v_sort := coalesce(nullif(p_filters->>'sort',''),'soonest');
  if v_sort not in ('soonest','newest','closing','nearest','best_fit','relevance') then raise exception 'KNOT_INVALID_SORT' using errcode = 'P0001'; end if;
  v_from := nullif(p_filters->>'from','')::timestamptz; v_to := nullif(p_filters->>'to','')::timestamptz;
  v_radius := least(200,greatest(0.1,coalesce(nullif(p_filters->>'radiusKm','')::double precision,10)));
  v_travel := nullif(p_filters->>'maxTravelMinutes','')::double precision;
  if p_filters ? 'latitude' and p_filters ? 'longitude' and jsonb_typeof(p_filters->'latitude') = 'number' and jsonb_typeof(p_filters->'longitude') = 'number' then
    if (p_filters->>'latitude')::double precision between -90 and 90 and (p_filters->>'longitude')::double precision between -180 and 180 then
      v_origin := st_setsrid(st_makepoint((p_filters->>'longitude')::double precision,(p_filters->>'latitude')::double precision),4326)::geography;
    end if;
  end if;
  if jsonb_typeof(p_filters->'bbox') = 'array' and jsonb_array_length(p_filters->'bbox') = 4 then
    select array_agg(value::double precision) into v_bbox from jsonb_array_elements_text(p_filters->'bbox') value;
    if v_bbox[1] < -180 or v_bbox[3] > 180 or v_bbox[2] < -90 or v_bbox[4] > 90 or v_bbox[1] >= v_bbox[3] or v_bbox[2] >= v_bbox[4] then
      raise exception 'KNOT_INVALID_BOUNDS' using errcode = 'P0001';
    end if;
  end if;
  v_band_min := case v_age_band when 'under_13' then 0 when '13_15' then 13 when '16_17' then 16 when '18_plus' then 18 else null end;
  v_band_max := case v_age_band when 'under_13' then 12 when '13_15' then 15 when '16_17' then 17 when '18_plus' then null else null end;
  with profile as (
    select p.interests,p.skills,p.learning_goals from public.knot_profiles p where p.id = auth.uid() and p.age_band = '18_plus' and p.account_status = 'active'
  ), learned as (
    select interest,sum((case s.action when 'view' then 1 when 'share' then 2 when 'save' then 3 else 4 end)
      * power(2::numeric,-greatest(0,extract(epoch from now()-s.occurred_at))/86400/30)/cardinality(s.interests))::double precision as score
    from public.knot_interest_signals s cross join lateral unnest(s.interests) interest
    where s.user_id = auth.uid() and s.expires_at > now() group by interest
  ), candidates as (
    select e.*,
      case when v_origin is not null and e.venue_geog is not null then st_distance(e.venue_geog,v_origin)/1000 else null end as distance_km,
      case when v_query = '' then 0 else ts_rank_cd(e.search_document,websearch_to_tsquery('english',v_query)) + similarity(e.search_text,v_query) end as text_rank,
      (coalesce((select count(*) from unnest(e.interests) value where value = any(coalesce((select interests from profile),'{}'))),0) * 4
        + coalesce((select count(*) from unnest(e.skills) value where value = any(coalesce((select skills from profile),'{}'))),0) * 3
        + coalesce((select count(*) from unnest(e.skills) value where value = any(coalesce((select learning_goals from profile),'{}'))),0) * 3
        + coalesce((select sum(l.score) from learned l where l.interest = any(e.interests)),0))::double precision as fit_score
    from public.knot_events e
    where e.visibility = 'public' and e.status in ('published','changed','stale') and coalesce(e.ends_at,e.starts_at) >= now()
      and (v_type is null or e.event_type = v_type) and (v_mode is null or e.mode = v_mode)
      and (v_price is null or e.price_kind = v_price) and (v_team is null or e.team_mode = v_team)
      and (v_interest is null or v_interest = any(e.interests)) and (v_skill is null or v_skill = any(e.skills))
      and (v_source is null or exists(select 1 from jsonb_array_elements(coalesce(e.public_data->'listings','[]'::jsonb)) listing where listing->>'source' = v_source))
      and (v_query = '' or e.search_document @@ websearch_to_tsquery('english',v_query) or e.search_text % v_query or e.search_text ilike '%' || v_query || '%')
      and (v_from is null or coalesce(e.ends_at,e.starts_at) >= v_from) and (v_to is null or e.starts_at <= v_to)
      and (v_origin is null or e.mode = 'online' or e.venue_geog is null or st_dwithin(e.venue_geog,v_origin,v_radius * 1000))
      and (v_bbox is null or st_intersects(e.venue_geog,st_makeenvelope(v_bbox[1],v_bbox[2],v_bbox[3],v_bbox[4],4326)::geography))
      and (v_age_rule is null or case v_age_rule
        when 'all_ages' then e.age_mode = 'all_ages' when 'not_stated' then e.age_mode = 'not_stated'
        when 'under_18' then e.age_mode = 'under_18_only' or coalesce(e.max_age,18) < 18
        when '13_plus' then (e.age_mode in ('min_age','age_range') and e.min_age = 13)
        when '16_plus' then (e.age_mode in ('min_age','age_range') and e.min_age = 16)
        when '18_plus' then e.age_mode = 'adults_only' or (e.age_mode in ('min_age','age_range') and e.min_age = 18) else true end)
      and (not coalesce((p_filters->>'onlyJoinable')::boolean,false) or v_band_min is null or case e.age_mode
        when 'all_ages' then true when 'not_stated' then true
        when 'adults_only' then v_band_min >= 18
        when 'under_18_only' then coalesce(v_band_max,18) < 18
        when 'min_age' then e.min_age is null or coalesce(v_band_max,2147483647) >= e.min_age
        when 'age_range' then (e.min_age is null or coalesce(v_band_max,2147483647) >= e.min_age) and (e.max_age is null or v_band_min <= e.max_age) else true end)
  ), ranked as (
    select * from candidates b where p_cursor is null or case v_sort
      when 'newest' then (b.first_discovered_at,b.id) < (nullif(p_cursor->>'firstDiscoveredAt','')::timestamptz,p_cursor->>'id')
      when 'closing' then (coalesce(b.registration_deadline,'infinity'::timestamptz),b.starts_at,b.id) > (coalesce(nullif(p_cursor->>'registrationDeadline','')::timestamptz,'infinity'::timestamptz),nullif(p_cursor->>'startAt','')::timestamptz,p_cursor->>'id')
      when 'nearest' then (coalesce(b.distance_km,'infinity'::double precision),b.starts_at,b.id) > (coalesce(nullif(p_cursor->>'distanceKm','')::double precision,'infinity'::double precision),nullif(p_cursor->>'startAt','')::timestamptz,p_cursor->>'id')
      when 'best_fit' then b.fit_score < coalesce(nullif(p_cursor->>'fitScore','')::double precision,0) or (b.fit_score = coalesce(nullif(p_cursor->>'fitScore','')::double precision,0) and (b.starts_at,b.id) > (nullif(p_cursor->>'startAt','')::timestamptz,p_cursor->>'id'))
      when 'relevance' then b.text_rank < coalesce(nullif(p_cursor->>'textRank','')::double precision,0) or (b.text_rank = coalesce(nullif(p_cursor->>'textRank','')::double precision,0) and (b.starts_at,b.id) > (nullif(p_cursor->>'startAt','')::timestamptz,p_cursor->>'id'))
      else (b.starts_at,b.id) > (nullif(p_cursor->>'startAt','')::timestamptz,p_cursor->>'id') end
  ), limited as (
    select * from ranked b order by
      case when v_sort = 'best_fit' then b.fit_score end desc nulls last,
      case when v_sort = 'relevance' then b.text_rank end desc nulls last,
      case when v_sort = 'nearest' then b.distance_km end asc nulls last,
      case when v_sort = 'closing' then b.registration_deadline end asc nulls last,
      case when v_sort = 'newest' then b.first_discovered_at end desc nulls last,
      b.starts_at,b.id limit p_limit + 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'event',to_jsonb(b) - 'search_document' - 'search_text' - 'venue_geog' - 'event_type' - 'mode' - 'price_kind' - 'team_mode' - 'interests' - 'skills' - 'first_discovered_at' - 'distance_km' - 'text_rank' - 'fit_score',
    'distanceKm',b.distance_km,'relevance',b.text_rank,'fitScore',b.fit_score,
    'cursor',jsonb_build_object('id',b.id,'startAt',b.starts_at,'firstDiscoveredAt',b.first_discovered_at,
      'registrationDeadline',b.registration_deadline,'distanceKm',b.distance_km,'fitScore',b.fit_score,'textRank',b.text_rank)
  ) order by
      case when v_sort = 'best_fit' then b.fit_score end desc nulls last,
      case when v_sort = 'relevance' then b.text_rank end desc nulls last,
      case when v_sort = 'nearest' then b.distance_km end asc nulls last,
      case when v_sort = 'closing' then b.registration_deadline end asc nulls last,
      case when v_sort = 'newest' then b.first_discovered_at end desc nulls last,
      b.starts_at,b.id),'[]'::jsonb),
    (select count(*) from candidates) into v_events,v_total from limited b;
  v_length := jsonb_array_length(v_events); v_has_more := v_length > p_limit;
  if v_has_more then
    select coalesce(jsonb_agg(value),'[]'::jsonb) into v_events from jsonb_array_elements(v_events) with ordinality item(value,position) where position <= p_limit;
    v_length := p_limit;
  end if;
  if v_length > 0 then v_next := v_events -> (v_length - 1) -> 'cursor'; else v_next := null; end if;
  return jsonb_build_object('events',v_events,'total',v_total,'hasMore',v_has_more,'nextCursor',v_next,'pageSize',p_limit);
end;
$$;
revoke all on function public.knot_search_events(jsonb,jsonb,integer) from public;
grant execute on function public.knot_search_events(jsonb,jsonb,integer) to anon,authenticated;

create or replace function public.knot_discovery_overview()
returns jsonb language plpgsql stable security definer set search_path = public,pg_temp as $$
declare v_result jsonb;
begin
  with eligible as (
    select * from public.knot_events e where e.visibility = 'public' and e.status in ('published','changed','stale') and coalesce(e.ends_at,e.starts_at) >= now()
  ), categories as (
    select coalesce(public_data->>'eventType','other') as event_type,count(*) as count from eligible group by 1
  ), activity as (
    select e.id,e.slug,e.title,e.starts_at,
      (select count(*) from public.knot_registrations r where r.event_id = e.id and r.kind = 'native' and r.status in ('registered','approved','checked_in','attended')) as confirmed,
      (select count(*) from public.knot_saves s where s.event_id = e.id) as saves,
      (select count(*) from public.knot_going g where g.event_id = e.id) as going
    from eligible e where coalesce(e.public_data->'isSample','false'::jsonb) = 'false'::jsonb
  ), trends as (
    select *,confirmed * 4 + saves * 2 + going as score from activity where confirmed >= 5 or saves >= 5 or going >= 5
  )
  select jsonb_build_object(
    'categories',coalesce((select jsonb_agg(jsonb_build_object('eventType',event_type,'count',count) order by count desc,event_type) from categories),'[]'::jsonb),
    'trending',coalesce((select jsonb_agg(jsonb_build_object('eventId',id,'slug',slug,'title',title,'startAt',starts_at,
      'confirmedNative',case when confirmed >= 5 then confirmed end,'saves',case when saves >= 5 then saves end,'going',case when going >= 5 then going end,'score',score)
      order by score desc,starts_at,id) from (select * from trends order by score desc,starts_at,id limit 10) trend_page),'[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;
revoke all on function public.knot_discovery_overview() from public;
grant execute on function public.knot_discovery_overview() to anon,authenticated;

create table public.knot_geocode_cache (
  query_hash text primary key,
  response jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.knot_geocode_cache enable row level security;
revoke all on public.knot_geocode_cache from public,anon,authenticated;

alter table public.knot_sources add column if not exists provider text not null default 'generic';
alter table public.knot_sources add column if not exists config jsonb not null default '{}'::jsonb;
alter table public.knot_sources drop constraint if exists knot_sources_provider_check;
alter table public.knot_sources add constraint knot_sources_provider_check check(provider in ('generic','ticketmaster'));

do $$
declare table_name text;
begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array['knot_events','knot_registrations','knot_profiles','knot_saves','knot_going','knot_saved_searches','knot_sources','knot_media_assets'] loop
      if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name) then
        execute format('alter publication supabase_realtime add table public.%I',table_name);
      end if;
    end loop;
  end if;
end $$;
