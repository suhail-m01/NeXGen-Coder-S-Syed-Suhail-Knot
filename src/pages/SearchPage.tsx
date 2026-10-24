import { List, Map, SlidersHorizontal } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { DiscoveryInsights } from '../components/DiscoveryInsights';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { EventCard } from '../components/EventCard';
import { FilterBar } from '../components/FilterBar';
import { LoadingButton } from '../components/LoadingButton';
import { LocationControls } from '../components/LocationControls';
import { ageBandLabel } from '../domain/age';
import { defaultFilters } from '../domain/defaults';
import { paginateDiscovery } from '../domain/discovery';
import { filterEvents, sortEvents } from '../domain/events';
import { localityById } from '../domain/localities';
import { useApp } from '../state/AppContext';
import { isCloudProvider } from '../data/supabase/client';
import { useCloudDiscovery } from '../data/supabase/useCloudDiscovery';
import type { AgeBand, EventFilters } from '../domain/types';

const LocalityMap = lazy(() => import('../components/LocalityMap').then((module) => ({ default: module.LocalityMap })));
const validAgeBands: AgeBand[] = ['under_13', '13_15', '16_17', '18_plus'];

export function SearchPage() {
  const { data, filters, setFilters, currentUser, saveSearch, deleteSearch, checkSavedSearch } = useApp();
  const [searchName, setSearchName] = useState('');
  const [searchMessage, setSearchMessage] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<'list' | 'map'>(searchParams.get('view') === 'map' ? 'map' : 'list');
  const [initialized, setInitialized] = useState(false);
  const [page, setPage] = useState(1);
  const [guestAge, setGuestAge] = useState<AgeBand | null>(() => {
    const value = window.localStorage.getItem('knot.guest.ageBand');
    return validAgeBands.includes(value as AgeBand) ? value as AgeBand : null;
  });
  const activeAge = currentUser?.ageBand ?? guestAge;
  const cloud = useCloudDiscovery(filters, activeAge);

  useEffect(() => {
    const patch: Partial<EventFilters> = {};
    if (searchParams.get('q')) patch.query = searchParams.get('q')!;
    if (searchParams.get('type')) patch.eventType = searchParams.get('type') as EventFilters['eventType'];
    if (searchParams.get('mode')) patch.mode = searchParams.get('mode') as EventFilters['mode'];
    if (searchParams.get('time')) patch.time = searchParams.get('time') as EventFilters['time'];
    if (searchParams.get('sort')) patch.sort = searchParams.get('sort') as EventFilters['sort'];
    if (searchParams.get('price')) patch.price = searchParams.get('price') as EventFilters['price'];
    if (searchParams.get('source')) patch.source = searchParams.get('source')!;
    if (searchParams.get('team')) patch.team = searchParams.get('team') as EventFilters['team'];
    if (searchParams.get('travel')) patch.maxTravelMinutes = Number(searchParams.get('travel'));
    if (searchParams.get('from')) patch.customFrom = searchParams.get('from')!;
    if (searchParams.get('to')) patch.customTo = searchParams.get('to')!;
    if (searchParams.get('age') === 'joinable' && activeAge) patch.onlyJoinable = true;
    setFilters({ ...filters, ...patch, ageBand: activeAge ?? filters.ageBand });
    setInitialized(true);
  // Read deep links once on entry.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const params = new URLSearchParams();
    if (filters.query) params.set('q', filters.query);
    if (filters.eventType !== 'all') params.set('type', filters.eventType);
    if (filters.mode !== 'all') params.set('mode', filters.mode);
    if (filters.time !== 'any') params.set('time', filters.time);
    if (filters.sort !== 'soonest') params.set('sort', filters.sort);
    if (filters.interest) params.set('interest', filters.interest);
    if (filters.skill) params.set('skill', filters.skill);
    if (filters.localityId) params.set('area', filters.localityId);
    if (filters.radiusKm !== 10) params.set('radius', String(filters.radiusKm));
    if (filters.price && filters.price !== 'all') params.set('price', filters.price);
    if (filters.source) params.set('source', filters.source);
    if (filters.team && filters.team !== 'all') params.set('team', filters.team);
    if (filters.maxTravelMinutes) params.set('travel', String(filters.maxTravelMinutes));
    if (filters.customFrom) params.set('from', filters.customFrom);
    if (filters.customTo) params.set('to', filters.customTo);
    if (view === 'map') params.set('view', 'map');
    if (filters.onlyJoinable) params.set('age', 'joinable');
    setSearchParams(params, { replace: true });
  }, [filters, view, initialized, setSearchParams]);

  const localEvents = useMemo(() => sortEvents(filterEvents(data.events, filters), filters, currentUser), [data.events, filters, currentUser]);
  const resultPage = useMemo(() => paginateDiscovery(localEvents, page), [localEvents, page]);
  const events = isCloudProvider ? cloud.events : localEvents;
  const visibleEvents = isCloudProvider ? cloud.events : resultPage.items;
  const total = isCloudProvider ? cloud.total : localEvents.length;
  const hasMore = isCloudProvider ? cloud.hasMore : resultPage.hasMore;
  const locality = localityById(filters.localityId);

  useEffect(() => { setPage(1); }, [filters]);

  const changeAge = (value: string) => {
    const band = validAgeBands.includes(value as AgeBand) ? value as AgeBand : null;
    setGuestAge(band);
    if (band) window.localStorage.setItem('knot.guest.ageBand', band);
    else window.localStorage.removeItem('knot.guest.ageBand');
    setFilters({ ...filters, ageBand: band, onlyJoinable: false });
  };

  const toggleJoinable = () => {
    if (!activeAge) return;
    setFilters({ ...filters, ageBand: activeAge, onlyJoinable: !filters.onlyJoinable });
  };

  return (
    <div className="page-container search-page">
      <div className="page-heading search-heading">
        <div><span className="eyebrow">Your event guide</span><h1>Discover what’s worth showing up for</h1><p>Public browsing, practical filters, original sources and no login wall.</p></div>
        <div className="view-toggle" aria-label="Results view"><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><List size={17} /> List</button><button className={view === 'map' ? 'active' : ''} onClick={() => setView('map')}><Map size={17} /> Map</button></div>
      </div>
      <LocationControls />
      <FilterBar detailed />
      <DiscoveryInsights />
      <div className="saved-search-bar"><div><label>Save these explicit filters<input value={searchName} onChange={(event) => setSearchName(event.target.value)} placeholder="e.g. Free design events this weekend" /></label><button className="button button--secondary button--small" onClick={() => { try { saveSearch(searchName); setSearchName(''); setSearchMessage('Search saved in this workspace.'); } catch (reason) { setSearchMessage(reason instanceof Error ? reason.message : 'Could not save search.'); } }}>Save search</button></div>{currentUser && data.savedSearches.filter((search) => search.userId === currentUser.id).map((search) => <article key={search.id}><button onClick={() => setFilters(search.filters)}>{search.name}</button><button onClick={() => { try { setSearchMessage(`${checkSavedSearch(search.id)} new matches since the last check.`); } catch (reason) { setSearchMessage(reason instanceof Error ? reason.message : 'Could not check search.'); } }}>Check new</button><button aria-label={`Delete ${search.name}`} onClick={() => deleteSearch(search.id)}>×</button></article>)}{searchMessage && <span role="status">{searchMessage}</span>}</div>
      <div className="join-filter-bar">
        <div><SlidersHorizontal size={17} /><span><strong>Age-aware discovery</strong>Your guest age stays on this device.</span></div>
        {!currentUser && <label>Your age range
          <select value={guestAge ?? ''} onChange={(event) => changeAge(event.target.value)}>
            <option value="">Prefer not to say</option>{validAgeBands.map((band) => <option key={band} value={band}>{ageBandLabel(band)}</option>)}
          </select>
        </label>}
        {currentUser && <span className="account-age">Self-declared: {ageBandLabel(currentUser.ageBand)}</span>}
        <LoadingButton loading={false} className={`button button--small ${filters.onlyJoinable ? 'button--primary' : 'button--secondary'}`} onClick={toggleJoinable} disabled={!activeAge} title={!activeAge ? 'Choose an age range first' : undefined}>Events I can join</LoadingButton>
      </div>
      <div className="results-heading"><div><strong>{total} event{total === 1 ? '' : 's'}</strong><span>{view === 'list' && events.length ? ` · showing ${visibleEvents.length} loaded` : ''}{locality ? ` around ${locality.name}` : ''}{filters.mode !== 'online' ? ` · ${filters.radiusKm} km radius` : ''}</span></div><span>{isCloudProvider ? (cloud.realtimeStatus === 'live' ? 'Live catalog reconciliation connected' : cloud.realtimeStatus === 'connecting' ? 'Connecting live catalog reconciliation…' : 'Live updates unavailable; use Retry after changes') : 'Ended and cancelled events are excluded'}</span></div>
      {isCloudProvider && cloud.error && <div className="cloud-query-status" role="alert"><span>{cloud.error}</span><button className="button button--secondary button--small" onClick={cloud.reload}>Retry</button></div>}
      {isCloudProvider && cloud.loading ? <div className="page-container" role="status">Searching the cloud catalog…</div>
        : total === 0 ? <EmptyState onReset={() => setFilters(defaultFilters())} />
          : view === 'map' ? <Suspense fallback={<div className="page-container" role="status">Loading the interactive map…</div>}><LocalityMap events={events} origin={locality} /></Suspense>
            : <><div className="event-grid event-grid--search">{visibleEvents.map((event) => <EventCard key={event.id} event={event} />)}</div>{hasMore && <div className="pagination-controls"><button className="button button--secondary" disabled={isCloudProvider && cloud.loadingMore} onClick={() => { if (isCloudProvider) void cloud.loadMore(); else setPage((current) => current + 1); }}>{isCloudProvider && cloud.loadingMore ? 'Loading…' : 'Load more events'}</button><span>{isCloudProvider ? `${visibleEvents.length} of ${total} loaded · ${cloud.pageSize} per server page` : `Page ${resultPage.page} · ${resultPage.pageSize} per page`}</span></div>}</>}
    </div>
  );
}
