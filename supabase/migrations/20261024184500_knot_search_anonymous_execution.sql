-- Anonymous execution requires the function owner to parse private CTEs.
-- The reviewed body returns only active public events and reads profile/signals
-- exclusively through auth.uid(); anonymous auth.uid() is null and learns nothing.
do $migrate$
declare definition text;
begin
  definition := pg_get_functiondef('public.knot_search_events(jsonb,jsonb,integer)'::regprocedure);
  if position('where e.visibility = ''public'' and e.status in (''published'',''changed'',''stale'')' in definition) = 0
    or position('where p.id = auth.uid() and p.age_band = ''18_plus''' in definition) = 0
    or position('where s.user_id = auth.uid() and s.expires_at > now()' in definition) = 0 then
    raise exception 'Search safety predicates changed; refusing definer-security execution.';
  end if;
  if position('SECURITY DEFINER' in definition) = 0 then
    definition := replace(definition,' SET search_path TO',' SECURITY DEFINER' || chr(10) || ' SET search_path TO');
  end if;
  execute definition;
end;
$migrate$;
revoke all on function public.knot_search_events(jsonb,jsonb,integer) from public;
grant execute on function public.knot_search_events(jsonb,jsonb,integer) to anon,authenticated;
