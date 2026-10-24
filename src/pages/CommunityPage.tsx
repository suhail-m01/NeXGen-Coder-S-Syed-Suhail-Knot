import { ArrowLeft, ArrowRight, Check, MapPin, MessageCircle, Plus, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';
import { EventCard } from '../components/EventCard';
import { SampleBadge } from '../components/Badges';
import { communitiesFromEvents, type CommunityProfile } from '../domain/communities';
import { SKILLS } from '../domain/interests';
import { localityById } from '../domain/localities';
import { useApp } from '../state/AppContext';
import type { TeamPost } from '../domain/types';

function CommunityCard({ community }: { community: CommunityProfile }) {
  const { currentUser, data, toggleFollow } = useApp();
  const followed = data.follows.some((follow) => follow.userId === currentUser?.id && follow.communityId === community.id);
  const locality = localityById(community.localityId);
  return <article className="community-card"><div className="community-card__avatar">{community.name.slice(0, 1)}</div><div className="community-card__badges">{community.isSample && <SampleBadge />}</div><h3><Link to={`/communities/${community.id}`}>{community.name}</Link></h3><p>{community.description}</p><div className="community-card__tags">{community.interests.slice(0, 4).map((interest) => <span key={interest}>{interest}</span>)}</div><div className="community-card__meta"><span><MapPin />{locality?.name ?? 'Online & Bengaluru'}</span><span><Users />{community.events.length} event{community.events.length === 1 ? '' : 's'}</span></div><div className="community-card__footer"><Link to={`/communities/${community.id}`}>Open community <ArrowRight size={15} /></Link><button className={`text-button ${followed ? 'is-following' : ''}`} onClick={() => toggleFollow(community.id)}>{followed ? <><Check size={14} /> Following</> : 'Follow'}</button></div></article>;
}

export function CommunityPage() {
  const { communityId } = useParams();
  const { currentUser, data, requireAuth, toggleFollow, createTeamPost, requestTeam, respondTeamRequest } = useApp();
  const communities = useMemo(() => communitiesFromEvents(data.events.filter((event) => (event.visibility ?? 'public') === 'public')), [data.events]);
  const community = communities.find((item) => item.id === communityId);
  const [tab, setTab] = useState<'events' | 'teams'>('events');
  const [teamFormOpen, setTeamFormOpen] = useState(false);
  const [teamEventId, setTeamEventId] = useState('');
  const [role, setRole] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState('');
  const [note, setNote] = useState('');
  const [requestPost, setRequestPost] = useState<TeamPost | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const [error, setError] = useState('');

  if (!communityId) return <div className="page-container community-directory"><div className="page-heading"><div><span className="eyebrow">People worth returning to</span><h1>Communities on Knot</h1><p>Follow the organizers and groups behind events, then return for what they do next.</p></div><Link to="/search" className="button button--secondary">Explore all events <ArrowRight size={17} /></Link></div><div className="community-grid">{communities.map((item) => <CommunityCard key={item.id} community={item} />)}</div></div>;
  if (!community) return <div className="page-container"><EmptyState title="Community not found" body="It may have been removed, or the link may be incomplete." action={<Link className="button button--primary" to="/communities">Browse communities</Link>} /></div>;

  const upcoming = community.events.filter((event) => new Date(event.endAt ?? event.startAt).getTime() >= Date.now() && event.status !== 'cancelled');
  const teamEvents = upcoming.filter((event) => event.team.mode !== 'solo');
  const activeTeamEvent = teamEvents.find((event) => event.id === teamEventId) ?? teamEvents[0] ?? null;
  const posts = activeTeamEvent ? data.teamPosts.filter((post) => post.eventId === activeTeamEvent.id) : [];
  const followed = data.follows.some((follow) => follow.userId === currentUser?.id && follow.communityId === community.id);
  const locality = localityById(community.localityId);

  const openTeamForm = () => {
    if (!currentUser) { requireAuth(`/communities/${community.id}`, 'join a team'); return; }
    setTeamFormOpen(true); setError('');
  };

  const submitTeamPost = () => {
    if (!activeTeamEvent) return;
    try { createTeamPost(activeTeamEvent.id, role, skills, lookingFor, note); setTeamFormOpen(false); setRole(''); setLookingFor(''); setNote(''); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create the team post.'); }
  };

  return <div className="community-page">
    <div className="community-hero"><div className="page-container"><Link to="/communities" className="back-link"><ArrowLeft /> All communities</Link><div className="community-hero__layout"><div className="community-hero__avatar">{community.name.slice(0, 1)}</div><div><div className="community-hero__badges">{community.isSample && <SampleBadge />}<span>{locality?.name ?? 'Online & Bengaluru'}</span></div><h1>{community.name}</h1><p>{community.description}</p><div className="community-card__tags">{community.interests.map((interest) => <span key={interest}>{interest}</span>)}</div></div><button className={`button ${followed ? 'button--secondary' : 'button--accent'}`} onClick={() => toggleFollow(community.id)}>{followed ? <><Check /> Following</> : <><UserPlus /> Follow community</>}</button></div></div></div>
    <div className="page-container community-content"><div className="community-tabs"><button className={tab === 'events' ? 'active' : ''} onClick={() => setTab('events')}>Events <span>{upcoming.length}</span></button><button className={tab === 'teams' ? 'active' : ''} onClick={() => setTab('teams')}>Team formation <span>{teamEvents.length}</span></button></div>
      {tab === 'events' && (upcoming.length ? <div className="event-grid">{upcoming.map((event) => <EventCard key={event.id} event={event} />)}</div> : <EmptyState title="No upcoming events" body="Follow this community and check back when a new event is published." action={<Link className="button button--primary" to="/search">Explore other events</Link>} />)}
      {tab === 'teams' && <div className="teams-layout"><section><div className="section-mini-heading"><div><h2>Find teammates with intent</h2><p>Team posts are public to adults. Contact details are shared only with the counterpart after acceptance.</p></div>{activeTeamEvent && <button className="button button--primary button--small" onClick={openTeamForm}><Plus /> Create team post</button>}</div>
        {teamEvents.length > 1 && <label className="dashboard-event-select">Event<select value={activeTeamEvent?.id ?? ''} onChange={(event) => setTeamEventId(event.target.value)}>{teamEvents.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>}
        {!activeTeamEvent ? <EmptyState icon={<Users />} title="No team-based events coming up" body="Team formation opens here when this community publishes a suitable event." /> : <><div className="team-event-note"><Users /><div><strong>{activeTeamEvent.title}</strong><span>Teams of {activeTeamEvent.team.minSize ?? '—'}–{activeTeamEvent.team.maxSize ?? '—'} · A team request is not an event registration.</span></div><Link to={`/events/${activeTeamEvent.id}`}>Event details <ArrowRight /></Link></div>
          {currentUser && currentUser.ageBand !== '18_plus' && <div className="minor-note"><ShieldCheck /><span>Public team formation remains gated until Minor Mode protections are active.</span></div>}
          {teamFormOpen && <div className="team-form"><h3>Post your team or availability</h3><div className="form-grid"><label>Your role<input value={role} onChange={(event) => setRole(event.target.value)} placeholder="e.g. Frontend builder" /></label><label>Looking for<input value={lookingFor} onChange={(event) => setLookingFor(event.target.value)} placeholder="e.g. One ML teammate" /></label></div><fieldset className="interest-field"><legend>Your skills</legend><div className="choice-chips">{SKILLS.map((skill) => <button type="button" key={skill} className={skills.includes(skill) ? 'selected' : ''} onClick={() => setSkills((previous) => previous.includes(skill) ? previous.filter((item) => item !== skill) : [...previous, skill])}>{skill}</button>)}</div></fieldset><label>Note <span>Optional</span><textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Share your idea, availability or what you want to build." /></label>{error && <div className="form-error">{error}</div>}<div className="button-row"><button className="button button--primary" onClick={submitTeamPost}>Publish team post</button><button className="button button--ghost" onClick={() => setTeamFormOpen(false)}>Cancel</button></div></div>}
          <div className="team-posts">{posts.length ? posts.map((post) => {
            const requests = data.teamRequests.filter((request) => request.postId === post.id);
            const accepted = requests.filter((request) => request.status === 'accepted');
            const own = post.ownerId === currentUser?.id;
            const mine = requests.find((request) => request.requesterId === currentUser?.id);
            const owner = data.users.find((user) => user.id === post.ownerId);
            return <article className="team-post" key={post.id}><div className="team-post__heading"><div className="team-post__avatar">{post.displayName.slice(0, 1)}</div><div><h3>{post.role}</h3><span>Posted by {post.displayName}</span></div><span className="team-capacity">{accepted.length + 1}/{activeTeamEvent.team.maxSize ?? '—'} spots</span></div><p>{post.note || 'Open to discussing a useful project and a realistic build plan.'}</p><div className="community-card__tags">{post.skills.map((skill) => <span key={skill}>{skill}</span>)}</div><div className="team-looking"><strong>Looking for</strong><span>{post.lookingFor}</span></div>
              {!own && <div className="team-post__actions">{mine ? <span className={`registration-status registration-status--${mine.status}`}>{mine.status === 'accepted' ? 'Request accepted' : mine.status === 'declined' ? 'Request declined' : 'Request pending'}</span> : <button className="button button--secondary button--small" onClick={() => { if (!currentUser) { requireAuth(`/communities/${community.id}`, 'join a team'); return; } setRequestPost(post); setError(''); }}><MessageCircle /> Request to join</button>}{mine?.status === 'accepted' && <span className="contact-share">Owner contact: {owner?.email}</span>}</div>}
              {own && <div className="team-requests"><h4>Join requests <span>{requests.length}</span></h4>{requests.length ? requests.map((request) => { const requester = data.users.find((user) => user.id === request.requesterId); return <div className="team-request" key={request.id}><div><strong>{request.displayName}</strong><p>{request.note || 'No additional note.'}</p>{request.status === 'accepted' && <span className="contact-share">Contact: {requester?.email}</span>}</div>{request.status === 'pending' ? <div><button className="button button--primary button--small" onClick={() => { try { respondTeamRequest(request.id, 'accepted'); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not accept.'); } }}>Accept</button><button className="button button--ghost button--small" onClick={() => respondTeamRequest(request.id, 'declined')}>Decline</button></div> : <span className={`submission-status submission-status--${request.status}`}>{request.status}</span>}</div>; }) : <p>No requests yet.</p>}</div>}
            </article>;
          }) : <EmptyState icon={<Users />} title="No team posts yet" body="Start a team or share what you can contribute. Posting does not register you for the event." action={<button className="button button--primary" onClick={openTeamForm}>Create the first post</button>} />}</div>
          {error && !teamFormOpen && <div className="form-error">{error}</div>}
        </>}</section>
        <aside className="team-safety"><ShieldCheck /><h3>A safer first step</h3><ul><li>Use the event page to confirm age and eligibility.</li><li>Do not share passwords, payment PINs or private documents.</li><li>Meet in public event spaces and report suspicious behaviour.</li><li>Team acceptance does not verify identity or event registration.</li></ul><Link to="/search">Review event details <ArrowRight /></Link></aside>
      </div>}
    </div>
    {requestPost && <div className="modal-backdrop" role="presentation" onMouseDown={() => setRequestPost(null)}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="team-request-title" onMouseDown={(event) => event.stopPropagation()}><span className="eyebrow">Join request</span><h2 id="team-request-title">Introduce yourself to {requestPost.displayName}</h2><p>Your note is visible to the team owner. Contact details stay private unless they accept.</p><textarea rows={4} value={requestNote} onChange={(event) => setRequestNote(event.target.value)} placeholder="What can you contribute, and what would you like to build?" />{error && <div className="form-error">{error}</div>}<div className="button-row"><button className="button button--primary" onClick={() => { try { requestTeam(requestPost.id, requestNote); setRequestPost(null); setRequestNote(''); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not send request.'); } }}>Send request <ArrowRight /></button><button className="button button--ghost" onClick={() => setRequestPost(null)}>Cancel</button></div></div></div>}
  </div>;
}
