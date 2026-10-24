-- pgcrypto digest requires bytea on this project; hash explicit UTF-8 bytes.
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
    definition := replace(definition,'digest(p_key,''sha256'')','digest(convert_to(p_key,''UTF8''),''sha256'')');
    definition := replace(definition,'digest(p_session_key,''sha256'')','digest(convert_to(p_session_key,''UTF8''),''sha256'')');
    execute definition;
  end loop;
end;
$migrate$;
revoke all on function public.knot_consume_rate_limit(text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.knot_consume_rate_limit(text,text,integer,integer) to service_role;
revoke all on function public.knot_record_referral_visit(text,text) from public;
grant execute on function public.knot_record_referral_visit(text,text) to anon,authenticated;
