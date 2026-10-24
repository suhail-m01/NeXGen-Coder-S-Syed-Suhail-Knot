-- Preserve legacy rows while removing anonymous demo write policies.
create extension if not exists pgcrypto;
drop policy if exists demo_append_events on public.events;
drop policy if exists demo_append_sources on public.event_sources;
drop policy if exists demo_append_updates on public.event_updates;
