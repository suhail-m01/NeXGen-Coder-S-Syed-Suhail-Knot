-- Security-definer search paths intentionally exclude extensions; qualify pgcrypto.
do $migrate$
declare
  target text;
  definition text;
begin
  foreach target in array array[
    'public.knot_consume_rate_limit(text,text,integer,integer)',
    'public.knot_record_referral_visit(text,text)'
  ] loop
    definition := pg_get_functiondef(target::regprocedure);
    definition := replace(definition,'digest(convert_to','extensions.digest(convert_to');
    definition := replace(definition,'digest(p_key,''sha256'')','extensions.digest(p_key,''sha256'')');
    definition := replace(definition,'digest(p_session_key,''sha256'')','extensions.digest(p_session_key,''sha256'')');
    execute definition;
  end loop;
end;
$migrate$;
alter table public.knot_registrations alter column check_in_token set default encode(extensions.gen_random_bytes(24),'hex');
alter table public.knot_referral_campaigns alter column token set default encode(extensions.gen_random_bytes(18),'hex');
revoke all on function public.knot_consume_rate_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.knot_consume_rate_limit(text,text,integer,integer) to service_role;
revoke all on function public.knot_record_referral_visit(text,text) from public;
grant execute on function public.knot_record_referral_visit(text,text) to anon,authenticated;
