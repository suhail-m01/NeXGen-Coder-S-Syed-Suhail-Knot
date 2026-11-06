import { useState, useMemo } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  PlusCircle, 
  Share2, 
  Palette,
  Code,
  Server,
  BrainCircuit,
  Rocket,
  Check,
  UserPlus
} from 'lucide-react';
import type { KnotEvent, BuilderRoleKey, TeamRoleSlot, TeamSynergyProfile } from '../domain/types';
import { useApp } from '../state/AppContext';

export interface TeamSynergyMatrixProps {
  event?: KnotEvent;
  initialTeamName?: string;
  initialMembers?: Array<{ name: string; role: BuilderRoleKey; skills: string[] }>;
  className?: string;
}

const CANONICAL_ROLES: Array<{
  key: BuilderRoleKey;
  label: string;
  shortDesc: string;
  icon: typeof Code;
  recommendedSkills: string[];
}> = [
  {
    key: 'frontend',
    label: 'Frontend & UI Builder',
    shortDesc: 'React, Next.js, TypeScript, Tailwind, Responsive Web',
    icon: Code,
    recommendedSkills: ['React', 'TypeScript', 'Tailwind', 'Next.js', 'Vite'],
  },
  {
    key: 'backend',
    label: 'Backend & Systems Architect',
    shortDesc: 'Node.js, Python, APIs, Supabase, Postgres, Auth',
    icon: Server,
    recommendedSkills: ['Node.js', 'Python', 'PostgreSQL', 'APIs', 'Docker'],
  },
  {
    key: 'ai_ml',
    label: 'AI / ML & Intelligent Systems',
    shortDesc: 'LLMs, RAG, PyTorch, Agents, Computer Vision, Embeddings',
    icon: BrainCircuit,
    recommendedSkills: ['Gemini API', 'PyTorch', 'RAG', 'Agents', 'FastAPI'],
  },
  {
    key: 'ui_ux',
    label: 'UI/UX & Prototype Designer',
    shortDesc: 'Figma, Design Systems, UX Flows, Interactive Prototypes',
    icon: Palette,
    recommendedSkills: ['Figma', 'UI/UX', 'Wireframing', 'Prototyping', 'Design Systems'],
  },
  {
    key: 'product_pitch',
    label: 'Product, Pitch & Domain Lead',
    shortDesc: 'Problem Validation, Pitch Deck, Demo Flow, Hackathon Storytelling',
    icon: Rocket,
    recommendedSkills: ['Pitching', 'Product Strategy', 'Demo Execution', 'Problem Framing'],
  },
];

// Fictional planning aids only; these are not accounts, recommendations, or invite recipients.
const COMMUNITY_BUILDER_ROSTER = [
  { id: 'sample-ui', name: 'Sample UI/UX role', role: 'ui_ux' as BuilderRoleKey, locality: 'Sample profile', skills: ['Figma', 'UI/UX', 'Design Systems'] },
  { id: 'sample-ai', name: 'Sample AI/ML role', role: 'ai_ml' as BuilderRoleKey, locality: 'Sample profile', skills: ['Gemini API', 'PyTorch', 'Agents'] },
  { id: 'sample-backend', name: 'Sample backend role', role: 'backend' as BuilderRoleKey, locality: 'Sample profile', skills: ['Node.js', 'PostgreSQL', 'Go'] },
  { id: 'sample-product', name: 'Sample product role', role: 'product_pitch' as BuilderRoleKey, locality: 'Sample profile', skills: ['Pitching', 'Product Strategy', 'Fintech'] },
  { id: 'sample-frontend', name: 'Sample frontend role', role: 'frontend' as BuilderRoleKey, locality: 'Sample profile', skills: ['React', 'TypeScript', 'Tailwind'] },
];

