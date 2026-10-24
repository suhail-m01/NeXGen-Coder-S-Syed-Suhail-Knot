alter table public.knot_media_assets drop constraint knot_media_assets_kind_check;
alter table public.knot_media_assets add constraint knot_media_assets_kind_check
  check(kind in ('event_image','recap_photo','sponsor_logo'));
drop policy if exists knot_events_insert on public.knot_events;
create policy knot_events_insert on public.knot_events for insert to authenticated
  with check (organizer_id = public.knot_uid() and public.knot_is_active_adult());
