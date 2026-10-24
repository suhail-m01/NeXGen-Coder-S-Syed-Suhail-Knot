import { getSupabase } from './client';

export type CloudRealtimeStatus = 'connecting' | 'live' | 'unavailable';
type Invalidate = () => void;
type StatusChange = (status: CloudRealtimeStatus) => void;

let channelSequence = 0;

function subscribe(
  topic: string,
  tables: string[],
  privateChannel: boolean,
  onInvalidate: Invalidate,
  onStatus?: StatusChange,
) {
  const supabase = getSupabase();
  let channel = supabase.channel(topic, { config: { private: privateChannel } });
  for (const table of tables) {
    channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, onInvalidate);
  }
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') onStatus?.('live');
    else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') onStatus?.('unavailable');
    else onStatus?.('connecting');
  });
  onStatus?.('connecting');
  return () => { void supabase.removeChannel(channel); };
}

/** Public rows only; event-table RLS still gates every Postgres change payload. */
export function subscribeCloudCatalog(onInvalidate: Invalidate, onStatus?: StatusChange) {
  channelSequence += 1;
  return subscribe(`knot-public-catalog-${channelSequence}`, ['knot_events'], false, onInvalidate, onStatus);
}

/**
 * The exact private topic is authorized by realtime.messages RLS. Private row
 * delivery is independently restricted by each table's SELECT policy.
 */
export function subscribeCloudPrivateState(userId: string, onInvalidate: Invalidate, onStatus?: StatusChange) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    onStatus?.('unavailable');
    return () => undefined;
  }
  return subscribe(
    `knot-private-${userId}`,
    ['knot_profiles', 'knot_registrations', 'knot_saves', 'knot_going', 'knot_saved_searches'],
    true,
    onInvalidate,
    onStatus,
  );
}
