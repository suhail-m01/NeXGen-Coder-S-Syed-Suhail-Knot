import { ArrowLeft, Bookmark, Info } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { isCloudProvider } from '../../data/supabase/client';
import { useApp } from '../../state/AppContext';
import { listHackathons, listMyHackathonInterests } from './api';
import { hackathonsEnabled } from './flag';
import { HackathonCard } from './HackathonCard';
import { HackathonSkeleton } from './HackathonSkeleton';
import { localHackathonInterests } from './interestStore';
import type { Hackathon } from './types';
import './hackathons.css';

export function MyHackathonInterestsPage() {
  const { currentUser, cloudStatus } = useApp();
  const [items, setItems] = useState<Hackathon[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!hackathonsEnabled || !currentUser) return;
    const controller = new AbortController();
    setItems(null);
    setError('');
    if (isCloudProvider) {
      listMyHackathonInterests(controller.signal).then(setItems).catch((caught: unknown) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'My Interests is unavailable.'); });
    } else {
      const ids = new Set(localHackathonInterests(currentUser.id));
      listHackathons({ limit: 48, sort: 'latest' }, controller.signal)
        .then((result) => setItems(result.data.filter((hackathon) => ids.has(hackathon.id))))
        .catch((caught: unknown) => { if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Local My Interests could not load the public catalog.'); });
    }
    return () => controller.abort();
  }, [currentUser?.id]);
  if (!hackathonsEnabled) return null;
  if (!currentUser) return <div className="page-container hackathons-page"><div className="hackathon-state"><Bookmark size={28} /><h1>My Interests</h1><p>{cloudStatus === 'loading' ? 'Loading your account…' : 'Sign in to keep track of hackathons you are interested in.'}</p>{cloudStatus !== 'loading' && <Link className="button button--primary" to="/auth?returnTo=%2Fhackathons%2Finterests">Sign in</Link>}</div></div>;
  return (
    <div className="page-container hackathons-page">
      <Link className="back-link" to="/hackathons"><ArrowLeft size={16} /> Hackathon discovery</Link>
      <div className="page-heading"><div><span className="eyebrow">Your shortlist</span><h1>My Interests</h1><p>Interested means you wanted to keep the listing or open its official site. It does not mean you registered or attended.</p></div></div>
      {!isCloudProvider && <div className="hackathon-notice"><Info size={17} /><span>Local mode: this shortlist is stored only in this signed-in browser. Cloud sync is not claimed.</span></div>}
      {!items && !error && <HackathonSkeleton count={3} />}
      {error && <div className="hackathon-state" role="alert"><Info size={28} /><h2>My Interests couldn’t load</h2><p>{error}</p><Link className="button button--secondary" to="/hackathons">Back to hackathons</Link></div>}
      {items && items.length === 0 && <div className="hackathon-state"><Bookmark size={28} /><h2>No Interested hackathons yet</h2><p>Use Interested on a listing to save it here and continue to the official site.</p><Link className="button button--primary" to="/hackathons">Discover hackathons</Link></div>}
      {items && items.length > 0 && <div className="hackathon-grid">{items.map((hackathon) => <HackathonCard key={hackathon.id} hackathon={hackathon} context={isCloudProvider ? 'my_interests' : 'web'} />)}</div>}
    </div>
  );
}
