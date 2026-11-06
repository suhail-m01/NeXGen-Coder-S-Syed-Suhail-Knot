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

// Pre-seeded local builder network for instant matching in Bengaluru
const COMMUNITY_BUILDER_ROSTER = [
  { id: 'b-1', name: 'Zoya Khan', role: 'ui_ux' as BuilderRoleKey, locality: 'Indiranagar', skills: ['Figma', 'UI/UX', 'Design Systems'], match: '96% Fit' },
  { id: 'b-2', name: 'Tanmay Bhatt', role: 'ai_ml' as BuilderRoleKey, locality: 'Koramangala', skills: ['Gemini API', 'PyTorch', 'Agents'], match: '94% Fit' },
  { id: 'b-3', name: 'Naveen Kumar', role: 'backend' as BuilderRoleKey, locality: 'HSR Layout', skills: ['Node.js', 'PostgreSQL', 'Go'], match: '91% Fit' },
  { id: 'b-4', name: 'Meera Iyer', role: 'product_pitch' as BuilderRoleKey, locality: 'Jayanagar', skills: ['Pitching', 'Product Strategy', 'Fintech'], match: '93% Fit' },
  { id: 'b-5', name: 'Dev Sharma', role: 'frontend' as BuilderRoleKey, locality: 'Whitefield', skills: ['React', 'TypeScript', 'Tailwind'], match: '89% Fit' },
];

export function TeamSynergyMatrix({
  event,
  initialTeamName = 'HyperTeam Alpha',
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
    // Default initial team state: current user + a frontend teammate
    return {
      frontend: { filled: true, memberName: currentUser?.name ?? 'Alam Nawaz Sha', skills: ['React', 'TypeScript', 'Tailwind'] },
      backend: { filled: true, memberName: 'Suhail Syed', skills: ['Node.js', 'Postgres', 'API Architecture'] },
      ai_ml: { filled: true, memberName: 'Aarav Patel', skills: ['Gemini API', 'PyTorch', 'RAG'] },
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

    // Calculate dynamic percentage
    let score = 0;
    if (filledCount === 1) score = 35;
    else if (filledCount === 2) score = 60;
    else if (filledCount === 3) score = 82;
    else if (filledCount === 4) score = 94;
    else if (filledCount === 5) score = 100;

    const strengths: string[] = [];
    if (filledRoles.frontend.filled && filledRoles.backend.filled) {
      strengths.push('Full-stack delivery pipeline is locked in.');
    }
    if (filledRoles.ai_ml.filled) {
      strengths.push('High-scoring technical AI/ML capability ready.');
    }
    if (filledRoles.ui_ux.filled) {
      strengths.push('Clean user interface design guarantees high demo impact.');
    }
    if (filledRoles.product_pitch.filled) {
      strengths.push('Dedicated pitch presenter ensures top jury scores.');
    }

    const recommendations: string[] = [];
    if (!filledRoles.ui_ux.filled) {
      recommendations.push('Add a UI/UX Designer to transform your functional code into an award-winning prototype.');
    }
    if (!filledRoles.product_pitch.filled) {
      recommendations.push('Add a Product / Pitch Lead. 40% of Vecnaverse judging criteria is real-world problem articulation.');
    }
    if (!filledRoles.ai_ml.filled) {
      recommendations.push('Integrate an AI / ML engineer to elevate your project from a basic CRUD app to an intelligent system.');
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
          memberName: currentUser.name,
          skills: CANONICAL_ROLES.find((r) => r.key === roleKey)?.recommendedSkills.slice(0, 3) ?? [],
        },
      }));
      setNotification(`You filled the ${CANONICAL_ROLES.find((r) => r.key === roleKey)?.label} slot!`);
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
    setNotification(`Invitation dispatched to ${builder.name} (${builder.locality})! Role slot filled.`);
    setTimeout(() => setNotification(null), 5000);
  };

  const copySynergyReport = () => {
    const text = `🏆 *Hackathon Team Synergy Report: ${teamName}*
📊 *Synergy Score:* ${synergyProfile.synergyScore}%
👥 *Roles Covered:* ${synergyProfile.slots.filter((s) => s.filled).map((s) => s.label).join(', ')}
🔍 *Looking for:* ${synergyProfile.missingRoles.map((r) => CANONICAL_ROLES.find((c) => c.key === r)?.label).join(', ') || 'Team is complete!'}
⚡ Formed on Knot: ${typeof window !== 'undefined' ? window.location.href : ''}`;
    navigator.clipboard.writeText(text);
    setNotification('Synergy Report copied to clipboard! Share it in WhatsApp/Discord.');
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className={`team-synergy-matrix ${className}`}>
      <div className="synergy-header">
        <div className="synergy-title-box">
          <div className="synergy-badge">
            <Sparkles size={13} />
            <span>AI Team Formation Arena</span>
          </div>
          <h3>Hackathon Team Synergy &amp; Skill Balance Matrix</h3>
          <p>
            Evaluate your hackathon squad across the 5 essential winning disciplines.
            Spot missing roles early and invite local builders before registration closes.
          </p>
        </div>

        <button
          type="button"
          className="button button--secondary button--small"
          onClick={copySynergyReport}
          title="Share Synergy Report"
        >
          <Share2 size={14} /> Share Synergy Report
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
            <span className="synergy-percentage-label">Synergy</span>
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
                {synergyProfile.synergyScore >= 95 ? '🔥 High Winning Probability' : synergyProfile.synergyScore >= 80 ? '⚡ Solid Balanced Squad' : '⚠️ Missing Key Disciplines'}
              </span>
            </div>
            <p className="synergy-score-summary">
              {synergyProfile.missingRoles.length === 0
                ? 'Your squad possesses all 5 core disciplines! You are well prepared for technical implementation, UX, and jury evaluation.'
                : `Your team has ${5 - synergyProfile.missingRoles.length} of 5 disciplines covered. Adding ${synergyProfile.missingRoles.map((r) => CANONICAL_ROLES.find((c) => c.key === r)?.label).join(' & ')} will maximize your chances.`}
            </p>
          </div>
        </div>

        {/* Actionable recommendations */}
        {synergyProfile.recommendations.length > 0 && (
          <div className="synergy-recommendations-box">
            <strong>Key Recommendations to Reach 100%:</strong>
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
                      <UserPlus size={14} /> Find Local Builder
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
            <span className="eyebrow">Hyperlocal Builder Radar</span>
            <h3>
              Invite {CANONICAL_ROLES.find((r) => r.key === invitingRole)?.label}
            </h3>
            <p>
              Verified builders in nearby Bengaluru localities with matching skills available for hackathon teams:
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
                        <span className="synergy-match-badge">{builder.match}</span>
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
                    <PlusCircle size={14} /> Invite to Squad
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
