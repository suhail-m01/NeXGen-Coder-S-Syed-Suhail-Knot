import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Plus,
  QrCode,
  Sparkles,
  Trash2,
  User,
  UserPlus,
  Users,
  Video,
  X,
  Zap,
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

const TOP_COLLEGES = [
  'Dayananda Sagar College (DSCE)',
  'NIT Silchar',
  'PES University',
  'RV College of Engineering (RVCE)',
  'BITS Pilani',
  'IIIT Bangalore',
  'Autonomous Builder / Startup',
];

const POPULAR_ROLES = [
  'Frontend / React',
  'Backend / Node / Go',
  'AI / ML & Agents',
  'UI/UX & Product Design',
  'Full-Stack Builder',
  'Web3 & Smart Contracts',
];

const TRACK_OPTIONS = [
  { id: 'ai-agents', title: 'AI & Autonomous Agents', desc: 'LLM orchestrations, multimodal reasoning, tool-use', icon: '🤖' },
  { id: 'hyperlocal', title: 'Hyperlocal Discovery & Engagement', desc: 'Community hubs, local event graphs, commuter sync', icon: '📍', badge: 'Problem Statement Track' },
  { id: 'web3', title: 'Web3 & Decentralized Systems', desc: 'Zero-knowledge proofs, smart contracts, on-chain identity', icon: '🌐' },
  { id: 'open-innovation', title: 'Open Innovation & Full-Stack', desc: 'Developer tooling, mobile apps, systems engineering', icon: '💡' },
];

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
  const minTeamSize = event.team.minSize ?? 1;
  const maxTeamSize = event.team.maxSize ?? 4;

  const [step, setStep] = useState<'mode' | 'profile' | 'team' | 'questions' | 'ticket'>(
    initialTeamCode ? 'team' : 'mode'
  );
  const [participationType, setParticipationType] = useState<'solo' | 'team'>(
    !allowsSolo && allowsTeam ? 'team' : initialTeamCode ? 'team' : 'team'
  );
  const [selectedTrack, setSelectedTrack] = useState('hyperlocal');
  const [teamIntent, setTeamIntent] = useState<'create' | 'join'>(
    initialTeamCode ? 'join' : 'create'
  );

  // Profile Fields
  const [fullName, setFullName] = useState(currentUser?.name ?? '');
  const [email, setEmail] = useState(currentUser?.email ?? '');
  const [phone, setPhone] = useState('+91 98450 ');
  const [orgCollege, setOrgCollege] = useState(currentUser?.education ?? 'Dayananda Sagar College (DSCE)');
  const [gradYearRole, setGradYearRole] = useState('Batch 2027 · Full-Stack Builder');
  const [githubUrl, setGithubUrl] = useState('https://github.com/');
  const [city, setCity] = useState(
    currentUser?.areaLocalityId ? currentUser.areaLocalityId.replace(/-/g, ' ') : 'Bengaluru'
  );
  const [tshirtSize, setTshirtSize] = useState('L');
  const [dietary, setDietary] = useState('Veg');

  // Team Fields
  const defaultTeamCode = useMemo(
    () =>
      `TEAM-KN-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.floor(
        100 + Math.random() * 900
      )}`,
    []
  );
  const [teamName, setTeamName] = useState('NexGen Builders');
  const [teamCode] = useState(initialTeamCode || defaultTeamCode);
  const [joinCodeInput, setJoinCodeInput] = useState(initialTeamCode);
  const [verifiedLeaderReg, setVerifiedLeaderReg] = useState<Registration | null>(null);

  const [teamMembers, setTeamMembers] = useState<Array<{ email: string; role: string; name: string }>>([
    { email: 'teammate.ai@gmail.com', role: 'AI / ML Engineer', name: 'DevTeammate' },
  ]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Frontend / React');

  // Proposal & Questions
  const [projectTitle, setProjectTitle] = useState('Knot Hyperlocal Event Intelligence Platform');
  const [projectPitch, setProjectPitch] = useState('Autonomous multi-portal event aggregator with zero-latency harvesting and commute-matchmaking.');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selfDeclaredAgeRuleMet, setSelfDeclaredAgeRuleMet] = useState(true);
  const [agreedToConduct, setAgreedToConduct] = useState(true);

  // UI States
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [registeredRecord, setRegisteredRecord] = useState<Registration | null>(null);
  const [inviteEmailsSent, setInviteEmailsSent] = useState<string[]>([]);
  const [copiedNotification, setCopiedNotification] = useState('');
  const [previewEmailOpen, setPreviewEmailOpen] = useState(false);

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
      setError('Please enter a team invite code.');
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
      setError('No active team found with that code for this event. Please check the code with your team leader.');
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
    if (!phone.trim() || phone.length < 8) {
      setError('A valid contact mobile/WhatsApp number is required.');
      return;
    }
    if (!orgCollege.trim()) {
      setError('College or Organization name is required.');
      return;
    }
    setError('');

    if (participationType === 'team') {
      setStep('team');
    } else {
      setStep('questions');
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
    setStep('questions');
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
          answers: {
            ...answers,
            track: selectedTrack,
            projectTitle,
            projectPitch,
            githubUrl,
            tshirtSize,
            dietary,
          },
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
    setCopiedNotification(`Official invitations dispatched! In-app notifications & email client opened.`);
    setTimeout(() => setCopiedNotification(''), 4500);
  };

  const shareViaWhatsApp = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://knot.events';
    const joinLink = `${origin}/events/${event.id}?teamCode=${registeredRecord?.teamCode || teamCode}`;
    const text = `🔥 Hey! I just registered our squad "${teamName}" for *${event.title}* on Knot!\n\nJoin our team roster using Team Code: *${registeredRecord?.teamCode || teamCode}*\nDirect Join Link: ${joinLink}\n\nLet's build and win together! 🚀`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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

  const printAdmitCard = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const regId = `REG-UNSTOP-${(registeredRecord?.id || '89421').slice(-6).toUpperCase()}`;
    const candidateName = registeredRecord?.participantDetails?.fullName || currentUser?.name || fullName;
    const tName = registeredRecord?.teamName || teamName;
    const tCode = registeredRecord?.teamCode || teamCode;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Admit Card - ${event.title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f4f3f7; padding: 40px; color: #1e1b2e; }
          .pass { max-width: 640px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); border: 2px solid #6750c7; overflow: hidden; }
          .header { background: linear-gradient(135deg, #211a3d 0%, #3b2d6b 100%); color: #fff; padding: 24px 28px; }
          .header h1 { margin: 0 0 6px 0; font-size: 20px; }
          .header p { margin: 0; font-size: 13px; opacity: 0.85; }
          .badge { display: inline-block; background: #10b981; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; }
          .body { padding: 24px 28px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; border-bottom: 1px dashed #ddd; }
          .item strong { display: block; font-size: 11px; text-transform: uppercase; color: #706b7d; margin-bottom: 2px; }
          .item span { font-size: 15px; font-weight: 700; color: #211a3d; }
          .footer { padding: 20px 28px; background: #faf8fd; display: flex; justify-content: space-between; align-items: center; }
          .token { font-family: monospace; font-size: 14px; font-weight: bold; color: #6750c7; }
        </style>
      </head>
      <body>
        <div class="pass">
          <div class="header">
            <span class="badge">Verified Candidate Admit Pass</span>
            <h1>${event.title}</h1>
            <p>Hosted by ${event.organizerName} · ${event.mode === 'online' ? 'Online Sprint' : event.venue?.name || 'In-Person'}</p>
          </div>
          <div class="body">
            <div class="item"><strong>Candidate Name</strong><span>${candidateName}</span></div>
            <div class="item"><strong>Registration ID</strong><span>${regId}</span></div>
            <div class="item"><strong>Team Name & Code</strong><span>${participationType === 'team' ? `${tName} (${tCode})` : 'Individual Solo'}</span></div>
            <div class="item"><strong>Track</strong><span>${selectedTrack.toUpperCase()}</span></div>
            <div class="item"><strong>Institution / Org</strong><span>${orgCollege}</span></div>
            <div class="item"><strong>Event Date</strong><span>${formatEventDate(event.startAt, true)}</span></div>
          </div>
          <div class="footer">
            <div><small style="color: #706b7d; display:block;">CHECK-IN TOKEN</small><span class="token">${(registeredRecord?.checkInToken || 'TOKEN-UNSTOP-984').slice(0, 18)}</span></div>
            <div style="font-weight: 800; color: #10b981; font-size: 13px;">● KNOT VERIFIED ADMIT PASS</div>
          </div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const portalName = (event as { sourcePlatform?: string }).sourcePlatform || (event.listings[0]?.source) || 'Unstop';

  return (
    <div className="unstop-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="unstop-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="unstop-modal__header">
          <div className="unstop-modal__event-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span className="unstop-badge unstop-badge--portal">
                <Zap size={11} /> {portalName.toUpperCase()} ARCHITECTURE
              </span>
              <span className="unstop-badge unstop-badge--event-type">
                {eventTypeLabel(event.eventType)}
              </span>
              <span className="unstop-badge unstop-badge--mode">{eventModeLabel(event.mode)}</span>
            </div>
            <h2>{event.title}</h2>
            <p>
              Organized by <strong>{event.organizerName}</strong> ·{' '}
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
              <span>Track & Mode</span>
            </div>
            <div className="unstop-step__line" />
            <div
              className={`unstop-step ${step === 'profile' ? 'active' : ['team', 'questions', 'ticket'].includes(step) ? 'completed' : ''
                }`}
            >
              <div className="unstop-step__circle">2</div>
              <span>Profile KYC</span>
            </div>
            {participationType === 'team' && (
              <>
                <div className="unstop-step__line" />
                <div
                  className={`unstop-step ${step === 'team' ? 'active' : ['questions', 'ticket'].includes(step) ? 'completed' : ''
                    }`}
                >
                  <div className="unstop-step__circle">3</div>
                  <span>Team Invites</span>
                </div>
              </>
            )}
            <div className="unstop-step__line" />
            <div className={`unstop-step ${step === 'questions' ? 'active' : ''}`}>
              <div className="unstop-step__circle">{participationType === 'team' ? '4' : '3'}</div>
              <span>Proposal</span>
            </div>
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

        {/* Step 1: Mode & Track Selection */}
        {step === 'mode' && (
          <div className="unstop-step-body">
            <h3>1. Select Participation Mode &amp; Focus Track</h3>
            <p className="unstop-step-description">
              Choose individual participation or assemble a team with automated email dispatch. Select your problem track.
            </p>

            <div className="unstop-type-grid">
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
                  <h4>Team Participation (Recommended)</h4>
                  <p>
                    Collaborate with teammates ({minTeamSize}–{maxTeamSize} members). Full roster tracking &amp; automated email invitations.
                  </p>
                  <div className="unstop-type-card__radio">
                    <div className="inner-dot" />
                  </div>
                </div>
              )}

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
                  <h4>Individual (Solo Contributor)</h4>
                  <p>Participate independently as an individual entrant. Receive personal verified QR admit pass.</p>
                  <div className="unstop-type-card__radio">
                    <div className="inner-dot" />
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 22 }}>
              <h4 style={{ fontSize: '0.92rem', fontWeight: 750, color: 'var(--deep)', marginBottom: 8 }}>
                Select Hackathon / Event Track:
              </h4>
              <div className="unstop-tracks-grid">
                {TRACK_OPTIONS.map((track) => (
                  <div
                    key={track.id}
                    className={`unstop-track-card ${selectedTrack === track.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTrack(track.id)}
                  >
                    <div className="track-icon">{track.icon}</div>
                    <div className="track-content">
                      <div className="track-header">
                        <strong>{track.title}</strong>
                        {track.badge && <span className="track-badge">{track.badge}</span>}
                      </div>
                      <p>{track.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="unstop-footer-actions">
              <button className="button button--primary button--large" onClick={handleNextFromMode}>
                Continue to Candidate KYC <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Participant Details (KYC) */}
        {step === 'profile' && (
          <div className="unstop-step-body">
            <h3>2. Candidate Profile &amp; KYC Verification</h3>
            <p className="unstop-step-description">
              Official verification details for badge printing, team communications, and credential issuance.
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
                Official Email Address <em>*</em>
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
                  placeholder="+91 98450 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>

              <label>
                College / University / Organization <em>*</em>
                <input
                  type="text"
                  placeholder="e.g. Dayananda Sagar College of Engineering"
                  value={orgCollege}
                  onChange={(e) => setOrgCollege(e.target.value)}
                />
                <div className="unstop-quick-chips">
                  <span>Quick Pick:</span>
                  {TOP_COLLEGES.slice(0, 4).map((c) => (
                    <button key={c} type="button" className="quick-chip" onClick={() => setOrgCollege(c)}>
                      {c.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </label>

              <label>
                Graduation Year / Engineering Role
                <input
                  type="text"
                  placeholder="e.g. Batch 2027 · Full-Stack Builder"
                  value={gradYearRole}
                  onChange={(e) => setGradYearRole(e.target.value)}
                />
                <div className="unstop-quick-chips">
                  {POPULAR_ROLES.slice(0, 4).map((r) => (
                    <button key={r} type="button" className="quick-chip" onClick={() => setGradYearRole(r)}>
                      {r}
                    </button>
                  ))}
                </div>
              </label>

              <label>
                GitHub / Portfolio URL
                <input
                  type="url"
                  placeholder="https://github.com/your-handle"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                />
              </label>

              <label>
                City / Bengaluru Locality
                <input
                  type="text"
                  placeholder="e.g. Koramangala, Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label>
                  T-Shirt Size
                  <select value={tshirtSize} onChange={(e) => setTshirtSize(e.target.value)}>
                    <option value="S">S (38)</option>
                    <option value="M">M (40)</option>
                    <option value="L">L (42)</option>
                    <option value="XL">XL (44)</option>
                    <option value="XXL">XXL (46)</option>
                  </select>
                </label>
                <label>
                  Dietary Preference
                  <select value={dietary} onChange={(e) => setDietary(e.target.value)}>
                    <option value="Veg">Vegetarian</option>
                    <option value="Non-Veg">Non-Vegetarian</option>
                    <option value="Jain">Jain Food</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="unstop-footer-actions">
              <button className="button button--secondary" onClick={() => setStep('mode')}>
                <ArrowLeft size={16} /> Back
              </button>
              <button className="button button--primary button--large" onClick={handleNextFromProfile}>
                {participationType === 'team' ? 'Proceed to Team Setup' : 'Proceed to Project Details'}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Team Setup & Member Invites */}
        {step === 'team' && (
          <div className="unstop-step-body">
            <h3>3. Team Formation &amp; Teammate Email Dispatcher</h3>
            <p className="unstop-step-description">
              Form your squad of {minTeamSize} to {maxTeamSize} builders. Dispatch automated email invitations with 1-click join links.
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
                <UserPlus size={16} /> Create New Squad (Leader)
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
                  <label style={{ flex: 1 }}>
                    Team Name <em>*</em>
                    <input
                      type="text"
                      placeholder="e.g. NexGen Builders"
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <h4 style={{ margin: '0 0 2px 0' }}>Invite Teammates via Email &amp; WhatsApp</h4>
                      <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--muted)' }}>
                        Teammates receive immediate in-app invitations &amp; official email drafts.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="button button--secondary button--small"
                      onClick={() => setPreviewEmailOpen(!previewEmailOpen)}
                    >
                      <Eye size={13} /> {previewEmailOpen ? 'Hide Email Preview' : 'Preview Invite Email'}
                    </button>
                  </div>

                  {/* Email Preview Drawer */}
                  {previewEmailOpen && (
                    <div className="unstop-email-preview-card">
                      <div className="preview-card-header">
                        <Mail size={14} color="#6366f1" />
                        <span>Official Teammate Email Template</span>
                      </div>
                      <div className="preview-card-body">
                        <p><strong>From:</strong> {fullName || 'Team Leader'} (via Knot × Unstop)</p>
                        <p><strong>Subject:</strong> Invitation to join team &ldquo;{teamName}&rdquo; for {event.title}</p>
                        <div className="preview-card-letter">
                          <p>Hi there,</p>
                          <p>
                            <strong>{fullName || 'Your teammate'}</strong> has invited you to join team <strong>&ldquo;{teamName}&rdquo;</strong> for <strong>{event.title}</strong> on Knot!
                          </p>
                          <p><strong>Your Assigned Role:</strong> {newMemberRole}</p>
                          <p><strong>Team Invite Code:</strong> <code style={{ background: '#ede9fe', padding: '2px 6px', borderRadius: 4, color: '#4338ca', fontWeight: 800 }}>{teamCode}</code></p>
                          <div style={{ marginTop: 10 }}>
                            <span style={{ display: 'inline-block', background: '#6366f1', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: '0.78rem', fontWeight: 700 }}>
                              👉 Accept Invitation &amp; Join Team
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="unstop-add-member-row" style={{ marginTop: 12 }}>
                    <input
                      type="email"
                      placeholder="Teammate's email address..."
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                    />
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      style={{ width: 170 }}
                    >
                      {POPULAR_ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
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
                      <span className="unstop-tag unstop-tag--success">👑 Team Leader</span>
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
                        <span className="unstop-tag unstop-tag--pending">✉️ Invite Queued</span>
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

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
                    <small className="unstop-roster-count">
                      Current squad: <strong>{teamMembers.length + 1}</strong> / {maxTeamSize} (Min required: {minTeamSize})
                    </small>
                    <button
                      type="button"
                      className="button button--ghost-light button--small"
                      onClick={shareViaWhatsApp}
                    >
                      <MessageCircle size={14} color="#10b981" /> WhatsApp Squad Invite
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="unstop-team-join-box">
                <label>
                  Enter 8-digit Team Invite Code <em>*</em>
                  <div className="unstop-input-with-action">
                    <input
                      type="text"
                      placeholder="e.g. TEAM-KN-8492"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                    />
                    <button type="button" className="button button--secondary" onClick={handleVerifyJoinCode}>
                      Verify Team Code
                    </button>
                  </div>
                </label>

                {verifiedLeaderReg && (
                  <div className="unstop-verified-team-card">
                    <CheckCircle2 size={24} className="verified-icon" />
                    <div>
                      <h4>Team &ldquo;{verifiedLeaderReg.teamName}&rdquo; Verified</h4>
                      <p>
                        Led by <strong>{verifiedLeaderReg.participantDetails?.fullName || 'Team Leader'}</strong> ·{' '}
                        {verifiedLeaderReg.teamMembers?.length ?? 1} members currently confirmed
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
                Proceed to Project Proposal <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Questions & Proposal */}
        {step === 'questions' && (
          <div className="unstop-step-body">
            <h3>4. Project Proposal &amp; Hackathon Terms</h3>
            <p className="unstop-step-description">
              Provide your initial project concept and confirm community rules for verified registration.
            </p>

            <div className="unstop-form-grid" style={{ marginBottom: 18 }}>
              <label>
                Proposed Project Title <em>*</em>
                <input
                  type="text"
                  placeholder="e.g. Knot Autonomous Event Intelligence"
                  value={projectTitle}
                  onChange={(e) => setProjectTitle(e.target.value)}
                />
              </label>

              <label>
                2-Sentence Pitch / Problem Statement Solution
                <textarea
                  rows={2}
                  placeholder="Briefly describe what your squad plans to build..."
                  value={projectPitch}
                  onChange={(e) => setProjectPitch(e.target.value)}
                />
              </label>
            </div>

            {event.registration.questions && event.registration.questions.length > 0 && (
              <div className="unstop-questions-list">
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.9rem' }}>Organizer Questions:</h4>
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
                  I confirm that all candidate details are accurate and I meet all age and participation criteria.
                </span>
              </label>
              <label className="consent-check" style={{ marginTop: 8 }}>
                <input
                  type="checkbox"
                  checked={agreedToConduct}
                  onChange={(e) => setAgreedToConduct(e.target.checked)}
                />
                <span>
                  I agree to the Hackathon Code of Conduct, intellectual property integrity rules, and in-person check-in requirements.
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
                disabled={submitting || !selfDeclaredAgeRuleMet || !agreedToConduct}
                onClick={handleSubmitRegistration}
              >
                {submitting ? 'Submitting Application...' : 'Confirm Application & Generate Admit Pass'} <Check size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Admit Pass & Ticket Confirmation */}
        {step === 'ticket' && (
          <div className="unstop-step-body unstop-confirmation-view">
            <div className="unstop-success-banner">
              <div className="unstop-success-icon">
                <CheckCircle2 size={44} />
              </div>
              <h3>Official Registration Confirmed!</h3>
              <p>
                Your application for <strong>{event.title}</strong> is verified. Your digital admit pass has been generated.
              </p>
            </div>

            {/* Official Pass Ticket */}
            <div className="unstop-pass-ticket">
              <div className="unstop-pass-ticket__header">
                <div>
                  <span className="unstop-badge unstop-badge--accent">
                    <Sparkles size={11} /> {portalName.toUpperCase()} VERIFIED ADMIT PASS
                  </span>
                  <h4>{event.title}</h4>
                  <small>Organized by {event.organizerName} · Track: {selectedTrack.toUpperCase()}</small>
                </div>
                <div className="unstop-pass-ref">
                  <span>REGISTRATION ID</span>
                  <strong>
                    REG-UNSTOP-
                    {(registeredRecord?.id || '89421').slice(-6).toUpperCase()}
                  </strong>
                </div>
              </div>

              <div className="unstop-pass-ticket__body">
                <div className="unstop-pass-item">
                  <User size={15} />
                  <div>
                    <span>CANDIDATE</span>
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
                    <span>VENUE &amp; REPORTING</span>
                    <strong>{event.mode === 'online' ? 'Online Sprint' : event.venue?.name || 'In-Person'}</strong>
                  </div>
                </div>

                {registeredRecord?.participationType === 'team' && registeredRecord.teamName && (
                  <div className="unstop-pass-item unstop-pass-item--team">
                    <Users size={15} />
                    <div>
                      <span>TEAM ROSTER &amp; CODE</span>
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
                  <span className="unstop-verified-pill">● Verified Admit Pass</span>
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

                <div className="unstop-invite-email-action">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <p style={{ margin: 0 }}>
                      <Mail size={16} /> <strong>Teammates:</strong>{' '}
                      {teamMembers.map((m) => m.email).join(', ') || 'No extra teammates queued'}
                    </p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="button button--accent button--small" onClick={handleSendInviteEmails}>
                        <Mail size={14} /> Dispatch Teammate Emails
                      </button>
                      <button className="button button--secondary button--small" onClick={shareViaWhatsApp}>
                        <MessageCircle size={14} color="#10b981" /> WhatsApp Invite
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Commute & Metro Buddy travel pool suggestion */}
            {event.mode !== 'online' && (
              <div className="unstop-commute-callout">
                <div className="unstop-commute-callout__content">
                  <Navigation size={18} className="unstop-commute-icon" />
                  <div>
                    <strong>Heading there in person? Join a Commute &amp; Metro Squad!</strong>
                    <p>Coordinate travel from Indiranagar Metro, Silk Board, or HSR BDA with fellow attendees to eliminate travel friction.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="button button--secondary button--small"
                  onClick={() => {
                    onClose();
                    setTimeout(() => {
                      const el = document.querySelector('.commute-buddy-panel');
                      el?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                >
                  Find Commute Squad
                </button>
              </div>
            )}

            {/* Action Bar */}
            <div className="unstop-ticket-actions">
              <button className="button button--secondary" onClick={printAdmitCard}>
                <FileText size={16} /> Print / Save Admit Card
              </button>
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
