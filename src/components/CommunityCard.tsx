import { ArrowRight, Check, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SampleBadge } from './Badges';
import type { CommunityProfile } from '../domain/communities';
import { localityById } from '../domain/localities';
import { useApp } from '../state/AppContext';

export function CommunityCard({ community }: { community: CommunityProfile }) {
  const { currentUser, data, toggleFollow } = useApp();
  const followed = data.follows.some((follow) => follow.userId === currentUser?.id && follow.communityId === community.id);
  const locality = localityById(community.localityId);

  return (
    <article className="community-card">
      <div className="community-card__avatar">{community.name.slice(0, 1)}</div>
      <div className="community-card__badges">{community.isSample && <SampleBadge />}</div>
      <h3><Link to={`/communities/${community.id}`}>{community.name}</Link></h3>
      <p>{community.description}</p>
      <div className="community-card__tags">
        {community.interests.slice(0, 4).map((interest) => (
          <span key={interest}>{interest}</span>
        ))}
      </div>
      <div className="community-card__meta">
        <span><MapPin size={13} />{locality?.name ?? 'Online & Bengaluru'}</span>
        <span><Users size={13} />{community.events.length} event{community.events.length === 1 ? '' : 's'}</span>
      </div>
      <div className="community-card__footer">
        <Link to={`/communities/${community.id}`}>Open community <ArrowRight size={15} /></Link>
        <button
          className={`text-button ${followed ? 'is-following' : ''}`}
          onClick={() => toggleFollow(community.id)}
        >
          {followed ? <><Check size={14} /> Following</> : 'Follow'}
        </button>
      </div>
    </article>
  );
}
