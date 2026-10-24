import { ArrowLeft, ArrowRight, Check, Info, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { LoadingButton } from '../components/LoadingButton';
import { Logo } from '../components/Logo';
import { ageBandLabel } from '../domain/age';
import { INTERESTS } from '../domain/interests';
import { localities } from '../domain/localities';
import { useApp } from '../state/AppContext';
import type { AgeBand } from '../domain/types';

const bands: AgeBand[] = ['under_13', '13_15', '16_17', '18_plus'];
const safeReturn = (value: string | null) => value && value.startsWith('/') && !value.startsWith('//') ? value : '/';

export function AuthPage() {
  const { currentUser, signIn, signUp } = useApp();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const returnTo = safeReturn(searchParams.get('returnTo'));
  const action = searchParams.get('action');
  const [mode, setMode] = useState<'signin' | 'signup'>(action ? 'signup' : 'signin');
  const [step, setStep] = useState<'age' | 'details'>(action ? 'age' : 'details');
  const [ageBand, setAgeBand] = useState<AgeBand | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');
  const [role, setRole] = useState<'participant' | 'organizer'>('participant');
  const [area, setArea] = useState('koramangala');
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (currentUser) return <Navigate to={returnTo} replace />;

  const submitSignIn = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true);
    try { await signIn(email, password); navigate(returnTo, { replace: true }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not sign in.'); }
    finally { setLoading(false); }
  };

  const submitSignUp = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setLoading(true);
    try { await signUp({ name, email, password, ageBand: ageBand ?? '18_plus', role, areaLocalityId: area, interests, guardianEmail }); navigate(returnTo, { replace: true }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create your account.'); }
    finally { setLoading(false); }
  };

  const switchMode = (next: 'signin' | 'signup') => {
    setMode(next); setError(''); setStep(next === 'signup' ? 'age' : 'details');
  };

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <Link to="/" className="auth-back"><ArrowLeft size={17} /> Back to public discovery</Link>
        <div className="auth-visual__content"><Logo inverse /><span className="eyebrow">Participation starts with context</span><h1>Browse freely.<br />Act with confidence.</h1><p>Your account connects your plan, registrations, communities and organizer tools—while public event discovery stays open to everyone.</p><div className="auth-benefits"><div><Check /><span>Save events and deadlines</span></div><div><Check /><span>Register externally or on Knot</span></div><div><Check /><span>Publish and manage your events</span></div></div></div>
        <div className="auth-privacy"><ShieldCheck /><span><strong>Privacy by design</strong>Guest age choices stay on-device. No live GPS history. No public minor identity.</span></div>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-form-card">
          <div className="auth-tabs"><button className={mode === 'signin' ? 'active' : ''} onClick={() => switchMode('signin')}>Sign in</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => switchMode('signup')}>Create account</button></div>
          {action && <div className="auth-action-note"><LockKeyhole size={17} />Sign in or create an account to {action}.</div>}
          {mode === 'signin' ? <>
            <div className="auth-form-heading"><span className="eyebrow">Welcome back</span><h2>Sign in to Knot</h2><p>Continue to your plan and participation tools.</p></div>
            <form onSubmit={submitSignIn} className="form-stack">
              <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
              <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" /></label>
              {error && <div className="form-error" role="alert">{error}</div>}
              <LoadingButton loading={loading} className="button button--primary button--full button--large" type="submit">Sign in <ArrowRight size={17} /></LoadingButton>
            </form>
            <p className="auth-switch">New to Knot? <button onClick={() => switchMode('signup')}>Create an account</button></p>
          </> : step === 'age' ? <>
            <div className="auth-form-heading"><span className="eyebrow">Step 1 of 2</span><h2>Which age range are you in?</h2><p>This applies the right participation and privacy rules. Age is self-declared, not verified.</p></div>
            <div className="age-options">{bands.map((band) => <button key={band} className={ageBand === band ? 'selected' : ''} onClick={() => setAgeBand(band)}><UserRound /><span>{ageBandLabel(band)}</span>{ageBand === band && <Check />}</button>)}</div>
            {ageBand && ageBand !== '18_plus' && <div className="minor-gate"><ShieldCheck /><div><strong>{ageBand === 'under_13' ? 'No individual account yet' : 'Guardian consent is required'}</strong><p>{ageBand === 'under_13' ? 'You can still browse every public event and community. Guardian-managed dependent profiles are a separately gated future capability.' : 'Continue to a restricted Minor Mode account. Participation stays limited until the local guardian attestation is complete; native events also require the organizer safety checklist. This is not production-verified consent.'}</p></div></div>}
            {ageBand && ageBand !== 'under_13' && <button className="button button--primary button--full" onClick={() => setStep('details')}>Continue <ArrowRight size={17} /></button>}
            {ageBand === 'under_13' && <Link to="/" className="button button--secondary button--full">Continue browsing publicly</Link>}
          </> : <>
            <button className="text-button auth-step-back" onClick={() => setStep('age')}><ArrowLeft size={15} /> Age: {ageBandLabel(ageBand ?? '18_plus')}</button>
            <div className="auth-form-heading"><span className="eyebrow">Step 2 of 2</span><h2>Create your account</h2><p>Set up your participation identity and a starting area.</p></div>
            <form onSubmit={submitSignUp} className="form-stack">
              <label>Your name<input autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} placeholder="How should Knot address you?" /></label>
              <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
              {ageBand !== '18_plus' && <label>Guardian email<input type="email" autoComplete="email" required value={guardianEmail} onChange={(event) => setGuardianEmail(event.target.value)} placeholder="guardian@example.com" /><small>Used only for the local consent record; no email is sent by this build.</small></label>}
              <label>Password<input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /></label>
              {ageBand === '18_plus' && <fieldset className="role-field"><legend>I mainly want to</legend><div><button type="button" className={role === 'participant' ? 'selected' : ''} onClick={() => setRole('participant')}>Discover & participate</button><button type="button" className={role === 'organizer' ? 'selected' : ''} onClick={() => setRole('organizer')}>Organize events</button></div></fieldset>}
              <label>Your usual event area<select value={area} onChange={(event) => setArea(event.target.value)}>{localities.map((locality) => <option value={locality.id} key={locality.id}>{locality.name}</option>)}</select></label>
              <fieldset className="interest-field"><legend>Interests <span>Optional · choose any</span></legend><div className="choice-chips">{INTERESTS.map((interest) => <button type="button" key={interest} className={interests.includes(interest) ? 'selected' : ''} onClick={() => setInterests((previous) => previous.includes(interest) ? previous.filter((item) => item !== interest) : [...previous, interest])}>{interest}</button>)}</div></fieldset>
              <label className="consent-check"><input type="checkbox" required /><span>{ageBand === '18_plus' ? 'I confirm that I am 18 or over and have read the local workspace data notice. Age is self-declared.' : 'I confirm the self-declared age band and understand that this restricted account requires guardian attestation before Minor Mode participation. No behavioural advertising profile is created.'}</span></label>
              {error && <div className="form-error" role="alert">{error}</div>}
              <LoadingButton loading={loading} className="button button--primary button--full button--large" type="submit">Create account <ArrowRight size={17} /></LoadingButton>
            </form>
          </>}
          <div className="local-auth-note"><Info size={15} /><span><strong>Local account mode:</strong> passwords are salted and PBKDF2-hashed in this browser. Production identity and cloud sync are not connected yet.</span></div>
        </div>
      </div>
    </div>
  );
}
