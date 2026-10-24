import { AlertCircle, ArrowRight, CalendarDays, Check, ChevronDown, Globe2, Link2, MapPin, Plus, ShieldCheck, Users } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LoadingButton } from '../components/LoadingButton';
import { organizerAgeRule } from '../domain/defaults';
import { ageRuleLabel } from '../domain/age';
import { eventTypeLabel } from '../domain/events';
import { INTERESTS, SKILLS } from '../domain/interests';
import { localities } from '../domain/localities';
import type { AgeRule, EventMode, EventType } from '../domain/types';
import type { QuickPostInput } from '../domain/validation';
import { validateQuickPost } from '../domain/validation';
import { useApp } from '../state/AppContext';

const futureInput = (days: number, hour: number) => {
  const date = new Date(Date.now() + days * 86_400_000);
  date.setHours(hour, 0, 0, 0);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export function QuickPostPage() {
  const { currentUser, publishQuickEvent } = useApp();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState<EventType>('meetup');
  const [startAt, setStartAt] = useState(futureInput(7, 10));
  const [endAt, setEndAt] = useState(futureInput(7, 13));
  const [mode, setMode] = useState<EventMode>('in_person');
  const [venueName, setVenueName] = useState('');
  const [localityId, setLocalityId] = useState('koramangala');
  const [address, setAddress] = useState('');
  const [registrationKind, setRegistrationKind] = useState<'external' | 'native'>('native');
  const [registrationUrl, setRegistrationUrl] = useState('');
  const [onlineJoinUrl, setOnlineJoinUrl] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState(futureInput(6, 22));
  const [ageChoice, setAgeChoice] = useState('');
  const [minAge, setMinAge] = useState('13');
  const [maxAge, setMaxAge] = useState('17');
  const [description, setDescription] = useState('');
  const [eligibilityText, setEligibilityText] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [priceKind, setPriceKind] = useState<'free' | 'paid' | 'unknown'>('free');
  const [priceAmount, setPriceAmount] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const ageRule: AgeRule = useMemo(() => {
    if (!ageChoice) return organizerAgeRule('not_stated');
    if (ageChoice === 'custom_range') return organizerAgeRule('age_range', Number(minAge), Number(maxAge));
    if (ageChoice === 'custom_min') return organizerAgeRule('min_age', Number(minAge));
    if (ageChoice === '13_plus') return organizerAgeRule('min_age', 13);
    if (ageChoice === '16_plus') return organizerAgeRule('min_age', 16);
    return organizerAgeRule(ageChoice as AgeRule['mode']);
  }, [ageChoice, minAge, maxAge]);

  if (!currentUser) return <Navigate to="/auth?returnTo=%2Fpublish&action=publish%20or%20host%20an%20event" replace />;
  if (currentUser.ageBand !== '18_plus') return <div className="page-container"><div className="empty-state"><ShieldCheck size={30} /><h1>Publishing is an adult-only action</h1><p>You can continue to browse public events and communities.</p></div></div>;

  const input: QuickPostInput = {
    title, eventType, startAt, endAt, mode, venueName, localityId, address, registrationKind,
    registrationUrl, onlineJoinUrl, ageRule, description, eligibilityText, interests, skills,
    priceKind, priceAmount: priceAmount ? Number(priceAmount) : null, registrationDeadline,
  };
  const warnings = [
    !description.trim() ? 'Add a short description so participants know what to expect.' : null,
    !endAt ? 'Add an end time to make calendar planning easier.' : null,
    !eligibilityText.trim() ? 'Other eligibility is not stated; fit labels will stay cautious.' : null,
    priceKind === 'unknown' ? 'Price will appear as “not stated”, not free.' : null,
    mode === 'online' && registrationKind === 'external' && registrationUrl && !onlineJoinUrl ? 'The joining link can be added later for eligible participants.' : null,
  ].filter((warning): warning is string => Boolean(warning)).slice(0, 5);

  const publish = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validateQuickPost(input);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      document.querySelector('.form-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setLoading(true);
    try {
      const created = publishQuickEvent(input);
      navigate(`/events/${created.id}`, { replace: true });
    } catch (reason) {
      setErrors({ form: reason instanceof Error ? reason.message : 'Could not publish this event.' });
    } finally { setLoading(false); }
  };

  const toggle = (value: string, values: string[], setValues: (items: string[]) => void) => setValues(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);

  return (
    <div className="quick-post-page page-container">
      <div className="page-heading"><div><span className="eyebrow">Organizer studio</span><h1>Publish or host on Knot</h1><p>One screen for the essentials. Add richer details only when they help participants.</p></div><span className="local-pill"><span className="live-dot" /> Saves to this workspace</span></div>
      <form className="quick-post-layout" onSubmit={publish}>
        <div className="quick-post-form">
          {errors.form && <div className="form-error" role="alert">{errors.form}</div>}
          <section className="form-section">
            <div className="form-section__heading"><span>01</span><div><h2>The essentials</h2><p>Title, type and a clear starting point.</p></div></div>
            <div className="form-grid">
              <label className="field-span-2">Event title <em>Required</em><input className={errors.title ? 'input-error' : ''} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Bengaluru Design Builders Meetup" maxLength={120} />{errors.title ? <small className="field-error">{errors.title}</small> : <small>{title.length}/120 characters</small>}</label>
              <label>Event type <em>Required</em><select value={eventType} onChange={(event) => setEventType(event.target.value as EventType)}>{(['hackathon', 'workshop', 'meetup', 'conference', 'summit', 'competition', 'webinar', 'community_session'] as EventType[]).map((type) => <option value={type} key={type}>{eventTypeLabel(type)}</option>)}</select></label>
              <label>Event mode <em>Required</em><select value={mode} onChange={(event) => setMode(event.target.value as EventMode)}><option value="in_person">In person</option><option value="online">Online</option><option value="hybrid">Hybrid</option></select></label>
              <label>Starts <em>Required</em><input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} />{errors.startAt && <small className="field-error">{errors.startAt}</small>}</label>
              <label>Ends <span>Optional</span><input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} />{errors.endAt && <small className="field-error">{errors.endAt}</small>}</label>
            </div>
          </section>

          <section className="form-section">
            <div className="form-section__heading"><span>02</span><div><h2>Where people participate</h2><p>Venue area or an online participation route.</p></div></div>
            {mode !== 'online' ? <div className="form-grid">
              <label>Venue name <em>Required</em><input value={venueName} onChange={(event) => setVenueName(event.target.value)} placeholder="e.g. Community Innovation Hall" />{errors.venueName && <small className="field-error">{errors.venueName}</small>}</label>
              <label>Locality <em>Required</em><select value={localityId} onChange={(event) => setLocalityId(event.target.value)}>{localities.map((locality) => <option key={locality.id} value={locality.id}>{locality.name}</option>)}</select></label>
              <label className="field-span-2">Address <span>Optional</span><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Street address or a helpful landmark" /><small>The first version publishes a locality-area marker, not a false exact pin.</small></label>
            </div> : <div className="online-callout"><Globe2 /><div><strong>Online event</strong><p>Use external registration below, or choose Knot registration and add a joining link. With an external registration link, joining details may follow for eligible participants.</p></div></div>}
            <label className="field-full">Online joining link {mode === 'online' && registrationKind === 'native' ? <em>Required for native online registration</em> : <span>Optional · controlled visibility</span>}<input type="url" value={onlineJoinUrl} onChange={(event) => setOnlineJoinUrl(event.target.value)} placeholder="https://meet.example.com/your-event" />{errors.onlineJoinUrl && <small className="field-error">{errors.onlineJoinUrl}</small>}</label>
          </section>

          <section className="form-section">
            <div className="form-section__heading"><span>03</span><div><h2>Registration & age rule</h2><p>Choose where registration happens and who can participate.</p></div></div>
            <div className="registration-choice"><button type="button" className={registrationKind === 'native' ? 'selected' : ''} onClick={() => setRegistrationKind('native')}><Users /><span><strong>Register on Knot</strong><small>Free native registration</small></span>{registrationKind === 'native' && <Check />}</button><button type="button" className={registrationKind === 'external' ? 'selected' : ''} onClick={() => setRegistrationKind('external')}><Link2 /><span><strong>Another website</strong><small>Original-platform handoff</small></span>{registrationKind === 'external' && <Check />}</button></div>
            {registrationKind === 'external' && <label className="field-full">External registration link <em>Required</em><input type="url" value={registrationUrl} onChange={(event) => setRegistrationUrl(event.target.value)} placeholder="https://original-platform.com/register" />{errors.registrationUrl && <small className="field-error">{errors.registrationUrl}</small>}</label>}
            <div className="form-grid">
              <label>Who can join? <em>Required</em><select value={ageChoice} onChange={(event) => setAgeChoice(event.target.value)}><option value="">Choose an age rule</option><option value="all_ages">All ages</option><option value="13_plus">13+</option><option value="16_plus">16+</option><option value="adults_only">18+</option><option value="under_18_only">Under 18 only</option><option value="custom_min">Custom minimum age</option><option value="custom_range">Custom age range</option></select>{errors.ageRule && <small className="field-error">{errors.ageRule}</small>}</label>
              <label>Registration deadline <span>Optional</span><input type="datetime-local" value={registrationDeadline} onChange={(event) => setRegistrationDeadline(event.target.value)} />{errors.registrationDeadline && <small className="field-error">{errors.registrationDeadline}</small>}</label>
              {ageChoice === 'custom_min' && <label>Minimum age<input type="number" min="1" max="100" value={minAge} onChange={(event) => setMinAge(event.target.value)} /></label>}
              {ageChoice === 'custom_range' && <><label>Minimum age<input type="number" min="1" max="100" value={minAge} onChange={(event) => setMinAge(event.target.value)} /></label><label>Maximum age<input type="number" min="1" max="100" value={maxAge} onChange={(event) => setMaxAge(event.target.value)} /></label></>}
            </div>
            {ageRule.mode !== 'adults_only' && ageRule.mode !== 'not_stated' && <div className="minor-note"><ShieldCheck size={17} /><span>Native participation for minors remains gated until the organizer safety checklist and guardian-consent requirements are active. Public listing is still allowed.</span></div>}
          </section>

          <button className="more-details-toggle" type="button" onClick={() => setMoreOpen(!moreOpen)}><Plus size={17} /> Add description, eligibility, interests and price <ChevronDown className={moreOpen ? 'rotate' : ''} /></button>
          {moreOpen && <section className="form-section more-details">
            <label className="field-full">Short description <span>Optional</span><textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What will participants do, learn or build?" /></label>
            <label className="field-full">Other eligibility <span>Optional but improves fit</span><input value={eligibilityText} onChange={(event) => setEligibilityText(event.target.value)} placeholder="e.g. Open to all, or final-year students only" /><small>Leave blank if not stated. Knot will not assume open-to-all.</small></label>
            <fieldset className="interest-field"><legend>Interests</legend><div className="choice-chips">{INTERESTS.map((interest) => <button type="button" key={interest} className={interests.includes(interest) ? 'selected' : ''} onClick={() => toggle(interest, interests, setInterests)}>{interest}</button>)}</div></fieldset>
            <fieldset className="interest-field"><legend>Skills</legend><div className="choice-chips">{SKILLS.map((skill) => <button type="button" key={skill} className={skills.includes(skill) ? 'selected' : ''} onClick={() => toggle(skill, skills, setSkills)}>{skill}</button>)}</div></fieldset>
            <div className="form-grid"><label>Price<select value={priceKind} onChange={(event) => setPriceKind(event.target.value as typeof priceKind)}><option value="free">Free</option><option value="paid">Paid</option><option value="unknown">Price not stated</option></select></label>{priceKind === 'paid' && <label>Amount in INR<input type="number" min="1" value={priceAmount} onChange={(event) => setPriceAmount(event.target.value)} placeholder="500" />{errors.price && <small className="field-error">{errors.price}</small>}</label>}</div>
          </section>}
        </div>

        <aside className="publish-sidebar">
          <div className="publish-preview"><span className="eyebrow">Publishing preview</span><div className="preview-icon">{mode === 'online' ? <Globe2 /> : mode === 'in_person' ? <MapPin /> : <CalendarDays />}</div><span className="event-type">{eventTypeLabel(eventType)}</span><h3>{title || 'Your event title'}</h3><p>{description || 'Your short description will help people decide whether this event belongs in their plan.'}</p><div className="preview-meta"><span><CalendarDays />{startAt ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(startAt)) : 'Date not set'}</span><span><Users />{ageChoice ? ageRuleLabel(ageRule) : 'Age rule required'}</span><span><Link2 />{registrationKind === 'native' ? 'Register on Knot' : 'External registration'}</span></div></div>
          {warnings.length > 0 && <div className="readiness-box"><div><AlertCircle size={17} /><strong>Before you publish</strong></div><ul>{warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul><small>Warnings do not block publication; required-field errors do.</small></div>}
          <div className="publish-sidebar__actions"><LoadingButton loading={loading} type="submit" className="button button--primary button--full button--large">Publish event <ArrowRight size={18} /></LoadingButton><p>By publishing, you confirm that these details are yours to share and are accurate to the best of your knowledge.</p></div>
        </aside>
      </form>
    </div>
  );
}