export function TeamSynergyMatrix({
  event,
  initialTeamName = 'Local team draft',
  initialMembers,
  className = '',
}: TeamSynergyMatrixProps) {
  const { currentUser, requireAuth } = useApp();

  const [teamName, setTeamName] = useState(initialTeamName);
  const [filledRoles, setFilledRoles] = useState<Record<BuilderRoleKey, { filled: boolean; memberName?: string; skills: string[] }>>(() => {
    if (initialMembers && initialMembers.length > 0) {
      const state: Record<BuilderRoleKey, { filled: boolean; memberName?: string; skills: string[] }> = {
        frontend: { filled: false, skills: [] },
        backend: { filled: false, skills: [] },
        ai_ml: { filled: false, skills: [] },
        ui_ux: { filled: false, skills: [] },
        product_pitch: { filled: false, skills: [] },
      };
      initialMembers.forEach((m) => {
        state[m.role] = { filled: true, memberName: m.name, skills: m.skills };
      });
      return state;
    }
    // Start empty: never expose a signed-in/minor identity or invent teammates.
    return {
      frontend: { filled: false, skills: [] },
      backend: { filled: false, skills: [] },
      ai_ml: { filled: false, skills: [] },
      ui_ux: { filled: false, skills: [] },
      product_pitch: { filled: false, skills: [] },
    };
  });

  const [invitingRole, setInvitingRole] = useState<BuilderRoleKey | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Compute synergy score and insights
  const synergyProfile = useMemo((): TeamSynergyProfile => {
    const slots: TeamRoleSlot[] = CANONICAL_ROLES.map((r) => {
      const data = filledRoles[r.key];
      return {
        role: r.key,
        label: r.label,
        description: r.shortDesc,
        filled: data.filled,
        memberName: data.memberName,
        skills: data.skills.length > 0 ? data.skills : r.recommendedSkills,
      };
    });

    const filledCount = slots.filter((s) => s.filled).length;
    const missingRoles = slots.filter((s) => !s.filled).map((s) => s.role);

    // Transparent role coverage only; this is not a success probability.
    const score = Math.round((filledCount / CANONICAL_ROLES.length) * 100);

    const strengths: string[] = [];
    if (filledRoles.frontend.filled && filledRoles.backend.filled) {
      strengths.push('Frontend and backend roles are covered in this draft.');
    }
    if (filledRoles.ai_ml.filled) {
      strengths.push('The AI/ML planning role is covered.');
    }
    if (filledRoles.ui_ux.filled) {
      strengths.push('The UI/UX planning role is covered.');
    }
    if (filledRoles.product_pitch.filled) {
      strengths.push('The product/pitch planning role is covered.');
    }

    const recommendations: string[] = [];
    if (!filledRoles.ui_ux.filled) {
      recommendations.push('Consider whether your team needs a UI/UX designer.');
    }
    if (!filledRoles.product_pitch.filled) {
      recommendations.push('Consider whether your team needs a product or pitch lead; judging criteria vary by event.');
    }
    if (!filledRoles.ai_ml.filled) {
      recommendations.push('Add an AI/ML role only if the project actually needs those skills.');
    }

    return {
      teamName,
      synergyScore: score,
      slots,
      missingRoles,
      strengths,
      recommendations,
    };
  }, [filledRoles, teamName]);

  const handleToggleClaim = (roleKey: BuilderRoleKey) => {
    if (!currentUser) {
      requireAuth(event ? `/events/${event.id}` : '/communities', 'manage team slots');
      return;
    }
    const current = filledRoles[roleKey];
    if (current.filled) {
      setFilledRoles((prev) => ({
        ...prev,
        [roleKey]: { filled: false, skills: [] },
      }));
      setNotification(`Opened up the ${CANONICAL_ROLES.find((r) => r.key === roleKey)?.label} slot.`);
    } else {
      setFilledRoles((prev) => ({
        ...prev,
        [roleKey]: {
          filled: true,
          memberName: 'You (local draft)',
          skills: CANONICAL_ROLES.find((r) => r.key === roleKey)?.recommendedSkills.slice(0, 3) ?? [],
        },
      }));
      setNotification(`You filled the ${CANONICAL_ROLES.find((r) => r.key === roleKey)?.label} slot in this local draft.`);
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handleInviteBuilder = (builder: typeof COMMUNITY_BUILDER_ROSTER[0]) => {
    setFilledRoles((prev) => ({
      ...prev,
      [builder.role]: {
        filled: true,
        memberName: builder.name,
        skills: builder.skills,
      },
    }));
    setInvitingRole(null);
    setNotification(`Added ${builder.name} to this local draft. No invitation was sent.`);
    setTimeout(() => setNotification(null), 5000);
  };

  const copySynergyReport = () => {
    const text = `🏆 *Hackathon Team Synergy Report: ${teamName}*
📊 *Role coverage (local draft):* ${synergyProfile.synergyScore}%
👥 *Roles Covered:* ${synergyProfile.slots.filter((s) => s.filled).map((s) => s.label).join(', ')}
🔍 *Looking for:* ${synergyProfile.missingRoles.map((r) => CANONICAL_ROLES.find((c) => c.key === r)?.label).join(', ') || 'Team is complete!'}
⚡ Local planning draft: ${typeof window !== 'undefined' ? window.location.href : ''}`;
    navigator.clipboard.writeText(text);
    setNotification('Local role-coverage report copied. It contains no success prediction or invitation status.');
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className={`team-synergy-matrix ${className}`}>
      <div className="synergy-header">
        <div className="synergy-title-box">
          <div className="synergy-badge">
            <Sparkles size={13} />
            <span>Local team planning worksheet</span>
          </div>
          <h3>Hackathon Role Coverage &amp; Skill Planning</h3>
          <p>
            Plan five common hackathon disciplines in this browser-only worksheet.
            Sample roles are fictional; adding one does not invite a person or create a team registration.
          </p>
        </div>

        <button
          type="button"
          className="button button--secondary button--small"
          onClick={copySynergyReport}
          title="Share role-coverage draft"
        >
          <Share2 size={14} /> Share role-coverage draft
        </button>
      </div>

      {notification && (
        <div className="synergy-notification-banner">
          <Check size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Score & Radar Card */}
      <div className="synergy-score-card">
        <div className="synergy-score-display">
          <div className="synergy-radial-ring">
            <span className="synergy-percentage">{synergyProfile.synergyScore}%</span>
            <span className="synergy-percentage-label">Role coverage</span>
          </div>
          <div className="synergy-score-details">
            <div className="synergy-status-line">
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="synergy-team-name-input"
                title="Edit squad name"
                aria-label="Squad name"
              />
              <span className={`synergy-grade-pill ${synergyProfile.synergyScore >= 90 ? 'synergy-grade-pill--high' : synergyProfile.synergyScore >= 75 ? 'synergy-grade-pill--mid' : 'synergy-grade-pill--low'}`}>
                {synergyProfile.synergyScore >= 95 ? 'All planning roles covered' : synergyProfile.synergyScore >= 80 ? 'Most planning roles covered' : 'Roles still open'}
              </span>
            </div>
            <p className="synergy-score-summary">
              {synergyProfile.missingRoles.length === 0
                ? 'All five planning roles are covered in this local draft. This is not a prediction of event outcomes.'
                : `Your team has ${5 - synergyProfile.missingRoles.length} of 5 disciplines covered. Adding ${synergyProfile.missingRoles.map((r) => CANONICAL_ROLES.find((c) => c.key === r)?.label).join(' & ')} remain open in this draft.`}
            </p>
          </div>
        </div>

        {/* Actionable recommendations */}
        {synergyProfile.recommendations.length > 0 && (
          <div className="synergy-recommendations-box">
            <strong>Suggested planning gaps:</strong>
            <ul>
              {synergyProfile.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 5 Core Discipline Slots Grid */}
      <div className="synergy-slots-grid">
        {CANONICAL_ROLES.map((roleDef) => {
          const slot = synergyProfile.slots.find((s) => s.role === roleDef.key)!;
          const RoleIcon = roleDef.icon;
          const isFilled = slot.filled;

          return (
            <div 
              key={roleDef.key} 
              className={`synergy-slot-card ${isFilled ? 'synergy-slot-card--filled' : 'synergy-slot-card--empty'}`}
            >
              <div className="synergy-slot-card__top">
                <div className="synergy-slot-icon">
                  <RoleIcon size={18} />
                </div>
                <span className={`synergy-slot-status-pill ${isFilled ? 'is-filled' : 'is-seeking'}`}>
                  {isFilled ? 'Slot Filled' : 'Seeking Teammate'}
                </span>
              </div>

              <div className="synergy-slot-card__body">
                <div className="synergy-slot-card-title">{roleDef.label}</div>
                <p className="synergy-slot-desc">{roleDef.shortDesc}</p>

                {isFilled ? (
                  <div className="synergy-slot-occupant">
                    <CheckCircle2 size={15} />
                    <span><strong>{slot.memberName}</strong></span>
                  </div>
                ) : (
                  <div className="synergy-slot-open-notice">
                    <span>Missing discipline — looking for builder</span>
                  </div>
                )}

                <div className="synergy-slot-skills">
                  {slot.skills.slice(0, 3).map((sk) => (
                    <span key={sk} className="synergy-skill-tag">{sk}</span>
                  ))}
                </div>
              </div>

              <div className="synergy-slot-card__footer">
                {isFilled ? (
                  <button
                    type="button"
                    className="button button--ghost button--small text-button"
                    onClick={() => handleToggleClaim(roleDef.key)}
                  >
                    Open Slot
                  </button>
                ) : (
                  <div className="button-row" style={{ width: '100%' }}>
                    <button
                      type="button"
                      className="button button--secondary button--small button--full"
                      onClick={() => setInvitingRole(roleDef.key)}
                    >
                      <UserPlus size={14} /> Add sample role
                    </button>
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => handleToggleClaim(roleDef.key)}
                      title="Claim this slot yourself"
                    >
                      Claim
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Local Builder Recommendation Modal / Drawer */}
      {invitingRole && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setInvitingRole(null)}>
          <div className="modal-card" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
            <span className="eyebrow">Sample role library</span>
            <h3>
              Add sample {CANONICAL_ROLES.find((r) => r.key === invitingRole)?.label}
            </h3>
            <p>
              Fictional role profiles for local planning only. These are not verified people and cannot receive invitations:
            </p>

            <div className="synergy-builder-recommendations-list">
              {COMMUNITY_BUILDER_ROSTER.filter((b) => b.role === invitingRole).concat(
                COMMUNITY_BUILDER_ROSTER.filter((b) => b.role !== invitingRole).slice(0, 2)
              ).map((builder) => (
                <div key={builder.id} className="synergy-builder-item">
                  <div className="synergy-builder-info">
                    <div className="synergy-builder-avatar">
                      {builder.name.charAt(0)}
                    </div>
                    <div>
                      <strong>{builder.name}</strong>
                      <div className="synergy-builder-meta">
                        <span>📍 {builder.locality}</span>
                        <span>•</span>
                        <span className="synergy-match-badge">Sample profile</span>
                      </div>
                      <div className="synergy-builder-skills">
                        {builder.skills.map((s) => (
                          <small key={s}>{s}</small>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="button button--primary button--small"
                    onClick={() => handleInviteBuilder(builder)}
                  >
                    <PlusCircle size={14} /> Add to local draft
                  </button>
                </div>
              ))}
            </div>

            <div className="button-row" style={{ marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setInvitingRole(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
