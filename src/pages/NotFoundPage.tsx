import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return <div className="page-container"><div className="not-found"><Compass /><span className="eyebrow">404 · Wrong turn</span><h1>This page isn’t on the map.</h1><p>The link may be outdated, but your next event could still be nearby.</p><div className="button-row button-row--center"><Link to="/" className="button button--secondary"><ArrowLeft /> Home</Link><Link to="/search" className="button button--primary">Explore events</Link></div></div></div>;
}
