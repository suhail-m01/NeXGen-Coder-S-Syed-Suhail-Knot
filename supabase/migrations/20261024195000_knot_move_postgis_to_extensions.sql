-- Self-service PostGIS move for a small, fully inventoried Knot deployment.
-- This is intentionally atomic: any ownership error, missing dependency or data
-- mismatch rolls back the extension drop and all restoration steps.
begin;
set local lock_timeout = '15s';
set local statement_timeout = '120s';
lock table public.knot_events in access exclusive mode;

create temporary table knot_postgis_event_backup on commit drop as
  select id,public.st_asewkb(venue_geog::geometry) as venue_geog_ewkb
  from public.knot_events;
create temporary table knot_postgis_spatial_ref_backup on commit drop as
  table public.spatial_ref_sys;

drop extension postgis cascade;
create extension postgis with schema extensions;

alter table public.knot_events add column venue_geog extensions.geography(Point,4326);
update public.knot_events e
  set venue_geog = extensions.st_geogfromwkb(b.venue_geog_ewkb)
  from knot_postgis_event_backup b
  where b.id = e.id and b.venue_geog_ewkb is not null;
create index knot_events_venue_geog on public.knot_events using gist(venue_geog);

insert into extensions.spatial_ref_sys
  select * from knot_postgis_spatial_ref_backup
  on conflict(srid) do nothing;

-- Preserve the two PL/pgSQL objects and the trigger discovered during preflight.
alter function public.knot_prepare_event_discovery() set search_path = public,pg_temp,extensions;
alter function public.knot_search_events(jsonb,jsonb,integer) set search_path = public,pg_temp,extensions;

do $$
begin
  if to_regprocedure('public.knot_prepare_event_discovery()') is null
    or to_regprocedure('public.knot_search_events(jsonb,jsonb,integer)') is null then
    raise exception 'KNOT_POSTGIS_FUNCTION_LOST';
  end if;
  if not exists(select 1 from pg_trigger where tgrelid='public.knot_events'::regclass and tgname='knot_event_discovery_prepare' and not tgisinternal) then
    raise exception 'KNOT_POSTGIS_TRIGGER_LOST';
  end if;
  if (select count(*) from public.knot_events) <> (select count(*) from knot_postgis_event_backup) then
    raise exception 'KNOT_POSTGIS_EVENT_COUNT_MISMATCH';
  end if;
  if exists(
    select 1 from knot_postgis_event_backup b
    full join public.knot_events e on e.id=b.id
    where b.id is null or e.id is null
      or case when e.id is null then null else extensions.st_asewkb(e.venue_geog::geometry) end is distinct from b.venue_geog_ewkb
  ) then
    raise exception 'KNOT_POSTGIS_COORDINATE_MISMATCH';
  end if;
  if (select count(*) from extensions.spatial_ref_sys) <> (select count(*) from knot_postgis_spatial_ref_backup)
    or exists(select 1 from (select * from knot_postgis_spatial_ref_backup except select * from extensions.spatial_ref_sys) d)
    or exists(select 1 from (select * from extensions.spatial_ref_sys except select * from knot_postgis_spatial_ref_backup) d) then
    raise exception 'KNOT_POSTGIS_SPATIAL_REF_MISMATCH';
  end if;
  if to_regclass('public.spatial_ref_sys') is not null then
    raise exception 'KNOT_POSTGIS_PUBLIC_CATALOG_REMAINS';
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
