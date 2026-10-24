-- Unlisted means detail-by-link, not anonymous bulk catalog export.
drop policy if exists knot_events_public_read on public.knot_events;
create policy knot_events_anon_public_read on public.knot_events for select to anon
using (visibility = 'public' and status in ('published','changed','stale','cancelled','ended'));
create policy knot_events_auth_read on public.knot_events for select to authenticated
using ((visibility = 'public' and status in ('published','changed','stale','cancelled','ended')) or public.knot_can_manage_event(id));

create or replace function public.knot_get_event(p_event_id text)
returns public.knot_events language plpgsql stable security definer set search_path = public,pg_temp as $$
declare v_event public.knot_events;
begin
  if p_event_id is null or char_length(p_event_id) > 180 then raise exception 'KNOT_INVALID_EVENT_ID' using errcode = 'P0001'; end if;
  select * into v_event from public.knot_events e
    where (e.id = p_event_id or e.slug = p_event_id)
      and e.visibility in ('public','unlisted') and e.status in ('published','changed','stale','cancelled','ended') limit 1;
  if v_event.id is null and auth.uid() is not null then
    select * into v_event from public.knot_events e where (e.id = p_event_id or e.slug = p_event_id) and public.knot_can_manage_event(e.id) limit 1;
  end if;
  if v_event.id is null then raise exception 'KNOT_EVENT_NOT_FOUND' using errcode = 'P0002'; end if;
  return v_event;
end;
$$;
revoke all on function public.knot_get_event(text) from public;
grant execute on function public.knot_get_event(text) to anon,authenticated;
