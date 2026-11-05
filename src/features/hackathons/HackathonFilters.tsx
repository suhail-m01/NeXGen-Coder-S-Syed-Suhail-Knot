import { LocateFixed, RotateCcw, Search } from 'lucide-react';
import { useMemo } from 'react';
import { hackathonLocationOptions, parseHackathonLocation } from './location';
import type { HackathonFilters as Filters, HackathonListResponse } from './types';

export type DatePreset = 'any' | 'today' | 'weekend' | 'month' | 'custom';

interface HackathonFiltersProps {
  value: Filters;
  locationText: string;
  datePreset: DatePreset;
  facets: HackathonListResponse['facets'];
  locationStatus: string;
  onChange: (patch: Partial<Filters>) => void;
  onLocationTextChange: (value: string) => void;
  onDatePresetChange: (preset: DatePreset) => void;
  onUseLocation: () => void;
  onReset: () => void;
}

export function HackathonFilters({ value, locationText, datePreset, facets, locationStatus, onChange, onLocationTextChange, onDatePresetChange, onUseLocation, onReset }: HackathonFiltersProps) {
  const options = useMemo(() => hackathonLocationOptions(facets.locations), [facets]);
  return (
    <form className="hackathon-filters" onSubmit={(event) => event.preventDefault()} aria-label="Filter hackathons">
      <div className="hackathon-filters__row hackathon-filters__row--primary">
        <label className="hackathon-filter-location"><span>Location autocomplete</span><div><Search size={16} /><input list="hackathon-location-options" value={locationText} onChange={(event) => onLocationTextChange(event.target.value)} placeholder="City or neighbourhood" aria-label="Filter by city or neighbourhood" /></div><datalist id="hackathon-location-options">{options.map((option) => <option key={option.label} value={option.label} />)}</datalist></label>
        <button type="button" className="button button--secondary hackathon-location-button" onClick={onUseLocation}><LocateFixed size={16} /> Use my location</button>
        <label><span>Search</span><input value={value.q} onChange={(event) => onChange({ q: event.target.value, sort: event.target.value ? 'relevance' : value.sort, page: 1 })} placeholder="AI, design, climate…" aria-label="Search hackathons" /></label>
      </div>
      {locationStatus && <p className="hackathon-filter-status" role="status">{locationStatus}</p>}
      <div className="hackathon-filters__row hackathon-filters__row--secondary">
        <label><span>Date range</span><select aria-label="Date range" value={datePreset} onChange={(event) => onDatePresetChange(event.target.value as DatePreset)}><option value="any">Any upcoming date</option><option value="today">Today</option><option value="weekend">This weekend</option><option value="month">This month</option><option value="custom">Custom range</option></select></label>
        <label><span>Mode</span><select aria-label="Mode" value={value.mode} onChange={(event) => onChange({ mode: event.target.value as Filters['mode'], page: 1 })}><option value="all">All modes</option><option value="online">Online</option><option value="offline">In person</option><option value="hybrid">Hybrid</option></select></label>
        <label><span>Sort</span><select aria-label="Sort" value={value.sort} onChange={(event) => onChange({ sort: event.target.value as Filters['sort'], page: 1 })}><option value="soonest">Soonest first</option><option value="relevance">Relevance</option><option value="latest">Latest start</option></select></label>
        <fieldset><legend>Price</legend><div className="hackathon-price-options">{(['all', 'free', 'paid'] as const).map((price) => <button key={price} type="button" className={value.price === price ? 'selected' : ''} aria-pressed={value.price === price} onClick={() => onChange({ price, page: 1 })}>{price === 'all' ? 'All prices' : price === 'free' ? 'Free' : 'Paid'}</button>)}</div></fieldset>
      </div>
      {datePreset === 'custom' && <div className="hackathon-filters__custom-dates"><label><span>From</span><input type="date" value={value.from.slice(0, 10)} onChange={(event) => onChange({ from: event.target.value, page: 1 })} /></label><label><span>To</span><input type="date" value={value.to.slice(0, 10)} onChange={(event) => onChange({ to: event.target.value, page: 1 })} /></label></div>}
      <div className="hackathon-filters__footer"><p>Upcoming and ongoing listings · unknown prices stay visible under All prices</p><button type="button" className="text-button" onClick={onReset}><RotateCcw size={14} /> Reset filters</button></div>
    </form>
  );
}

export { parseHackathonLocation };
