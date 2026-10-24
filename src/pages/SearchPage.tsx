import { List, Map, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { EventCard } from '../components/EventCard';
import { FilterBar } from '../components/FilterBar';
import { LoadingButton } from '../components/LoadingButton';
import { LocalityMap } from '../components/LocalityMap';
import { LocationControls } from '../components/LocationControls';
import { ageBandLabel } from '../domain/age';
import { defaultFilters } from '../domain/defaults';
import { filterEvents, sortEvents } from '../domain/events';
import { localityById } from '../domain/localities';
import { useApp } from '../state/AppContext';
import type { AgeBand, EventFilters } from '../domain/types';

const validAgeBands: AgeBand[] = ['under_13', '13_15', '16_17', '18_plus'];

export function SearchPage() {
  const { data, filters, setFilters, currentUser } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<'list' | 'map'>(searchParams.get('view') === 'map' ? 'map' : 'list');
  const [initialized, setInitialized] = useState(false);
  const [guestAge, setGuestAge] = useState<AgeBand | null>(() => {
    const value = window.localStorage.getItem('knot.guest.ageBand');
    return validAgeBands.includes(value as AgeBand) ? value as AgeBand : null;
  });
  const activeAge = currentUser?.ageBand ?? guestAge;

  useEffect(() => {
    const patch: Partial<EventFilters> = {};
    if (searchParams.get('q')) patch.query = searchParams.get('q')!;
    if (searchParams.get('type')) patch.eventType = searchParams.get('type') as EventFilters['eventType'];
    if (searchParams.get('mode')) patch.mode = searchParams.get('mode') as EventFilters['mode'];
    if (searchParams.get('time')) patch.time = searchParams.get('time') as EventFilters['time'];
    if (searchParams.get('sort')) patch.sort = searchParams.get('sort') as EventFilters['sort'];
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
    if (view === 'map') params.set('view', 'map');
    if (filters.onlyJoinable) params.set('age', 'joinable');
    setSearchParams(params, { replace: true });
  }, [filters, view, initialized, setSearchParams]);

  const events = useMemo(() => sortEvents(filterEvents(data.events, filters), filters, currentUser), [data.events, filters, currentUser]);
  const locality = localityById(filters.localityId);

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
      <div className="results-heading"><div><strong>{events.length} event{events.length === 1 ? '' : 's'}</strong><span>{locality ? ` around ${locality.name}` : ''}{filters.mode !== 'online' ? ` · ${filters.radiusKm} km radius` : ''}</span></div><span>Ended and cancelled events are excluded</span></div>
      {events.length === 0 ? <EmptyState onReset={() => setFilters(defaultFilters())} /> : view === 'map' ? <LocalityMap events={events} origin={locality} /> : <div className="event-grid event-grid--search">{events.map((event) => <EventCard key={event.id} event={event} />)}</div>}
    </div>
  );
}
