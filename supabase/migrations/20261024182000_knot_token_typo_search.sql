-- Token-oriented typo matching with an indexed word-similarity threshold.
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
  perform set_config('pg_trgm.word_similarity_threshold','0.35',true);
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
      case when v_query = '' then 0 else ts_rank_cd(e.search_document,websearch_to_tsquery('english',v_query)) + greatest(similarity(e.title,v_query),word_similarity(v_query,e.search_text)) end as text_rank,
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
      and (v_query = '' or e.search_document @@ websearch_to_tsquery('english',v_query) or v_query <% e.search_text or e.search_text ilike '%' || v_query || '%')
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
