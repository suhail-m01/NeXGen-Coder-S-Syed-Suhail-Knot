import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { localityById } from '../../domain/localities';
import { useApp } from '../../state/AppContext';
import { listHackathons } from './api';
import { hackathonsEnabled } from './flag';
import { formatLastUpdated } from './format';
import { HackathonCard } from './HackathonCard';
import { HackathonSkeleton } from './HackathonSkeleton';
import type { HackathonListResponse } from './types';
import './hackathons.css';

export function HomeHackathons() {
  const { filters } = useApp();
  const locality = localityById(filters.localityId);
  const [result, setResult] = useState<HackathonListResponse | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!hackathonsEnabled) return;
    const controller = new AbortController();
    listHackathons({ city: locality?.city ?? '', area: locality?.geocode.resultType === 'city' ? '' : locality?.name ?? '', limit: 3, sort: 'soonest' }, controller.signal)
      .then(setResult).catch((caught: unknown) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Hackathon discovery is unavailable.'); });
    return () => controller.abort();
  }, [locality?.id, locality?.city, locality?.name, locality?.geocode.resultType]);
  if (!hackathonsEnabled) return null;
  return (
    <section className="home-section home-hackathons" aria-labelledby="home-hackathons-title">
      <div className="section-heading"><div><span className="eyebrow">Build something next</span><h2 id="home-hackathons-title">Hackathons near you</h2></div><Link to="/hackathons">See all <ArrowRight size={16} /></Link></div>
      {!result && !error && <HackathonSkeleton count={3} />}
      {error && <div className="hackathon-home-empty" role="status"><p>Hackathon listings are temporarily unavailable here.</p><Link className="text-button" to="/hackathons">Open hackathon discovery <ArrowRight size={14} /></Link></div>}
      {result && result.data.length > 0 && <div className="hackathon-grid">{result.data.map((hackathon) => <HackathonCard key={hackathon.id} hackathon={hackathon} context="home" compact />)}</div>}
      {result && result.data.length === 0 && <div className="hackathon-home-empty"><p>No current hackathon listings match {locality?.name ?? 'your area'} yet. Explore all cities or Online.</p><Link className="text-button" to="/hackathons">Explore all hackathons <ArrowRight size={14} /></Link></div>}
      <p className="hackathon-last-updated">{formatLastUpdated(result?.meta.lastUpdated ?? null)}</p>
    </section>
  );
}
