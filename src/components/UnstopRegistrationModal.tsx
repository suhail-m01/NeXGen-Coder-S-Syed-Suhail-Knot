import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Mail,
  MapPin,
  Plus,
  QrCode,
  Trash2,
  User,
  UserPlus,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { eventModeLabel, eventToICS, eventTypeLabel, formatEventDate } from '../domain/events';
import type { KnotEvent, ParticipantProfileDetails, Registration } from '../domain/types';
import { useApp } from '../state/AppContext';

export interface UnstopRegistrationModalProps {
  event: KnotEvent;
  open: boolean;
  onClose: () => void;
  initialTeamCode?: string;
  onSuccess?: (registration: Registration) => void;
}

export function UnstopRegistrationModal({
  event,
  open,
  onClose,
  initialTeamCode = '',
  onSuccess,
}: UnstopRegistrationModalProps) {
  const {
    currentUser,
    data,
    registerWithDetails,
    sendTeamInviteEmail,
    joinTeamByCode,
    requireAuth,
  } = useApp();

  const allowsSolo = event.team.mode !== 'team';
  const allowsTeam = event.team.mode !== 'solo';
  const minTeamSize = event.team.minSize ?? 2;
  const maxTeamSize = event.team.maxSize ?? 4;

  const [step, setStep] = useState<'mode' | 'profile' | 'team' | 'questions' | 'ticket'>(
    initialTeamCode ? 'team' : 'mode'
  );
  const [participationType, setParticipationType] = useState<'solo' | 'team'>(
    !allowsSolo && allowsTeam ? 'team' : initialTeamCode ? 'team' : 'solo'
  );
  const [teamIntent, setTeamIntent] = useState<'create' | 'join'>(
    initialTeamCode ? 'join' : 'create'
  );

  const [fullName, setFullName] = useState(currentUser?.name ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [phone, setPhone] = useState('');
  const [orgCollege, setOrgCollege] = useState(currentUser?.education ?? '');
  const [gradYearRole, setGradYearRole] = useState(
    currentUser?.experienceLevel ? `${currentUser.experienceLevel} level` : ''
  );
  const [city, setCity] = useState(
    currentUser?.areaLocalityId ? currentUser.areaLocalityId.replace(/-/g, ' ') : 'Bengaluru'
  );

  const defaultTeamCode = useMemo(
    () =>
      `TEAM-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.floor(
        100 + Math.random() * 900
      )}`,
    []
  );
  const [teamName, setTeamName] = useState('');
  const [teamCode] = useState(initialTeamCode || defaultTeamCode);
  const [joinCodeInput, setJoinCodeInput] = useState(initialTeamCode);
  const [verifiedLeaderReg, setVerifiedLeaderReg] = useState<Registration | null>(null);

  const [teamMembers, setTeamMembers] = useState<Array<{ email: string; role: string; name: string }>>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Frontend / Builder');

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selfDeclaredAgeRuleMet, setSelfDeclaredAgeRuleMet] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [registeredRecord, setRegisteredRecord] = useState<Registration | null>(null);
  const [inviteEmailsSent, setInviteEmailsSent] = useState<string[]>([]);
  const [copiedNotification, setCopiedNotification] = useState('');

  // Sync state if user changes or initial code passed
  useEffect(() => {
    if (currentUser) {
      if (!fullName) setFullName(currentUser.name);
      if (!email) setEmail(currentUser.email);
      if (!orgCollege && currentUser.education) setOrgCollege(currentUser.education);
    }
  }, [currentUser, fullName, email, orgCollege]);

  useEffect(() => {
    if (initialTeamCode) {
      setJoinCodeInput(initialTeamCode);
      setParticipationType('team');
      setTeamIntent('join');
      setStep('team');
    }
  }, [initialTeamCode]);

  // Check if existing registration is present
  const existingReg = useMemo(() => {
    if (!currentUser) return null;
    return data.registrations.find(
      (r) => r.eventId === event.id && r.userId === currentUser.id && !['cancelled', 'rejected'].includes(r.status)
    );
  }, [currentUser, data.registrations, event.id]);

  useEffect(() => {
    if (existingReg && open && !registeredRecord) {
      setRegisteredRecord(existingReg);
      setStep('ticket');
    }
  }, [existingReg, open, registeredRecord]);

  if (!open) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedNotification(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedNotification(''), 3000);
  };

  const handleAddTeammate = () => {
    const trimmed = newMemberEmail.trim();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please provide a valid teammate email address.');
      return;
    }
    if (trimmed.toLowerCase() === email.toLowerCase()) {
      setError('You are already registered as the Team Leader.');
      return;
    }
    if (teamMembers.some((m) => m.email.toLowerCase() === trimmed.toLowerCase())) {
      setError('This email is already in the team list.');
      return;
    }
    if (teamMembers.length + 1 >= maxTeamSize) {
      setError(`Maximum team size for this event is ${maxTeamSize} members.`);
      return;
    }
    setTeamMembers([...teamMembers, { email: trimmed, role: newMemberRole.trim() || 'Teammate', name: trimmed.split('@')[0] }]);
    setNewMemberEmail('');
    setError('');
  };

  const handleRemoveTeammate = (index: number) => {
    setTeamMembers(teamMembers.filter((_, i) => i !== index));
  };

  const handleVerifyJoinCode = () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (!code) {
      setError('Please enter an invite team code.');
      return;
    }
    const found = data.registrations.find(
      (r) =>
        r.eventId === event.id &&
        r.teamCode &&
        r.teamCode.toUpperCase() === code &&
        !['cancelled', 'rejected'].includes(r.status)
    );
    if (!found) {
      setError('No active team found with that code for this event. Please verify with your team leader.');
      setVerifiedLeaderReg(null);
      return;
    }
    setVerifiedLeaderReg(found);
    setError('');
  };

  const handleNextFromMode = () => {
    if (!currentUser) {
      requireAuth(`/events/${event.id}`, 'register for this event');
      return;
    }
    setStep('profile');
  };

  const handleNextFromProfile = () => {
    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('A valid email address is required for tickets and notifications.');
      return;
    }
    if (!phone.trim()) {
      setError('Contact mobile number is required.');
      return;
    }
    if (!orgCollege.trim()) {
      setError('College or Organization name is required.');
      return;
    }
    setError('');

    if (participationType === 'team') {
      setStep('team');
    } else if (event.registration.questions && event.registration.questions.length > 0) {
      setStep('questions');
    } else {
      void handleSubmitRegistration();
    }
  };

  const handleNextFromTeam = () => {
    if (teamIntent === 'create') {
      if (!teamName.trim()) {
        setError('Team name is required.');
        return;
      }
      if (teamMembers.length + 1 < minTeamSize) {
        setError(`This event requires a minimum of ${minTeamSize} members (including you).`);
        return;
      }
    } else {
      if (!verifiedLeaderReg) {
        setError('Please verify your team code before proceeding.');
        return;
      }
    }
    setError('');

    if (event.registration.questions && event.registration.questions.length > 0) {
      setStep('questions');
    } else {
      void handleSubmitRegistration();
    }
  };

  const handleSubmitRegistration = async () => {
    setSubmitting(true);
    setError('');
    const participantDetails: ParticipantProfileDetails = {
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      organizationOrCollege: orgCollege.trim(),
      graduationYearOrRole: gradYearRole.trim(),
      city: city.trim(),
    };

    try {
      if (participationType === 'team' && teamIntent === 'join' && verifiedLeaderReg) {
        const result = await joinTeamByCode(event, verifiedLeaderReg.teamCode!, participantDetails);
        if (result.status === 'joined' && result.registration) {
          setRegisteredRecord(result.registration);
          setStep('ticket');
          onSuccess?.(result.registration);
        } else if (result.status === 'team_full') {
          setError('This team has already reached its maximum allowed capacity.');
        } else if (result.status === 'already_registered') {
          setError('You already have an active registration for this event.');
          if (result.registration) {
            setRegisteredRecord(result.registration);
            setStep('ticket');
          }
        } else {
          setError('Could not join team. Please check the code.');
        }
      } else {
        const result = await registerWithDetails(event, {
          participationType,
          participant: participantDetails,
          teamName: participationType === 'team' ? teamName.trim() : undefined,
          teamCode: participationType === 'team' ? teamCode : undefined,
          teamMembers: participationType === 'team' ? teamMembers : undefined,
          selfDeclaredAgeRuleMet,
          answers,
        });

        if (['registered', 'pending', 'waitlisted'].includes(result.status) && result.registration) {
          setRegisteredRecord(result.registration);
          setStep('ticket');
          onSuccess?.(result.registration);
        } else if (result.status === 'duplicate') {
          setError('You already have an active registration for this event.');
          if (result.registration) {
            setRegisteredRecord(result.registration);
            setStep('ticket');
          }
        } else if (result.status === 'answers_required') {
          setError('Please answer all required event questions.');
          setStep('questions');
        } else {
          setError('Registration closed or unavailable.');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendInviteEmails = () => {
    if (!registeredRecord || !registeredRecord.teamCode || !registeredRecord.teamName) return;
    const pendingInvites = teamMembers.filter((m) => !inviteEmailsSent.includes(m.email));
    if (pendingInvites.length === 0 && teamMembers.length > 0) {
      setCopiedNotification('Invite emails already sent to all teammates.');
      return;
    }
    const recipients = pendingInvites.length > 0 ? pendingInvites : teamMembers;
    let mailtoUrl = '';
    for (const member of recipients) {
      const sent = sendTeamInviteEmail(
        event.id,
        registeredRecord.teamCode,
        registeredRecord.teamName,
        member.email,
        member.role
      );
      if (!mailtoUrl) mailtoUrl = sent.mailtoUrl;
      setInviteEmailsSent((prev) => [...prev, member.email]);
    }
    if (mailtoUrl && typeof window !== 'undefined') {
      window.open(mailtoUrl, '_blank');
    }
    setCopiedNotification(`Invitations dispatched! In-app notifications & email draft opened.`);
    setTimeout(() => setCopiedNotification(''), 4000);
  };

  const downloadCalendarFile = () => {
    const icsData = eventToICS(event);
    const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.slug}-unstop-knot.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="unstop-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="unstop-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="unstop-modal__header">
          <div className="unstop-modal__event-info">
            <span className="unstop-badge unstop-badge--event-type">
              {eventTypeLabel(event.eventType)}
            </span>
            <span className="unstop-badge unstop-badge--mode">{eventModeLabel(event.mode)}</span>
            <h2>{event.title}</h2>
            <p>
              Hosted by <strong>{event.organizerName}</strong> ·{' '}
              {event.mode === 'online' ? 'Online' : event.venue?.name || 'In-Person'} ·{' '}
              {formatEventDate(event.startAt, true)}
            </p>
          </div>
          <button className="icon-button unstop-close-btn" onClick={onClose} aria-label="Close registration">
            <X size={20} />
          </button>
        </div>

        {/* Stepper Progress */}
        {step !== 'ticket' && (
          <div className="unstop-stepper" aria-label="Registration Steps">
            <div className={`unstop-step ${step === 'mode' ? 'active' : 'completed'}`}>
              <div className="unstop-step__circle">1</div>
              <span>Participation</span>
            </div>
            <div className="unstop-step__line" />
            <div
              className={`unstop-step ${
                step === 'profile' ? 'active' : ['team', 'questions', 'ticket'].includes(step) ? 'completed' : ''
              }`}
            >
              <div className="unstop-step__circle">2</div>
              <span>Profile</span>
            </div>
            {participationType === 'team' && (
              <>
                <div className="unstop-step__line" />
                <div
                  className={`unstop-step ${
                    step === 'team' ? 'active' : ['questions', 'ticket'].includes(step) ? 'completed' : ''
                  }`}
                >
                  <div className="unstop-step__circle">3</div>
                  <span>Team</span>
                </div>
              </>
            )}
            {event.registration.questions && event.registration.questions.length > 0 && (
              <>
                <div className="unstop-step__line" />
                <div className={`unstop-step ${step === 'questions' ? 'active' : ''}`}>
                  <div className="unstop-step__circle">{participationType === 'team' ? '4' : '3'}</div>
                  <span>Questions</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Notification Toast */}
        {copiedNotification && (
          <div className="unstop-toast" role="status">
            <CheckCircle2 size={16} />
            <span>{copiedNotification}</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="unstop-error-banner" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Mode Selection */}
        {step === 'mode' && (
          <div className="unstop-step-body">
            <h3>Select how you wish to participate</h3>
            <p className="unstop-step-description">
              Choose individual participation or collaborate with a team. All registrations receive full verified credentials.
            </p>

            <div className="unstop-type-grid">
              {allowsSolo && (
                <div
                  className={`unstop-type-card ${participationType === 'solo' ? 'selected' : ''}`}
                  onClick={() => setParticipationType('solo')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="unstop-type-card__icon">
                    <User size={28} />
                  </div>
                  <h4>Individual (Solo)</h4>
                  <p>Participate independently as an individual entrant. Receive your personal verified ticket and QR pass.</p>
                  <div className="unstop-type-card__radio">
                    <div className="inner-dot" />
                  </div>
                </div>
              )}

              {allowsTeam && (
                <div
                  className={`unstop-type-card ${participationType === 'team' ? 'selected' : ''}`}
                  onClick={() => setParticipationType('team')}
                  role="button"
                  tabIndex={0}
                >
                  <div className="unstop-type-card__icon">
                    <Users size={28} />
                  </div>
                  <h4>Team Participation</h4>
                  <p>
                    Collaborate with teammates ({minTeamSize}–{maxTeamSize} members). Create a new team or enter an invite code.
                  </p>
                  <div className="unstop-type-card__radio">
                    <div className="inner-dot" />
                  </div>
                </div>
              )}
            </div>

            <div className="unstop-footer-actions">
              <button className="button button--primary button--large" onClick={handleNextFromMode}>
                Continue to Profile <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Participant Details */}
        {step === 'profile' && (
          <div className="unstop-step-body">
            <h3>Participant Information</h3>
            <p className="unstop-step-description">
              Official details for your registration badge, certificates, and logistics communication.
            </p>

            <div className="unstop-form-grid">
              <label>
                Full Name <em>*</em>
                <input
                  type="text"
                  placeholder="e.g. Syed Suhail"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>

              <label>
                Email Address <em>*</em>
                <input
                  type="email"
                  placeholder="e.g. suhail@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>

              <label>
                Mobile / WhatsApp Number <em>*</em>
                <input
                  type="tel"
                  placeholder="e.g. +91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>

              <label>
                College / University / Organization <em>*</em>
                <input
                  type="text"
                  placeholder="e.g. NIT Silchar / Autonomous Builder"
                  value={orgCollege}
                  onChange={(e) => setOrgCollege(e.target.value)}
                />
              </label>

              <label>
                Graduation Year / Role
                <input
                  type="text"
                  placeholder="e.g. Batch 2027 / Full-Stack Engineer"
                  value={gradYearRole}
                  onChange={(e) => setGradYearRole(e.target.value)}
                />
              </label>

              <label>
                City / Location
                <input
                  type="text"
                  placeholder="e.g. Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </label>
            </div>

            <div className="unstop-footer-actions">
              <button className="button button--secondary" onClick={() => setStep('mode')}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="button button--primary button--large" onClick={handleNextFromProfile}>
                {participationType === 'team'
                  ? 'Proceed to Team Setup'
                  : event.registration.questions && event.registration.questions.length > 0
                  ? 'Proceed to Questions'
                  : 'Submit Registration'}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Team Setup & Member Invites */}
        {step === 'team' && (
          <div className="unstop-step-body">
            <h3>Team Setup & Member Invitations</h3>
            <p className="unstop-step-description">
              Form your dream squad. Teams can consist of {minTeamSize} to {maxTeamSize} members.
            </p>

            {/* Switch Intent: Create or Join */}
            <div className="unstop-sub-tabs">
              <button
                type="button"
                className={`unstop-sub-tab ${teamIntent === 'create' ? 'active' : ''}`}
                onClick={() => {
                  setTeamIntent('create');
                  setError('');
                }}
              >
                <UserPlus size={16} /> Create New Team
              </button>
              <button
                type="button"
                className={`unstop-sub-tab ${teamIntent === 'join' ? 'active' : ''}`}
                onClick={() => {
                  setTeamIntent('join');
                  setError('');
                }}
              >
                <Users size={16} /> Join With Team Code
              </button>
            </div>

            {teamIntent === 'create' ? (
              <div className="unstop-team-create-box">
                <div className="unstop-form-row">
                  <label>
                    Team Name <em>*</em>
                    <input
                      type="text"
                      placeholder="e.g. NextGen Hackers"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                    />
                  </label>
                  <div className="unstop-code-badge">
                    <span>Generated Team Code:</span>
                    <strong>{teamCode}</strong>
                  </div>
                </div>

                <div className="unstop-team-invites-panel">
                  <h4>Invite Teammates via Email</h4>
                  <p>Teammates will receive immediate in-app invitations & email notifications.</p>

                  <div className="unstop-add-member-row">
                    <input
                      type="email"
                      placeholder="Teammate's email address..."
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Role (e.g. AI / Frontend)"
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                    />
                    <button type="button" className="button button--secondary" onClick={handleAddTeammate}>
                      <Plus size={16} /> Add Member
                    </button>
                  </div>

                  {/* Teammate Roster */}
                  <div className="unstop-roster">
                    <div className="unstop-roster-item unstop-roster-item--leader">
                      <div className="unstop-roster-avatar">{fullName.slice(0, 1).toUpperCase()}</div>
                      <div className="unstop-roster-meta">
                        <strong>{fullName} (You)</strong>
                        <span>Team Leader · {email}</span>
                      </div>
                      <span className="unstop-tag unstop-tag--success">Leader</span>
                    </div>

                    {teamMembers.map((member, idx) => (
                      <div className="unstop-roster-item" key={member.email}>
                        <div className="unstop-roster-avatar">{member.name.slice(0, 1).toUpperCase()}</div>
                        <div className="unstop-roster-meta">
                          <strong>{member.name}</strong>
                          <span>
                            {member.role} · {member.email}
                          </span>
                        </div>
                        <span className="unstop-tag unstop-tag--pending">Invited</span>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => handleRemoveTeammate(idx)}
                          aria-label={`Remove ${member.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <small className="unstop-roster-count">
                    Current team size: <strong>{teamMembers.length + 1}</strong> / {maxTeamSize} (Min required:{' '}
                    {minTeamSize})
                  </small>
                </div>
              </div>
            ) : (
              <div className="unstop-team-join-box">
                <label>
                  Enter 8-digit Team Invite Code <em>*</em>
                  <div className="unstop-input-with-action">
                    <input
                      type="text"
                      placeholder="e.g. TEAM-7X9P-402"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    />
                    <button type="button" className="button button--secondary" onClick={handleVerifyJoinCode}>
                      Verify Team
                    </button>
                  </div>
                </label>

                {verifiedLeaderReg && (
                  <div className="unstop-verified-team-card">
                    <CheckCircle2 size={24} className="verified-icon" />
                    <div>
                      <h4>Team “{verifiedLeaderReg.teamName}”</h4>
                      <p>
                        Led by <strong>{verifiedLeaderReg.participantDetails?.fullName || 'Team Leader'}</strong> ·{' '}
                        {verifiedLeaderReg.teamMembers?.length ?? 1} members currently
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="unstop-footer-actions">
              <button className="button button--secondary" onClick={() => setStep('profile')}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="button button--primary button--large" onClick={handleNextFromTeam}>
                {event.registration.questions && event.registration.questions.length > 0
                  ? 'Proceed to Questions'
                  : 'Submit Registration'}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Questions & Declarations */}
        {step === 'questions' && (
          <div className="unstop-step-body">
            <h3>Additional Questions & Verification</h3>
            <p className="unstop-step-description">
              Please provide the organizer-specific details and verify eligibility rules.
            </p>

            {event.registration.questions && event.registration.questions.length > 0 && (
              <div className="unstop-questions-list">
                {event.registration.questions.map((q) => (
                  <label key={q.id}>
                    {q.label} {q.required && <em>* Required</em>}
                    {q.kind === 'long_text' ? (
                      <textarea
                        rows={3}
                        value={answers[q.id] ?? ''}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        placeholder="Type your answer here..."
                      />
                    ) : q.kind === 'single_choice' ? (
                      <select
                        value={answers[q.id] ?? ''}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                      >
                        <option value="">Select an option</option>
                        {q.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={answers[q.id] ?? ''}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        placeholder="Your answer..."
                      />
                    )}
                  </label>
                ))}
              </div>
            )}

            <div className="unstop-declaration-box">
              <label className="consent-check">
                <input
                  type="checkbox"
                  checked={selfDeclaredAgeRuleMet}
                  onChange={(e) => setSelfDeclaredAgeRuleMet(e.target.checked)}
                />
                <span>
                  I confirm that all information provided is accurate and I agree to abide by the event’s participation
                  and community rules.
                </span>
              </label>
            </div>

            <div className="unstop-footer-actions">
              <button
                className="button button--secondary"
                onClick={() => setStep(participationType === 'team' ? 'team' : 'profile')}
              >
                <ArrowLeft size={16} /> Back
              </button>
              <button
                className="button button--primary button--large"
                disabled={submitting || !selfDeclaredAgeRuleMet}
                onClick={handleSubmitRegistration}
              >
                {submitting ? 'Submitting...' : 'Confirm & Generate Ticket'} <Check size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Ticket & Pass Confirmation */}
        {step === 'ticket' && (
          <div className="unstop-step-body unstop-confirmation-view">
            <div className="unstop-success-banner">
              <div className="unstop-success-icon">
                <CheckCircle2 size={44} />
              </div>
              <h3>Registration Confirmed!</h3>
              <p>
                Your registration for <strong>{event.title}</strong> has been successfully processed and verified.
              </p>
            </div>

            {/* Official Pass Ticket */}
            <div className="unstop-pass-ticket">
              <div className="unstop-pass-ticket__header">
                <div>
                  <span className="unstop-badge unstop-badge--accent">{eventTypeLabel(event.eventType)}</span>
                  <h4>{event.title}</h4>
                  <small>Hosted by {event.organizerName}</small>
                </div>
                <div className="unstop-pass-ref">
                  <span>REGISTRATION ID</span>
                  <strong>
                    UNSTOP-KNOT-
                    {(registeredRecord?.id || '89421').slice(-6).toUpperCase()}
                  </strong>
                </div>
              </div>

              <div className="unstop-pass-ticket__body">
                <div className="unstop-pass-item">
                  <User size={15} />
                  <div>
                    <span>PARTICIPANT</span>
                    <strong>{registeredRecord?.participantDetails?.fullName || currentUser?.name || fullName}</strong>
                  </div>
                </div>

                <div className="unstop-pass-item">
                  <Calendar size={15} />
                  <div>
                    <span>EVENT DATE</span>
                    <strong>{formatEventDate(event.startAt, true)}</strong>
                  </div>
                </div>

                <div className="unstop-pass-item">
                  {event.mode === 'online' ? <Video size={15} /> : <MapPin size={15} />}
                  <div>
                    <span>FORMAT & VENUE</span>
                    <strong>{event.mode === 'online' ? 'Online Sprint' : event.venue?.name || 'In-Person'}</strong>
                  </div>
                </div>

                {registeredRecord?.participationType === 'team' && registeredRecord.teamName && (
                  <div className="unstop-pass-item unstop-pass-item--team">
                    <Users size={15} />
                    <div>
                      <span>TEAM ROSTER</span>
                      <strong>
                        {registeredRecord.teamName} · Code: {registeredRecord.teamCode}
                      </strong>
                    </div>
                  </div>
                )}
              </div>

              {registeredRecord?.checkInToken && (
                <div className="unstop-pass-ticket__footer">
                  <div className="unstop-token-row">
                    <QrCode size={18} />
                    <span>Check-in Token: {registeredRecord.checkInToken.slice(0, 16)}...</span>
                  </div>
                  <span className="unstop-verified-pill">● Knot Verified Pass</span>
                </div>
              )}
            </div>

            {/* Team Management / Invite Links if Team */}
            {registeredRecord?.participationType === 'team' && registeredRecord.teamCode && (
              <div className="unstop-team-action-box">
                <div className="unstop-team-share-row">
                  <div>
                    <span>Shareable Team Invite Code:</span>
                    <strong>{registeredRecord.teamCode}</strong>
                  </div>
                  <button
                    className="button button--secondary button--small"
                    onClick={() => copyToClipboard(registeredRecord.teamCode!, 'Team Code')}
                  >
                    <Copy size={14} /> Copy Code
                  </button>
                </div>

                <div className="unstop-team-share-row">
                  <div>
                    <span>Direct Team Join Link:</span>
                    <small>
                      {typeof window !== 'undefined'
                        ? `${window.location.origin}/events/${event.id}?teamCode=${registeredRecord.teamCode}`
                        : ''}
                    </small>
                  </div>
                  <button
                    className="button button--secondary button--small"
                    onClick={() =>
                      copyToClipboard(
                        `${window.location.origin}/events/${event.id}?teamCode=${registeredRecord.teamCode}`,
                        'Team Link'
                      )
                    }
                  >
                    <Copy size={14} /> Copy Link
                  </button>
                </div>

                {teamMembers.length > 0 && (
                  <div className="unstop-invite-email-action">
                    <p>
                      <Mail size={16} /> <strong>Teammates to invite:</strong>{' '}
                      {teamMembers.map((m) => m.email).join(', ')}
                    </p>
                    <button className="button button--accent button--small" onClick={handleSendInviteEmails}>
                      <Mail size={16} /> Dispatch Invitation Emails & Notifications
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Action Bar */}
            <div className="unstop-ticket-actions">
              <button className="button button--secondary" onClick={downloadCalendarFile}>
                <Download size={16} /> Add to Calendar (.ics)
              </button>
              <Link to="/plan" className="button button--secondary">
                View in My Plan
              </Link>
              <button className="button button--primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

