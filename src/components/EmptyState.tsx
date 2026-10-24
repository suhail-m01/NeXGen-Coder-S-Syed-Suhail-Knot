import { CalendarSearch, Plus, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

export function EmptyState({ onReset, icon, title, body, action }: { onReset?: () => void; icon?: ReactNode; title?: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-state__icon">{icon ?? <CalendarSearch size={28} />}</div>
      <h3>{title ?? 'Nothing matches this exact plan'}</h3>
      <p>{body ?? 'Try a wider radius, clear a filter, explore online events, or add something you know about.'}</p>
      <div className="button-row button-row--center">
        {onReset && <button className="button button--secondary" onClick={onReset}><RotateCcw size={16} /> Clear filters</button>}
        {action ?? (!onReset && <Link className="button button--primary" to="/add"><Plus size={16} /> Add a missing event</Link>)}
        {onReset && !title && <Link className="button button--primary" to="/add"><Plus size={16} /> Add a missing event</Link>}
      </div>
    </div>
  );
}
