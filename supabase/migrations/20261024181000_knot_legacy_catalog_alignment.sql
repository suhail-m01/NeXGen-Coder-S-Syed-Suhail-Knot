-- Preserve the original demo catalog as unowned, explicitly labelled sample listings.
alter table public.knot_events alter column organizer_id drop not null;

with legacy as (
  select e.*,
    e.id as slug,
    coalesce((select min(s.captured_at) from public.event_sources s where s.event_id = e.id),e.created_at) as discovered_at,
    coalesce((select max(s.captured_at) from public.event_sources s where s.event_id = e.id),e.created_at) as checked_at,
    (select s.url from public.event_sources s where s.event_id = e.id and s.url is not null and (s.label ilike '%registration%' or s.label ilike '%sign-up%') order by s.captured_at desc limit 1) as registration_url
  from public.events e
), prepared as (
  select l.*,
    case when title ilike '%hack%' then 'hackathon' when title ilike '%workshop%' or title ilike '%design systems%' then 'workshop'
      when title ilike '%meetup%' or categories && array['Startups'] then 'meetup' else 'community_session' end as event_type,
    case when categories && array['AI & Tech'] then array['AI/ML'] else '{}'::text[] end
      || case when categories && array['Design'] then array['Design'] else '{}'::text[] end
      || case when categories && array['Startups'] then array['Startups'] else '{}'::text[] end
      || (select coalesce(array_agg(value),'{}'::text[]) from unnest(categories) value where value not in ('AI & Tech','Design','Startups')) as mapped_interests
  from legacy l
)
insert into public.knot_events(
  id,slug,organizer_id,title,status,visibility,starts_at,ends_at,registration_kind,capacity,approval,waitlist_enabled,
  registration_opens_at,registration_deadline,age_mode,min_age,max_age,public_data,created_at,updated_at
)
select p.id,p.slug,null,p.title,case when p.ends_at < now() then 'ended' else 'published' end,'public',p.starts_at,p.ends_at,
  'external',null,'none',false,null,null,'not_stated',null,null,
  jsonb_build_object(
    'id',p.id,'slug',p.slug,'title',p.title,'tagline',left(p.description,100),'summary',left(p.description,180),
    'description',p.long_description,'eventType',p.event_type,'organizerId',null,'organizerName',initcap(replace(p.community_id,'-',' ')),
    'communityId',p.community_id,'mode','in_person','startAt',p.starts_at,'endAt',p.ends_at,'timezone','Asia/Kolkata',
    'registrationOpensAt',null,'registrationDeadline',null,'submissionDeadline',null,
    'status',case when p.ends_at < now() then 'ended' else 'published' end,
    'venue',jsonb_build_object('id','legacy-venue-' || p.id,'name',p.venue,'address',p.venue || ', ' || p.locality,
      'localityId',lower(replace(p.locality,' ','-')),'city','Bengaluru','latitude',p.lat,'longitude',p.lng,
      'locationPrecision','approximate','confirmedBy','unknown'),
    'registration',jsonb_build_object('kind','external','externalUrl',p.registration_url,'capacity',null,'approval','none','waitlistEnabled',false,'questions','[]'::jsonb),
    'ageRule',jsonb_build_object('mode','not_stated','minAge',null,'maxAge',null,'guardianConsentRequired','not_stated',
      'guardianPresentRequired','not_stated','ruleText','','source','unknown','confidence','missing'),
    'interests',p.mapped_interests,'skills','[]'::jsonb,'learningOutcomes','[]'::jsonb,'eligibilityText','','eligibilityKnown',false,
    'experienceLevel','not_stated','team',jsonb_build_object('mode','not_stated','minSize',null,'maxSize',null,'formationDeadline',null),
    'price',jsonb_build_object('kind',case when p.price = 0 then 'free' else 'paid' end,'amountInr',p.price,'note',p.price_label || ' · legacy sample value'),
    'prizes','[]'::jsonb,'nativeSafetyChecklistComplete',false,'visibility','public','seriesId',null,'isSample',true,
    'createdById',null,'createdAt',p.created_at,'updatedAt',p.created_at,'firstDiscoveredAt',p.discovered_at,'lastCheckedAt',p.checked_at,
    'listings',coalesce((select jsonb_agg(jsonb_build_object(
      'id','legacy-listing-' || s.id,'source',s.channel,'externalId',s.id,'originalUrl',coalesce(s.url,'/events/' || p.id),
      'registrationUrl',case when s.label ilike '%registration%' or s.label ilike '%sign-up%' then s.url else null end,
      'firstDiscoveredAt',s.captured_at,'lastCheckedAt',s.captured_at,'lastMeaningfulChangeAt',null,
      'confidence','medium','status','fresh','isPrimary',s.id = (select s2.id from public.event_sources s2 where s2.event_id = p.id and s2.url is not null order by s2.captured_at desc limit 1)
    ) order by s.captured_at) from public.event_sources s where s.event_id = p.id),'[]'::jsonb)
  ),p.created_at,p.created_at
from prepared p
on conflict(id) do nothing;

insert into public.knot_event_private(event_id,online_join_url,participant_data)
select id,null,'{}'::jsonb from public.knot_events on conflict(event_id) do nothing;
