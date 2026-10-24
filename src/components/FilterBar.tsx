import { Search, SlidersHorizontal } from 'lucide-react';
import { INTERESTS, SKILLS } from '../domain/interests';
import { useApp } from '../state/AppContext';
import type { EventFilters } from '../domain/types';

const timeOptions: { value: EventFilters['time']; label: string }[] = [
  { value: 'any', label: 'Any time' }, { value: 'today', label: 'Today' },
  { value: 'tonight', label: 'Tonight' }, { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'weekend', label: 'This weekend' }, { value: 'next7', label: 'Next 7 days' }, { value: 'custom', label: 'Custom dates' },
];

export function FilterBar({ detailed = false }: { detailed?: boolean }) {
  const { data, filters, setFilters } = useApp();
  const sources = [...new Set(data.events.flatMap((event) => event.listings.map((listing) => listing.source)))].sort();
  const patch = (value: Partial<EventFilters>) => setFilters({ ...filters, ...value });
  return (
    <div className="filter-bar">
      <label className="search-input">
        <Search size={19} />
        <input value={filters.query} onChange={(event) => patch({ query: event.target.value })} placeholder="Search events, skills or organizers" aria-label="Search events" />
      </label>
      <div className="time-chips" aria-label="Filter by time">
        {timeOptions.map((option) => <button key={option.value} className={filters.time === option.value ? 'chip chip--active' : 'chip'} onClick={() => patch({ time: option.value })}>{option.label}</button>)}
      </div>
      {detailed && filters.time === 'custom' && <div className="custom-date-filter"><label>From date<input type="date" value={filters.customFrom ?? ''} onChange={(event) => patch({ customFrom: event.target.value })} /></label><label>To date<input type="date" value={filters.customTo ?? ''} onChange={(event) => patch({ customTo: event.target.value })} /></label><span>Events overlapping the selected dates are included.</span></div>}
      {detailed && <div className="filter-grid">
        <label><span><SlidersHorizontal size={14} /> Event type</span>
          <select value={filters.eventType} onChange={(event) => patch({ eventType: event.target.value as EventFilters['eventType'] })}>
            <option value="all">All event types</option><option value="hackathon">Hackathons</option><option value="workshop">Workshops</option>
            <option value="meetup">Meetups</option><option value="conference">Conferences</option><option value="summit">Summits</option>
            <option value="competition">Competitions</option><option value="webinar">Webinars</option><option value="community_session">Community sessions</option>
          </select>
        </label>
        <label><span>Mode</span>
          <select value={filters.mode} onChange={(event) => patch({ mode: event.target.value as EventFilters['mode'] })}>
            <option value="all">Online + in person</option><option value="in_person">In person</option><option value="online">Online</option><option value="hybrid">Hybrid</option>
          </select>
        </label>
        <label><span>Interest</span>
          <select value={filters.interest} onChange={(event) => patch({ interest: event.target.value })}>
            <option value="">All interests</option>{INTERESTS.map((interest) => <option key={interest}>{interest}</option>)}
          </select>
        </label>
        <label><span>Skill</span>
          <select value={filters.skill} onChange={(event) => patch({ skill: event.target.value })}>
            <option value="">All skills</option>{SKILLS.map((skill) => <option key={skill}>{skill}</option>)}
          </select>
        </label>
        <label><span>Age rule</span>
          <select value={filters.ageRule} onChange={(event) => patch({ ageRule: event.target.value as EventFilters['ageRule'] })}>
            <option value="all">Any age rule</option><option value="all_ages">All ages</option><option value="13_plus">13+</option>
            <option value="16_plus">16+</option><option value="18_plus">18+</option><option value="under_18">Under 18 only</option><option value="not_stated">Age not stated</option>
          </select>
        </label>
        <label><span>Price</span><select value={filters.price ?? 'all'} onChange={(event) => patch({ price: event.target.value as EventFilters['price'] })}><option value="all">Any price</option><option value="free">Free</option><option value="paid">Paid</option><option value="unknown">Price not stated</option></select></label>
        <label><span>Team format</span><select value={filters.team ?? 'all'} onChange={(event) => patch({ team: event.target.value as EventFilters['team'] })}><option value="all">Any team format</option><option value="solo">Solo</option><option value="team">Team</option><option value="solo_or_team">Solo or team</option><option value="not_stated">Not stated</option></select></label>
        <label><span>Source</span><select value={filters.source ?? ''} onChange={(event) => patch({ source: event.target.value })}><option value="">All sources</option>{sources.map((source) => <option value={source} key={source}>{source}</option>)}</select></label>
        <label><span>Travel estimate</span><select value={filters.maxTravelMinutes ?? ''} onChange={(event) => patch({ maxTravelMinutes: event.target.value ? Number(event.target.value) : null })}><option value="">Any travel time</option><option value="30">Up to 30 minutes</option><option value="60">Up to 60 minutes</option><option value="90">Up to 90 minutes</option></select><small>Rough estimate, not live traffic</small></label>
        <label><span>Sort by</span>
          <select value={filters.sort} onChange={(event) => patch({ sort: event.target.value as EventFilters['sort'] })}>
            <option value="soonest">Soonest near you</option><option value="best_fit">Best fit</option><option value="closing">Registration closing</option>
            <option value="nearest">Nearest</option><option value="newest">New this week</option>
          </select>
        </label>
      </div>}
    </div>
  );
}
