-- JSON cursors must carry the same quantized score used by the keyset predicate.
do $migrate$
declare definition text;
begin
  definition := pg_get_functiondef('public.knot_search_events(jsonb,jsonb,integer)'::regprocedure);
  if position('case when v_query = '''' then 0 else ts_rank_cd(e.search_document,websearch_to_tsquery(''english'',v_query)) + greatest(similarity(e.title,v_query),word_similarity(v_query,e.search_text) + 2 * word_similarity(v_query,e.title)) end as text_rank' in definition) = 0 then
    raise exception 'Unexpected relevance expression; refusing cursor replacement.';
  end if;
  definition := replace(definition,
    'case when v_query = '''' then 0 else ts_rank_cd(e.search_document,websearch_to_tsquery(''english'',v_query)) + greatest(similarity(e.title,v_query),word_similarity(v_query,e.search_text) + 2 * word_similarity(v_query,e.title)) end as text_rank',
    'round((case when v_query = '''' then 0 else ts_rank_cd(e.search_document,websearch_to_tsquery(''english'',v_query)) + greatest(similarity(e.title,v_query),word_similarity(v_query,e.search_text) + 2 * word_similarity(v_query,e.title)) end)::numeric,6)::double precision as text_rank');
  execute definition;
end;
$migrate$;
revoke all on function public.knot_search_events(jsonb,jsonb,integer) from public;
grant execute on function public.knot_search_events(jsonb,jsonb,integer) to anon,authenticated;
