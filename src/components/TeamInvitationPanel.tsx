import { Check, Mail, ShieldCheck, UserPlus, Users, X } from 'lucide-react';
import { useState } from 'react';
import { effectiveInvitationStatus, teamReadiness } from '../domain/growth';
import type { KnotEvent, TeamPost } from '../domain/types';
import { useApp } from '../state/AppContext';

export function TeamInvitationPanel({ post, event }: { post: TeamPost; event: KnotEvent }) {
  const { data, currentUser, inviteTeamMember, respondTeamInvitation, setTeamContinuity } = useApp();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const owner = post.ownerId === currentUser?.id;
  const readiness = teamReadiness(post, event, data.teamRequests, data.teamInvitations, data.users);
  const invitations = data.teamInvitations.filter((item) => item.postId === post.id);
  const mine = invitations.find((item) => item.inviteeId === currentUser?.id && effectiveInvitationStatus(item) === 'pending');
  const member = Boolean(currentUser && readiness.memberIds.includes(currentUser.id));
  const continuity = data.teamContinuity.find((item) => item.postId === post.id && item.userId === currentUser?.id)?.enabled ?? false;
  return <div className="team-collaboration">
    <div className={`team-readiness team-readiness--${readiness.status}`}><Users /><div><strong>{readiness.memberCount}/{readiness.maximum ?? '—'} members · {readiness.status.replaceAll('_', ' ')}</strong>{readiness.warnings.length ? <ul>{readiness.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : <p>Team size and event-skill coverage look ready. Event registration is still separate.</p>}</div></div>
    {mine && <div className="team-invitation-response"><strong>You’re invited as {mine.role}</strong><p>{mine.note || 'The owner invited you to collaborate.'}</p><small>Expires {new Date(mine.expiresAt).toLocaleString('en-IN')} · accepting is not event registration.</small><div className="button-row"><button className="button button--primary button--small" onClick={() => { try { respondTeamInvitation(mine.id, 'accepted'); setMessage('Invitation accepted.'); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Could not accept.'); } }}><Check /> Accept</button><button className="button button--ghost button--small" onClick={() => { try { respondTeamInvitation(mine.id, 'declined'); setMessage('Invitation declined.'); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Could not decline.'); } }}><X /> Decline</button></div></div>}
    {owner && <details className="team-invite-form"><summary><UserPlus /> Invite an existing adult account</summary><div className="form-grid"><label>Account email<input type="email" value={email} onChange={(input) => setEmail(input.target.value)} /></label><label>Proposed role<input value={role} onChange={(input) => setRole(input.target.value)} placeholder="e.g. ML builder" /></label></div><label>Note <span>Optional</span><input value={note} onChange={(input) => setNote(input.target.value)} /></label><button className="button button--secondary button--small" onClick={() => { try { inviteTeamMember(post.id, email, role, note); setEmail(''); setRole(''); setNote(''); setMessage('In-app invitation sent. No external message was delivered.'); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Could not invite.'); } }}><Mail /> Send in-app invitation</button></details>}
    {owner && invitations.length > 0 && <div className="team-invitation-list"><h4>Invitations</h4>{invitations.map((invitation) => { const user = data.users.find((item) => item.id === invitation.inviteeId); return <div key={invitation.id}><span><strong>{user?.name ?? 'Removed account'} · {invitation.role}</strong><small>{user?.email}</small></span><span className={`submission-status submission-status--${effectiveInvitationStatus(invitation) === 'accepted' ? 'published' : 'pending_review'}`}>{effectiveInvitationStatus(invitation)}</span></div>; })}</div>}
    {member && <div className="team-continuity"><label className="consent-check"><input type="checkbox" checked={continuity} onChange={(input) => { try { setTeamContinuity(post.id, input.target.checked); setMessage(input.target.checked ? 'Team continuity opted in.' : 'Team continuity opted out.'); } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Could not save continuity.'); } }} /><span>Keep me connected to this adult team for future event opportunities. No private messaging channel is created.</span></label>{continuity && <div className="team-contacts"><strong>Accepted-team contacts</strong>{readiness.memberIds.map((id) => { const user = data.users.find((item) => item.id === id); return user ? <span key={id}>{user.name} · {user.email}</span> : null; })}</div>}</div>}
    {message && <p className="settings-note" role="status">{message}</p>}
    <p className="field-note"><ShieldCheck /> Adults only. Invitation, readiness and continuity never verify identity or register the team externally.</p>
  </div>;
}
