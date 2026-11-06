import { ArrowRight, CalendarClock, CheckCircle2, Compass, MapPin, Search, ShieldCheck, Sparkles, Users, Video } from 'lucide-react';
import { lazy, Suspense, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EventCard } from '../components/EventCard';
import { FilterBar } from '../components/FilterBar';
import { LocationControls } from '../components/LocationControls';
import { Logo } from '../components/Logo';
import { filterEvents, formatEventDate, sortEvents } from '../domain/events';
import { localityById } from '../domain/localities';
import { useApp } from '../state/AppContext';
import type { KnotEvent } from '../domain/types';
import { hackathonsEnabled } from '../features/hackathons/flag';
import { listHackathons } from '../features/hackathons/api';
import type { Hackathon } from '../features/hackathons/types';
import { LIVE_VERIFIED_HACKATHONS } from '../features/hackathons/liveSeed';
import { communitiesFromEvents } from '../domain/communities';
import { CommunityCard } from '../components/CommunityCard';
import { CategoryRibbon } from '../components/CategoryRibbon';

const HomeHackathons = lazy(() => import('../features/hackathons/HomeHackathons').then((module) => ({ default: module.HomeHackathons })));

export function HomePage() {
  const { data, filters, setFilters, currentUser } = useApp();
  const [heroQuery, setHeroQuery] = useState('');
  const [liveHackathons, setLiveHackathons] = useState<Hackathon[]>(hackathonsEnabled ? LIVE_VERIFIED_HACKATHONS.slice(0, 6) : []);
  const [heroTab, setHeroTab] = useState<'live' | 'local'>('live');
  const navigate = useNavigate();
  const locality = localityById(filters.localityId);

  useEffect(() => {
    if (!hackathonsEnabled) return;
    const controller = new AbortController();
    listHackathons({ limit: 6, sort: 'soonest' }, controller.signal)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          setLiveHackathons(res.data);
        } else {
          import('../features/hackathons/liveSeed').then(({ LIVE_VERIFIED_HACKATHONS }) => {
            if (!controller.signal.aborted) setLiveHackathons(LIVE_VERIFIED_HACKATHONS.slice(0, 6));
          });
        }
      })
      .catch(() => {
        import('../features/hackathons/liveSeed').then(({ LIVE_VERIFIED_HACKATHONS }) => {
          if (!controller.signal.aborted) setLiveHackathons(LIVE_VERIFIED_HACKATHONS.slice(0, 6));
        });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (currentUser?.areaLocalityId && filters.localityId === 'koramangala' && currentUser.areaLocalityId !== 'koramangala') {
      setFilters({ ...filters, localityId: currentUser.areaLocalityId });
    }
  // Only apply the profile area as the initial discovery default.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const publicEvents = useMemo(() => {
    const real = data.events.filter((e) => !e.isSample);
    return real.length > 0 ? real : data.events;
  }, [data.events]);

  const upcoming = useMemo(() => sortEvents(filterEvents(publicEvents, { ...filters, time: 'next7', sort: 'soonest' }), filters, currentUser), [publicEvents, filters, currentUser]);
  const closing = useMemo(() => sortEvents(filterEvents(publicEvents, { ...filters, time: 'any', sort: 'closing' }).filter((event) => {
    if (!event.registrationDeadline) return false;
    const remaining = new Date(event.registrationDeadline).getTime() - Date.now();
    return remaining > 0 && remaining <= 72 * 3_600_000;
  }), { ...filters, sort: 'closing' }, currentUser), [publicEvents, filters, currentUser]);
  const online = useMemo(() => sortEvents(filterEvents(publicEvents, { ...filters, mode: 'online', time: 'any', sort: 'soonest' }).filter((event) => new Date(event.startAt).getTime() - Date.now() <= 14 * 86_400_000), filters, currentUser), [publicEvents, filters, currentUser]);
  const fresh = useMemo(() => sortEvents(filterEvents(publicEvents, { ...filters, time: 'any' }).filter((event) => Date.now() - new Date(event.firstDiscoveredAt).getTime() <= 7 * 86_400_000), { ...filters, sort: 'newest' }, currentUser), [publicEvents, filters, currentUser]);
  const personalized = currentUser ? sortEvents(filterEvents(publicEvents, { ...filters, time: 'any', sort: 'best_fit' }).filter((event) => event.interests.some((interest) => currentUser.interests.includes(interest))), { ...filters, sort: 'best_fit' }, currentUser) : [];
  const workshops = useMemo(() => sortEvents(publicEvents.filter((e) => e.eventType === 'workshop'), filters, currentUser), [publicEvents, filters, currentUser]);
  const meetups = useMemo(() => sortEvents(publicEvents.filter((e) => e.eventType === 'meetup'), filters, currentUser), [publicEvents, filters, currentUser]);
  const summitsAndConfs = useMemo(() => sortEvents(publicEvents.filter((e) => e.eventType === 'summit' || e.eventType === 'conference'), filters, currentUser), [publicEvents, filters, currentUser]);
  const communities = useMemo(() => {
    const list = communitiesFromEvents(data.events.filter((event) => (event.visibility ?? 'public') === 'public'));
    const real = list.filter((c) => !c.isSample);
    return real.length > 0 ? real : list;
  }, [data.events]);

  const search = (event: FormEvent) => {
    event.preventDefault();
    setFilters({ ...filters, query: heroQuery });
    navigate('/search');
  };

  const section = (title: string, eyebrow: string, events: KnotEvent[], link = '/search') => events.length > 0 && (
    <section className="home-section">
      <div className="section-heading"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div><Link to={link}>See all <ArrowRight size={16} /></Link></div>
      <div className="event-grid">{events.slice(0, 3).map((event) => <EventCard key={event.id} event={event} />)}</div>
    </section>
  );

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero__glow hero__glow--one" /><div className="hero__glow hero__glow--two" />
        <div className="hero__content">
          <div className="hero__copy">
            <div className="hero__kicker"><span><Sparkles size={14} /></span> Your city. Your interests. Your people.</div>
            <h1>Find events that fit<br /><em>your life.</em></h1>
            <p>Discover what’s happening nearby, know whether you can join, and turn one event into a community you return to.</p>
            <form className="hero-search" onSubmit={search}>
              <Search size={21} />
              <input value={heroQuery} onChange={(event) => setHeroQuery(event.target.value)} placeholder="Try “AI”, “design” or “this weekend”" aria-label="Search for events" />
              <button className="button button--accent" type="submit">Explore <ArrowRight size={17} /></button>
            </form>
            <div className="hero-quick-links"><span>Popular:</span><Link to={hackathonsEnabled ? '/hackathons' : '/search?type=hackathon'}>Hackathons</Link><Link to="/search?time=weekend">This weekend</Link><Link to="/search?mode=online">Online</Link></div>
          </div>
          <div className="hero-panel">
            <div className="hero-panel__header">
              <div>
                <span className="live-dot" />
                {heroTab === 'live' && liveHackathons.length > 0 ? 'Live Discovered Events' : 'Happening near you'}
              </div>
              {hackathonsEnabled && liveHackathons.length > 0 ? (
                <div className="hero-panel__tabs">
                  <button
                    type="button"
                    className={`hero-tab-btn ${heroTab === 'live' ? 'active' : ''}`}
                    onClick={() => setHeroTab('live')}
                  >
                    Live Agent ({liveHackathons.length})
                  </button>
                  <button
                    type="button"
                    className={`hero-tab-btn ${heroTab === 'local' ? 'active' : ''}`}
                    onClick={() => setHeroTab('local')}
                  >
                    {locality?.name ?? 'Local'}
                  </button>
                </div>
              ) : (
                <span>{locality?.name}</span>
              )}
            </div>
            <div className="hero-panel__event-stack">
              {heroTab === 'live' && liveHackathons.length > 0 ? (
                liveHackathons.slice(0, 3).map((hackathon, index) => (
                  <a
                    href={hackathon.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`hero-mini-event hero-mini-event--${index + 1}`}
                    key={hackathon.id}
                    title={`Register on official site: ${hackathon.officialUrl}`}
                  >
                    <div className="hero-mini-event__date">
                      <strong>{new Intl.DateTimeFormat('en-IN', { day: '2-digit' }).format(new Date(hackathon.startDate))}</strong>
                      <span>{new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date(hackathon.startDate))}</span>
                    </div>
                    <div>
                      <strong>{hackathon.title}</strong>
                      <span>
                        <span style={{ color: '#4ade80', fontWeight: 700 }}>● Live</span> · {hackathon.sourcePlatform} · {hackathon.city || (hackathon.mode === 'online' ? 'Online' : 'Nationwide')} · {hackathon.isFree ? 'FREE' : hackathon.priceAmount ? `₹${hackathon.priceAmount}` : 'Free/Open'}
                      </span>
                    </div>
                    <ArrowRight size={17} />
                  </a>
                ))
              ) : (
                <>
                  {upcoming.slice(0, 3).map((event, index) => (
                    <Link to={`/events/${event.id}`} className={`hero-mini-event hero-mini-event--${index + 1}`} key={event.id}>
                      <div className="hero-mini-event__date">
                        <strong>{new Intl.DateTimeFormat('en-IN', { day: '2-digit' }).format(new Date(event.startAt))}</strong>
                        <span>{new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date(event.startAt))}</span>
                      </div>
                      <div>
                        <strong>{event.title}</strong>
                        <span>{event.mode === 'online' ? 'Online' : event.venue?.name.replace('Sample venue · ', '')} · {formatEventDate(event.startAt).split(',').slice(-2).join(',')}</span>
                      </div>
                      <ArrowRight size={17} />
                    </Link>
                  ))}
                  {upcoming.length === 0 && <div className="hero-panel__empty">No nearby events in this view. Try a wider radius or browse online.</div>}
                </>
              )}
            </div>
            {heroTab === 'live' && liveHackathons.length > 0 ? (
              <Link to="/hackathons" className="hero-panel__footer">
                Explore all {liveHackathons.length} live hackathons <Compass size={17} />
              </Link>
            ) : (
              <Link to="/search" className="hero-panel__footer">
                Open your local event guide <Compass size={17} />
              </Link>
            )}
            <div className="hero-panel__floating">
              <Users size={17} />
              <span>
                <strong>{heroTab === 'live' && liveHackathons.length > 0 ? 'Verified Real-Time Registrations' : 'Participation, not just listings'}</strong>
                {heroTab === 'live' && liveHackathons.length > 0 ? 'Autonomous agent · direct organizer links' : 'Eligibility · skills · teams · age'}
              </span>
            </div>
          </div>
        </div>
        <div className="hero__location"><LocationControls light /></div>
      </section>

      <section className="trust-strip">
        <div><MapPin size={19} /><span><strong>40 Bengaluru localities + 13 city anchors</strong>Neighbourhood and clearly labelled city-level discovery</span></div>
        <div><ShieldCheck size={19} /><span><strong>Source-linked details</strong>Freshness and original listings</span></div>
        <div><CheckCircle2 size={19} /><span><strong>Browse without an account</strong>Sign in only when you act</span></div>
      </section>

      <div className="home-content">
        <CategoryRibbon className="home-category-ribbon" />
        <FilterBar />
        {hackathonsEnabled && <Suspense fallback={null}><HomeHackathons /></Suspense>}
        {section('Happening soon near you', `Within ${filters.radiusKm} km of ${locality?.name ?? 'you'}`, upcoming)}
        {workshops.length > 0 && section('Hands-on Workshops & Masterclasses', 'Build practical skills with real engineers', workshops, '/search?type=workshop')}
        {meetups.length > 0 && section('Tech Meetups & Builder Circles', 'Neighborhood coffee, code & conversations', meetups, '/search?type=meetup')}
        {summitsAndConfs.length > 0 && section('Conferences & Leadership Summits', 'Keynotes, executive panels & annual gatherings', summitsAndConfs, '/search?type=summit')}
        {section('Registration closing soon', 'Decide before the door closes', closing, '/search?sort=closing')}
        {currentUser && personalized.length > 0 && section(`Because you like ${currentUser.interests[0] ?? 'these topics'}`, 'Shaped by your explicit interests', personalized, '/search?sort=best_fit')}
        {section('New to Knot this week', 'Freshly discovered and published', fresh, '/search?sort=newest')}

        {online.length > 0 && <section className="online-section">
          <div className="section-heading"><div><span className="eyebrow"><Video size={14} /> Join from anywhere</span><h2>Online, but still worth showing up for</h2></div><Link to="/search?mode=online">Explore online <ArrowRight size={16} /></Link></div>
          <div className="event-grid">{online.slice(0, 3).map((event) => <EventCard key={event.id} event={event} />)}</div>
        </section>}

        {communities.length > 0 && (
          <section className="home-section communities-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow"><Users size={14} /> People worth returning to</span>
                <h2>Active communities</h2>
              </div>
              <Link to="/communities">
                Explore all communities <ArrowRight size={16} />
              </Link>
            </div>
            <div className="community-grid">
              {communities.slice(0, 3).map((item) => (
                <CommunityCard key={item.id} community={item} />
              ))}
            </div>
          </section>
        )}

        <section className="how-section">
          <div className="section-heading"><div><span className="eyebrow">One connected journey</span><h2>From “maybe interested” to “see you there”</h2></div></div>
          <div className="how-grid">
            <div><span className="step-number">01</span><Compass /><h3>Discover with context</h3><p>Location, interests, skills, source freshness and age rules come together—not in separate tabs.</p></div>
            <div><span className="step-number">02</span><CalendarClock /><h3>Participate with confidence</h3><p>Sign in when you act, check the rules, register externally or natively, and keep the plan current.</p></div>
            <div><span className="step-number">03</span><Users /><h3>Return to your people</h3><p>Follow communities, track what changed, and find the next event worth showing up for.</p></div>
          </div>
        </section>

        <section className="organizer-cta">
          <div><span className="eyebrow">For clubs, colleges and communities</span><h2>Your next event deserves the right room.</h2><p>Publish in minutes, add the details participants actually need, and keep everyone informed when plans change.</p><div className="button-row"><Link to="/publish" className="button button--accent">Publish or host <ArrowRight size={17} /></Link><Link to="/add" className="button button--ghost-light">Add from a message</Link></div></div>
          <div className="organizer-cta__card"><Logo inverse /><span>Quick Post</span><strong>Details people can act on.</strong><ul><li>Seven required field groups</li><li>Age and eligibility rules</li><li>External or Knot registration</li><li>Material-change alerts</li></ul></div>
        </section>
      </div>
    </div>
  );
}
