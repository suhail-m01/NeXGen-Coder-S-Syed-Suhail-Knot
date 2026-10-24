-- Atomic publishing and truthful external participation records.
create or replace function public.knot_create_event(p_event jsonb,p_private jsonb default '{}'::jsonb)
returns public.knot_events language plpgsql security definer set search_path = public,pg_temp as $$
declare
  v_event public.knot_events;
  v_result public.knot_events;
  v_status text;
  v_visibility text;
  v_join_url text;
  v_participant_data jsonb;
begin
  if auth.uid() is null or not public.knot_is_organizer() then raise exception 'KNOT_ACTIVE_ADULT_ORGANIZER_REQUIRED' using errcode = '42501'; end if;
  if jsonb_typeof(p_event) is distinct from 'object' or jsonb_typeof(p_private) is distinct from 'object' then
    raise exception 'KNOT_INVALID_EVENT_PAYLOAD' using errcode = 'P0001';
  end if;
  v_event := jsonb_populate_record(null::public.knot_events,p_event);
  v_event.organizer_id := auth.uid();
  v_event.created_at := now();
  v_event.updated_at := now();
  v_status := coalesce(v_event.status,'draft');
  v_visibility := coalesce(v_event.visibility,'private');
  if v_event.id is null or char_length(v_event.id) > 160 or v_event.slug is null or char_length(v_event.slug) > 180
    or v_event.title is null or char_length(trim(v_event.title)) < 2 or char_length(v_event.title) > 160
    or v_event.starts_at is null or (v_event.ends_at is not null and v_event.ends_at <= v_event.starts_at)
    or v_status not in ('draft','published') or v_visibility not in ('public','unlisted','private') then
    raise exception 'KNOT_INVALID_EVENT_PAYLOAD' using errcode = 'P0001';
  end if;
  if v_status = 'published' and v_event.starts_at <= now() then raise exception 'KNOT_EVENT_MUST_START_IN_FUTURE' using errcode = 'P0001'; end if;
  v_event.public_data := coalesce(v_event.public_data,'{}'::jsonb) || jsonb_build_object(
    'id',v_event.id,'slug',v_event.slug,'title',v_event.title,'organizerId',auth.uid()::text,'createdById',auth.uid()::text,
    'status',v_status,'visibility',v_visibility,'startAt',v_event.starts_at,'endAt',v_event.ends_at,
    'registrationOpensAt',v_event.registration_opens_at,'registrationDeadline',v_event.registration_deadline,
    'createdAt',v_event.created_at,'updatedAt',v_event.updated_at
  );
  if v_status = 'published' and v_event.registration_kind = 'external'
    and coalesce(v_event.public_data #>> '{registration,externalUrl}','') !~ '^https?://' then
    raise exception 'KNOT_EXTERNAL_REGISTRATION_URL_REQUIRED' using errcode = 'P0001';
  end if;
  v_join_url := nullif(p_private->>'online_join_url','');
  if v_status = 'published' and v_event.registration_kind = 'native' and coalesce(v_event.public_data->>'mode','') = 'online'
    and coalesce(v_join_url,'') !~ '^https?://' then
    raise exception 'KNOT_ONLINE_JOIN_URL_REQUIRED' using errcode = 'P0001';
  end if;
  v_participant_data := coalesce(p_private->'participant_data','{}'::jsonb);
  if jsonb_typeof(v_participant_data) is distinct from 'object' then raise exception 'KNOT_INVALID_PRIVATE_PAYLOAD' using errcode = 'P0001'; end if;

  insert into public.knot_events(
    id,slug,organizer_id,title,status,visibility,starts_at,ends_at,registration_kind,capacity,approval,waitlist_enabled,
    registration_opens_at,registration_deadline,age_mode,min_age,max_age,public_data,created_at,updated_at
  ) values (
    v_event.id,v_event.slug,auth.uid(),v_event.title,'draft','private',v_event.starts_at,v_event.ends_at,v_event.registration_kind,
    v_event.capacity,v_event.approval,coalesce(v_event.waitlist_enabled,false),v_event.registration_opens_at,v_event.registration_deadline,
    v_event.age_mode,v_event.min_age,v_event.max_age,v_event.public_data || jsonb_build_object('status','draft','visibility','private'),v_event.created_at,v_event.updated_at
  );
  insert into public.knot_event_private(event_id,online_join_url,participant_data,updated_at)
    values(v_event.id,v_join_url,v_participant_data,v_event.updated_at);
  update public.knot_events set status = v_status,visibility = v_visibility,
    public_data = v_event.public_data,updated_at = now() where id = v_event.id returning * into v_result;
  perform public.knot_audit('event_created','event',v_event.id,jsonb_build_object('status',v_status,'visibility',v_visibility));
  return v_result;
end;
$$;

create or replace function public.knot_record_external_handoff(
  p_event_id text,p_self_declared_age_rule_met boolean default false,p_referral_campaign_id text default null
) returns public.knot_registrations language plpgsql security definer set search_path = public,pg_temp as $$
declare
  v_event public.knot_events;
  v_profile public.knot_profiles;
  v_result public.knot_registrations;
begin
  if auth.uid() is null then raise exception 'KNOT_AUTH_REQUIRED' using errcode = '42501'; end if;
  select * into v_profile from public.knot_profiles where id = auth.uid();
  if v_profile.id is null or v_profile.account_status <> 'active' or v_profile.age_band <> '18_plus' then
    raise exception 'KNOT_ACTIVE_ADULT_REQUIRED' using errcode = '42501';
  end if;
  select * into v_event from public.knot_events where id = p_event_id;
  if v_event.id is null or v_event.registration_kind <> 'external' or v_event.status not in ('published','changed')
    or v_event.visibility not in ('public','unlisted') then
    raise exception 'KNOT_REGISTRATION_CLOSED' using errcode = 'P0001';
  end if;
  if coalesce(v_event.public_data #>> '{registration,externalUrl}','') !~ '^https?://' then
    raise exception 'KNOT_EXTERNAL_REGISTRATION_URL_REQUIRED' using errcode = 'P0001';
  end if;
  if v_event.registration_opens_at is not null and v_event.registration_opens_at > now() then raise exception 'KNOT_REGISTRATION_NOT_OPEN' using errcode = 'P0001'; end if;
  if v_event.registration_deadline is not null and v_event.registration_deadline <= now() then raise exception 'KNOT_REGISTRATION_CLOSED' using errcode = 'P0001'; end if;
  if v_event.starts_at <= now() then raise exception 'KNOT_REGISTRATION_CLOSED' using errcode = 'P0001'; end if;
  if v_event.age_mode = 'under_18_only' or (v_event.max_age is not null and v_event.max_age < 18) then raise exception 'KNOT_AGE_NOT_ELIGIBLE' using errcode = 'P0001'; end if;
  if v_event.min_age is not null and v_event.min_age > 18 and not p_self_declared_age_rule_met then raise exception 'KNOT_AGE_RULE_CONFIRMATION_REQUIRED' using errcode = 'P0001'; end if;
  if exists(select 1 from public.knot_registrations r where r.event_id = p_event_id and r.user_id = auth.uid() and r.status not in ('cancelled','rejected')) then
    raise exception 'KNOT_DUPLICATE_REGISTRATION' using errcode = 'P0001';
  end if;
  if p_referral_campaign_id is not null and not exists(select 1 from public.knot_referral_campaigns c where c.id = p_referral_campaign_id and c.event_id = p_event_id and c.active) then
    raise exception 'KNOT_INVALID_REFERRAL' using errcode = 'P0001';
  end if;
  insert into public.knot_registrations(event_id,user_id,kind,status,self_declared_age_rule_met,answers,referral_campaign_id,check_in_token)
    values(p_event_id,auth.uid(),'external','opened_externally',p_self_declared_age_rule_met,'{}'::jsonb,nullif(p_referral_campaign_id,''),null)
    returning * into v_result;
  perform public.knot_audit('external_handoff_recorded','registration',v_result.id,jsonb_build_object('event_id',p_event_id,'truth','opened_externally'));
  return v_result;
end;
$$;

create or replace function public.knot_self_confirm_external(p_event_id text)
returns public.knot_registrations language plpgsql security definer set search_path = public,pg_temp as $$
declare v_result public.knot_registrations;
begin
  if auth.uid() is null then raise exception 'KNOT_AUTH_REQUIRED' using errcode = '42501'; end if;
  update public.knot_registrations set status = 'self_confirmed_registered',updated_at = now()
    where event_id = p_event_id and user_id = auth.uid() and kind = 'external' and status = 'opened_externally'
    returning * into v_result;
  if v_result.id is null then raise exception 'KNOT_EXTERNAL_HANDOFF_NOT_FOUND' using errcode = 'P0001'; end if;
  perform public.knot_audit('external_registration_self_confirmed','registration',v_result.id,jsonb_build_object('event_id',p_event_id,'verification','self_reported_only'));
  return v_result;
end;
$$;

revoke all on function public.knot_create_event(jsonb,jsonb) from public,anon;
revoke all on function public.knot_record_external_handoff(text,boolean,text) from public,anon;
revoke all on function public.knot_self_confirm_external(text) from public,anon;
grant execute on function public.knot_create_event(jsonb,jsonb) to authenticated;
grant execute on function public.knot_record_external_handoff(text,boolean,text) to authenticated;
grant execute on function public.knot_self_confirm_external(text) to authenticated;
