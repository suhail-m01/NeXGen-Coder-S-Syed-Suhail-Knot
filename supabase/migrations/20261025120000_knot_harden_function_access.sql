-- Resolve actionable Security Advisor findings without changing application data.
-- Public read/RPC gateways and intentional permissive read/write policies are unchanged.
begin;

-- The function body uses only schema-qualified auth.uid(), so an empty search path is safe.
alter function public.knot_uid() set search_path = '';

-- These functions are implementation details, not client RPC endpoints.
-- Security-definer callers execute as their owner; postgres/service_role retain access.
revoke execute on function public.knot_audit(text,text,text,jsonb) from public, anon, authenticated;
revoke execute on function public.knot_handle_new_user() from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'knot_uid'
      and exists (
        select 1 from unnest(p.proconfig) as config
        where config like 'search_path=%'
      )
  ) then
    raise exception 'KNOT_UID_SEARCH_PATH_NOT_PINNED';
  end if;

  perform public.knot_uid();

  if has_function_privilege('anon', 'public.knot_audit(text,text,text,jsonb)', 'execute')
    or has_function_privilege('authenticated', 'public.knot_audit(text,text,text,jsonb)', 'execute')
    or has_function_privilege('anon', 'public.knot_handle_new_user()', 'execute')
    or has_function_privilege('authenticated', 'public.knot_handle_new_user()', 'execute') then
    raise exception 'KNOT_INTERNAL_FUNCTION_CLIENT_ACCESS_REMAINS';
  end if;

  if not has_function_privilege('postgres', 'public.knot_audit(text,text,text,jsonb)', 'execute')
    or not has_function_privilege('service_role', 'public.knot_audit(text,text,text,jsonb)', 'execute')
    or not has_function_privilege('postgres', 'public.knot_handle_new_user()', 'execute')
    or not has_function_privilege('service_role', 'public.knot_handle_new_user()', 'execute') then
    raise exception 'KNOT_INTERNAL_FUNCTION_SERVER_ACCESS_LOST';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgfoid = 'public.knot_handle_new_user()'::regprocedure
      and not tgisinternal
  ) then
    raise exception 'KNOT_NEW_USER_TRIGGER_LOST';
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
