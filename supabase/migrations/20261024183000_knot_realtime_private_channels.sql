-- Receive-only authorization for the exact per-user Postgres-changes topic.
-- Table RLS independently determines which rows Realtime may deliver.
drop policy if exists knot_realtime_own_private_topic on realtime.messages;
create policy knot_realtime_own_private_topic
on realtime.messages for select to authenticated
using ((select realtime.topic()) = 'knot-private-' || (select auth.uid())::text);
comment on policy knot_realtime_own_private_topic on realtime.messages is
  'Allows an authenticated user to join only their Knot private topic; no client broadcast insert grant.';
