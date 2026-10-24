-- Correct the JSON-array text conversion used by the discovery trigger.
create or replace function public.knot_prepare_event_discovery()
returns trigger language plpgsql security invoker set search_path = public,pg_temp as $$
declare v_latitude double precision; v_longitude double precision;
begin
  new.event_type := coalesce(new.public_data->>'eventType','other');
  new.mode := coalesce(new.public_data->>'mode','in_person');
  new.price_kind := coalesce(new.public_data#>>'{price,kind}','unknown');
  new.team_mode := coalesce(new.public_data#>>'{team,mode}','not_stated');
  new.interests := case when jsonb_typeof(new.public_data->'interests') = 'array'
    then coalesce((select array_agg(value) from jsonb_array_elements_text(new.public_data->'interests') value),'{}') else '{}' end;
  new.skills := case when jsonb_typeof(new.public_data->'skills') = 'array'
    then coalesce((select array_agg(value) from jsonb_array_elements_text(new.public_data->'skills') value),'{}') else '{}' end;
  new.search_text := left(concat_ws(' ',new.title,new.public_data->>'summary',new.public_data->>'description',
    new.public_data->>'organizerName',new.event_type,new.public_data->'interests',new.public_data->'skills'),20000);
  new.search_document := to_tsvector('english'::regconfig,coalesce(new.search_text,''));
  new.venue_geog := null;
  if jsonb_typeof(new.public_data->'venue') = 'object'
    and jsonb_typeof(new.public_data#>'{venue,latitude}') = 'number'
    and jsonb_typeof(new.public_data#>'{venue,longitude}') = 'number' then
    begin
      v_latitude := (new.public_data#>>'{venue,latitude}')::double precision;
      v_longitude := (new.public_data#>>'{venue,longitude}')::double precision;
      if v_latitude between -90 and 90 and v_longitude between -180 and 180 then
        new.venue_geog := st_setsrid(st_makepoint(v_longitude,v_latitude),4326)::geography;
      end if;
    exception when others then new.venue_geog := null;
    end;
  end if;
  begin
    new.first_discovered_at := coalesce((new.public_data->>'firstDiscoveredAt')::timestamptz,new.created_at);
  exception when others then new.first_discovered_at := new.created_at;
  end;
  return new;
end;
$$;
update public.knot_events set public_data = public_data;
