import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { localityById } from '../../domain/localities';
import type { AgeBand, EventFilters } from '../../domain/types';
import { isCloudProvider } from './client';
import {
  cloudDiscoveryFilterPayload,
  cloudSearchEvents,
  type CloudDiscoveryItem,
  type CloudDiscoveryPage,
  type DiscoveryCursor,
} from './discovery';
import { subscribeCloudCatalog, type CloudRealtimeStatus } from './realtime';

const EMPTY_PAGE: CloudDiscoveryPage = { items: [], events: [], total: 0, hasMore: false, nextCursor: null, pageSize: 24 };

interface CloudSearchState extends CloudDiscoveryPage {
  loading: boolean;
  loadingMore: boolean;
  error: string;
}

const initialState: CloudSearchState = { ...EMPTY_PAGE, loading: false, loadingMore: false, error: '' };

/** Server-keyset discovery with stale-response protection and bounded accumulation. */
export function useCloudDiscovery(filters: EventFilters, activeAge: AgeBand | null) {
  const [state, setState] = useState<CloudSearchState>(initialState);
  const [revision, setRevision] = useState(0);
  const [realtimeStatus, setRealtimeStatus] = useState<CloudRealtimeStatus>('connecting');
  const requestSequence = useRef(0);
  const queryKeyRef = useRef('');
  const origin = localityById(filters.localityId);
  const effectiveFilters = useMemo(() => ({ ...filters, ageBand: activeAge }), [filters, activeAge]);
  const payload = useMemo(() => cloudDiscoveryFilterPayload(effectiveFilters, origin), [effectiveFilters, origin]);
  const queryKey = useMemo(() => JSON.stringify(payload), [payload]);
  queryKeyRef.current = queryKey;

  useEffect(() => {
    if (!isCloudProvider) return;
    let active = true;
    const sequence = ++requestSequence.current;
    setState({ ...EMPTY_PAGE, loading: true, loadingMore: false, error: '' });
    const timer = window.setTimeout(() => {
      cloudSearchEvents(effectiveFilters, origin, null, EMPTY_PAGE.pageSize)
        .then((page) => {
          if (!active || sequence !== requestSequence.current || queryKeyRef.current !== queryKey) return;
          setState({ ...page, loading: false, loadingMore: false, error: '' });
        })
        .catch((reason: unknown) => {
          if (!active || sequence !== requestSequence.current || queryKeyRef.current !== queryKey) return;
          setState({ ...EMPTY_PAGE, loading: false, loadingMore: false, error: reason instanceof Error ? reason.message : 'Cloud discovery failed.' });
        });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [effectiveFilters, origin, queryKey, revision]);

  useEffect(() => {
    if (!isCloudProvider) return;
    let timer = 0;
    const unsubscribe = subscribeCloudCatalog(() => {
      window.clearTimeout(timer);
      // Re-run from the first cursor: sorted pages must not be patched arbitrarily.
      timer = window.setTimeout(() => setRevision((value) => value + 1), 400);
    }, setRealtimeStatus);
    return () => { window.clearTimeout(timer); unsubscribe(); };
  }, []);

  const loadMore = useCallback(async () => {
    if (!isCloudProvider || state.loading || state.loadingMore || !state.hasMore || !state.nextCursor) return;
    const sequence = ++requestSequence.current;
    const expectedQuery = queryKeyRef.current;
    const cursor: DiscoveryCursor = state.nextCursor;
    setState((previous) => ({ ...previous, loadingMore: true, error: '' }));
    try {
      const page = await cloudSearchEvents(effectiveFilters, origin, cursor, state.pageSize);
      if (sequence !== requestSequence.current || queryKeyRef.current !== expectedQuery) return;
      setState((previous) => {
        const byId = new Map<string, CloudDiscoveryItem>();
        for (const item of [...previous.items, ...page.items]) byId.set(item.event.id, item);
        const items = [...byId.values()];
        return {
          ...page, items, events: items.map((item) => item.event), total: Math.max(previous.total, page.total),
          loading: false, loadingMore: false, error: '',
        };
      });
    } catch (reason) {
      if (sequence !== requestSequence.current || queryKeyRef.current !== expectedQuery) return;
      setState((previous) => ({ ...previous, loadingMore: false, error: reason instanceof Error ? reason.message : 'Could not load the next page.' }));
    }
  }, [effectiveFilters, origin, state.loading, state.loadingMore, state.hasMore, state.nextCursor, state.pageSize]);

  return { ...state, loadMore, realtimeStatus, reload: () => setRevision((value) => value + 1) };
}
