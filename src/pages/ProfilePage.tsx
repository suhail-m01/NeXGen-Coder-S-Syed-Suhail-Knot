import { AlertCircle, CheckCircle2, Download, Info, LogOut, MapPin, Save, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ageBandLabel } from '../domain/age';
import { INTERESTS, SKILLS } from '../domain/interests';
import { localities, localityById } from '../domain/localities';
import { useApp } from '../state/AppContext';

export function ProfilePage() {
  const { currentUser, data, updateProfile, signOut, deleteAccount, resetWorkspace } = useApp();
  const [name, setName] = useState(currentUser?.name ?? '');
  const [area, setArea] = useState(currentUser?.areaLocalityId ?? 'koramangala');
  const [radius, setRadius] = useState(currentUser?.radiusKm ?? 10);
  const [interests, setInterests] = useState<string[]>(currentUser?.interests ?? []);
  const [skills, setSkills] = useState<string[]>(currentUser?.skills ?? []);
  const [learningGoals, setLearningGoals] = useState<string[]>(currentUser?.learningGoals ?? []);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  if (!currentUser) return <Navigate to="/auth?returnTo=%2Fprofile&action=open%20your%20profile" replace />;

  const save = () => {
    if (name.trim().length < 2) { setError('Enter your name.'); return; }
    updateProfile({ name: name.trim(), areaLocalityId: area, radiusKm: radius, interests, skills, learningGoals });
    setMessage('Profile and Participation Fit preferences saved.'); setError('');
  };

  const exportData = () => {
    const { passwordHash: _passwordHash, passwordSalt: _passwordSalt, ...safeUser } = currentUser;
    const ownedEventIds = new Set(data.events.filter((event) => event.organizerId === currentUser.id).map((event) => event.id));
    const payload = {
      exportedAt: new Date().toISOString(), account: safeUser,
      registrations: data.registrations.filter((item) => item.userId === currentUser.id),
      saves: data.saves.filter((item) => item.userId === currentUser.id),
      follows: data.follows.filter((item) => item.userId === currentUser.id),
      notifications: data.notifications.filter((item) => item.userId === currentUser.id),
      submissions: data.submissions.filter((item) => item.submitterId === currentUser.id),
      feedback: data.feedback.filter((item) => item.userId === currentUser.id),
      teamPosts: data.teamPosts.filter((item) => item.ownerId === currentUser.id),
      teamRequests: data.teamRequests.filter((item) => item.requesterId === currentUser.id),
      organizedEvents: data.events.filter((event) => ownedEventIds.has(event.id)),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'knot-my-data.json'; anchor.click(); URL.revokeObjectURL(url);
  };

  const toggle = (value: string, values: string[], setter: (items: string[]) => void) => setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);

  return <div className="page-container profile-page">
    <div className="page-heading"><div><span className="eyebrow">Your account</span><h1>Profile & preferences</h1><p>Keep Participation Fit useful without turning discovery into behavioural tracking.</p></div><button className="button button--primary" onClick={save}><Save size={17} /> Save changes</button></div>
    {message && <div className="form-success"><CheckCircle2 />{message}</div>}{error && <div className="form-error"><AlertCircle />{error}</div>}
    <div className="profile-layout"><div className="profile-main">
      <section className="profile-section"><div className="profile-section__heading"><UserRound /><div><h2>About you</h2><p>Your name is used for native registrations and adult team posts.</p></div></div><div className="form-grid"><label>Name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label>Email<input value={currentUser.email} disabled /><small>Sign-in identifier; not shown on public event pages.</small></label><label>Self-declared age band<input value={ageBandLabel(currentUser.ageBand)} disabled /><small>Age is not identity-verified. Publishing and public team formation are adult-only.</small></label><label>Account role<input value={currentUser.role} disabled /></label></div></section>
      <section className="profile-section"><div className="profile-section__heading"><MapPin /><div><h2>Discovery area</h2><p>Stored as a locality, not a precise live location or location history.</p></div></div><div className="form-grid"><label>Usual area<select value={area} onChange={(event) => setArea(event.target.value)}>{localities.map((locality) => <option key={locality.id} value={locality.id}>{locality.name}</option>)}</select></label><label>Default radius <span>{radius} km</span><input type="range" min="2" max="50" step="1" value={radius} onChange={(event) => setRadius(Number(event.target.value))} /><small>Currently centred on {localityById(area)?.name}.</small></label></div></section>
      <section className="profile-section"><div className="profile-section__heading"><CheckCircle2 /><div><h2>Participation Fit</h2><p>Choose only what you want used for transparent fit reasons.</p></div></div><fieldset className="interest-field"><legend>Interests <span>{interests.length} selected</span></legend><div className="choice-chips">{INTERESTS.map((interest) => <button type="button" key={interest} className={interests.includes(interest) ? 'selected' : ''} onClick={() => toggle(interest, interests, setInterests)}>{interest}</button>)}</div></fieldset><fieldset className="interest-field"><legend>Skills you bring <span>{skills.length} selected</span></legend><div className="choice-chips">{SKILLS.map((skill) => <button type="button" key={skill} className={skills.includes(skill) ? 'selected' : ''} onClick={() => toggle(skill, skills, setSkills)}>{skill}</button>)}</div></fieldset><fieldset className="interest-field"><legend>Skills you want to learn <span>{learningGoals.length} selected</span></legend><div className="choice-chips">{SKILLS.map((skill) => <button type="button" key={skill} className={learningGoals.includes(skill) ? 'selected' : ''} onClick={() => toggle(skill, learningGoals, setLearningGoals)}>{skill}</button>)}</div></fieldset><button className="button button--primary" onClick={save}><Save size={16} /> Save preferences</button></section>
    </div><aside className="profile-side">
      <section className="privacy-card"><ShieldCheck /><h3>Your privacy boundary</h3><ul><li>Public browsing does not require this account.</li><li>No live GPS trace is stored.</li><li>External handoffs are not verified registrations.</li><li>Guest analytics are aggregate-only.</li><li>No targeted advertising profile is created.</li></ul>{currentUser.ageBand !== '18_plus' && <div className="minor-note">Minor Mode and guardian withdrawal controls require the gated account-safety service.</div>}</section>
      <section className="data-card"><span className="eyebrow">Local data controls</span><h3>Your workspace, portable</h3><p>Export your account and operational records without password hashes. This local build does not sync them to Supabase.</p><button className="button button--secondary button--full" onClick={exportData}><Download /> Export my data</button><Link to="/plan" className="button button--ghost button--full">Open my plan</Link><button className="button button--ghost button--full" onClick={signOut}><LogOut /> Sign out</button></section>
      <section className="data-card data-card--danger"><span className="eyebrow">Destructive actions</span><button className="text-button danger-text" onClick={() => { if (window.confirm('Permanently delete this local account and its personal records? This cannot be undone.')) { try { deleteAccount(); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not delete the account.'); window.scrollTo({ top: 0, behavior: 'smooth' }); } } }}><Trash2 /> Delete my local account</button><button className="text-button danger-text" onClick={() => { if (window.confirm('Reset the entire local workspace, including all locally created accounts and events?')) resetWorkspace(); }}><Trash2 /> Reset entire local workspace</button><small><Info /> Account deletion may be blocked while your events hold other participants’ operational records.</small></section>
    </aside></div>
  </div>;
}
