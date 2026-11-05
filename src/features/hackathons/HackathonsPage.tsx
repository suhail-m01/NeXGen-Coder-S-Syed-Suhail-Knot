import { AlertCircle, ArrowLeft, ArrowRight, Info } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listHackathons, hackathonQuery } from './api';
import { localDateInputValue, rangeForDatePreset } from './dateUtils';
import { hackathonsEnabled } from './flag';
import { formatLastUpdated } from './format';
import { HackathonCard } from './HackathonCard';
import { HackathonFilters, type DatePreset } from './HackathonFilters';
import { HackathonSkeleton } from './HackathonSkeleton';
import { nearestHackathonCity, hackathonLocationOptions, parseHackathonLocation } from './location';
import { defaultHackathonFilters, type HackathonFilters as Filters, type HackathonListResponse } from './types';
import './hackathons.css';

function filtersFromParams(params: URLSearchParams): { filters: Filters; preset: DatePreset } {
  const mode = params.get('mode');
  const price = params.get('price');
  const sort = params.get('sort');
  const page = Number(params.get('page') ?? '1');
  const filters: Filters = {
    ...defaultHackathonFilters,
    city: params.get('city') ?? '', area: params.get('area') ?? '',
    mode: ['online', 'offline', 'hybrid'].includes(mode ?? '') ? mode as Filters['mode'] : 'all',
    price: ['free', 'paid'].includes(price ?? '') ? price as Filters['price'] : 'all',
    q: params.get('q') ?? '', from: localDateInputValue(params.get('from') ?? ''), to: localDateInputValue(params.get('to') ?? ''),
    sort: ['relevance', 'latest'].includes(sort ?? '') ? sort as Filters['sort'] : 'soonest',
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
  return { filters, preset: filters.from || filters.to ? 'custom' : 'any' };
}

export function HackathonsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = useMemo(() => filtersFromParams(searchParams), []); // Read the shared URL once; subsequent edits replace it below.
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [datePreset, setDatePreset] = useState<DatePreset>(initial.preset);
  const [locationText, setLocationText] = useState(initial.filters.area ? `${initial.filters.area}, ${initial.filters.city}` : initial.filters.city);
  const [result, setResult] = useState<HackathonListResponse | null>(null);
  const [facets, setFacets] = useState<HackathonListResponse['facets']>({ locations: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [locationStatus, setLocationStatus] = useState('');
  const [guestNotice, setGuestNotice] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const requestSequence = useRef(0);

  useEffect(() => {
    if (!hackathonsEnabled) return;
    const query = hackathonQuery(filters);
    if (window.location.search !== query) setSearchParams(query, { replace: true });
  }, [filters, setSearchParams]);

  useEffect(() => {
    if (!hackathonsEnabled) return;
    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = window.setTimeout(() => {
      listHackathons(filters, controller.signal).then((next) => {
        if (sequence !== requestSequence.current) return;
        setResult(next);
        setFacets(next.facets);
      }).catch((caught: unknown) => {
        if (sequence === requestSequence.current && !controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Hackathon discovery is temporarily unavailable.');
      }).finally(() => { if (sequence === requestSequence.current) setLoading(false); });
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [filters, retryNonce]);

  if (!hackathonsEnabled) return null;
  const patch = (next: Partial<Filters>) => setFilters((previous) => ({ ...previous, ...next }));
  const changeLocation = (value: string) => {
    setLocationText(value);
    const parsed = parseHackathonLocation(value, hackathonLocationOptions(facets.locations));
    patch({ city: parsed.city, area: parsed.area, page: 1 });
  };
  const changePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    patch({ ...rangeForDatePreset(preset), page: 1 });
  };
  const reset = () => {
    setFilters({ ...defaultHackathonFilters });
    setLocationText('');
    setDatePreset('any');
    setGuestNotice(false);
    setSavedNotice(false);
  };
  const useMyLocation = () => {
    if (!navigator.geolocation) { setLocationStatus('Geolocation is not available in this browser. Enter a city instead.'); return; }
    setLocationStatus('Finding your nearest supported city…');
    navigator.geolocation.getCurrentPosition((position) => {
      const city = nearestHackathonCity(position.coords.latitude, position.coords.longitude);
      if (!city) { setLocationStatus('No supported city anchor is close enough. Enter a city or choose Online.'); return; }
      setLocationText(city);
      patch({ city, area: '', page: 1 });
      setLocationStatus(`Showing the ${city} city anchor; this is not an exact venue location.`);
    }, () => setLocationStatus('Location permission was not granted. Enter a city instead.'), { enableHighAccuracy: false, timeout: 8_000, maximumAge: 300_000 });
  };

  return (
    <div className="page-container hackathons-page">
      <div className="page-heading"><div><span className="eyebrow">Permissioned discovery · India + Online</span><h1>Hackathons worth building for.</h1><p>Fresh, source-linked hackathon listings with conservative details. An Interested click opens the official site; it is not a registration.</p></div><div className="button-row"><Link className="button button--secondary" to="/hackathons/interests">My Interests</Link><Link className="button button--secondary" to="/search"><ArrowLeft size={16} /> All Knot events</Link></div></div>
      <HackathonFilters value={filters} locationText={locationText} datePreset={datePreset} facets={facets} locationStatus={locationStatus} onChange={patch} onLocationTextChange={changeLocation} onDatePresetChange={changePreset} onUseLocation={useMyLocation} onReset={reset} />
      {guestNotice && <div className="hackathon-notice" role="status"><Info size={17} /><span>You can continue without an account. <Link to="/auth?returnTo=%2Fhackathons">Sign in to keep Interested hackathons in My Interests.</Link></span><button className="icon-button" aria-label="Dismiss sign-in suggestion" onClick={() => setGuestNotice(false)}>×</button></div>}
      {savedNotice && <div className="hackathon-notice" role="status"><Info size={17} /><span>Saved to your local My Interests list for this signed-in browser.</span><button className="icon-button" aria-label="Dismiss saved message" onClick={() => setSavedNotice(false)}>×</button></div>}
      <div className="hackathon-results-heading"><div><h2>{result ? `${result.meta.total} ${result.meta.total === 1 ? 'hackathon' : 'hackathons'}` : 'Hackathons'}</h2><p>{formatLastUpdated(result?.meta.lastUpdated ?? null)}{loading && result ? ' · Updating…' : ''}</p></div>{result && result.meta.total > 0 && <span>Page {result.meta.page} of {Math.max(result.meta.totalPages, 1)}</span>}</div>
      {loading && !result && <HackathonSkeleton />}
      {error && !result && <div className="hackathon-state" role="alert"><AlertCircle size={28} /><h2>We couldn’t load hackathons</h2><p>{error}</p><button className="button button--primary" onClick={() => setRetryNonce((value) => value + 1)}>Try again</button></div>}
      {!loading && result && result.data.length === 0 && <div className="hackathon-state"><Info size={28} /><h2>No hackathons match these filters</h2><p>Try another city, Online, a wider date range, or All prices. If you searched a new city, an authorized future run may discover it.</p><button className="button button--secondary" onClick={reset}>Clear filters</button></div>}
      {result && result.data.length > 0 && <div className="hackathon-grid">{result.data.map((hackathon) => <HackathonCard key={hackathon.id} hackathon={hackathon} onGuestContinue={() => setGuestNotice(true)} onSaved={() => setSavedNotice(true)} />)}</div>}
      {error && result && <div className="hackathon-inline-error" role="alert">{error} Existing results are shown while you retry.</div>}
      {result && result.meta.totalPages > 1 && <nav className="hackathon-pagination" aria-label="Hackathon pages"><button className="button button--secondary" disabled={filters.page <= 1 || loading} onClick={() => patch({ page: filters.page - 1 })}><ArrowLeft size={16} /> Previous</button><span>Page {filters.page} / {result.meta.totalPages}</span><button className="button button--secondary" disabled={filters.page >= result.meta.totalPages || loading} onClick={() => patch({ page: filters.page + 1 })}>Next <ArrowRight size={16} /></button></nav>}
    </div>
  );
}
