-- Patch the prior reviewed function definition without duplicating its full body.
do $migrate$
declare
  definition text;
begin
  definition := pg_get_functiondef('public.knot_search_events(jsonb,jsonb,integer)'::regprocedure);
  if position('greatest(similarity(e.title,v_query),word_similarity(v_query,e.search_text))' in definition) = 0
    or position('e.mode = ''online'' or e.venue_geog is null or st_dwithin' in definition) = 0 then
    raise exception 'Unexpected knot_search_events base definition; refusing an unreviewed replacement.';
  end if;
  definition := replace(definition,
    'greatest(similarity(e.title,v_query),word_similarity(v_query,e.search_text))',
    'greatest(similarity(e.title,v_query),word_similarity(v_query,e.search_text) + 2 * word_similarity(v_query,e.title))');
  definition := replace(definition,
    '  v_travel := nullif(p_filters->>''maxTravelMinutes'','''')::double precision;',
    '  v_travel := nullif(p_filters->>''maxTravelMinutes'','''')::double precision;' || chr(10) ||
    '  if v_travel is not null and v_mode is distinct from ''online'' then' || chr(10) ||
    '    if v_travel <= 0 or v_travel > 1440 then raise exception ''KNOT_INVALID_TRAVEL_TIME'' using errcode = ''P0001''; end if;' || chr(10) ||
    '    raise exception ''KNOT_TRAVEL_TIME_REQUIRES_ROUTING: configure a routing provider; straight-line distance is not substituted for travel time.'' using errcode = ''P0001'';' || chr(10) ||
    '  end if;');
  definition := replace(definition,
    'e.mode = ''online'' or e.venue_geog is null or st_dwithin',
    'e.mode = ''online'' or (e.venue_geog is not null and st_dwithin');
  definition := replace(definition,
    'st_dwithin(e.venue_geog,v_origin,v_radius * 1000))',
    'st_dwithin(e.venue_geog,v_origin,v_radius * 1000)))');
  execute definition;
end;
$migrate$;
revoke all on function public.knot_search_events(jsonb,jsonb,integer) from public;
grant execute on function public.knot_search_events(jsonb,jsonb,integer) to anon,authenticated;
