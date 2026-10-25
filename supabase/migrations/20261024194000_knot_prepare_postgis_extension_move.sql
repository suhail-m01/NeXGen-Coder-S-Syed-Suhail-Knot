-- Preserve Knot's unqualified PostGIS references when Support moves the extension
-- from public to extensions. The extension itself must not be dropped because
-- public.knot_events.venue_geog contains live geography data.
alter function public.knot_prepare_event_discovery() set search_path = public,pg_temp,extensions;
alter function public.knot_search_events(jsonb,jsonb,integer) set search_path = public,pg_temp,extensions;
