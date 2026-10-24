import { AlertCircle, Check, FlaskConical, Sparkles } from 'lucide-react';
import { ageRuleLabel } from '../domain/age';
import type { AgeRule, FitLabel } from '../domain/types';

export function SampleBadge() {
  return <span className="badge badge--sample"><FlaskConical size={12} /> Sample</span>;
}

export function AgeBadge({ rule }: { rule: AgeRule }) {
  return <span className={`badge badge--age ${rule.mode === 'not_stated' ? 'badge--muted' : ''}`}><AlertCircle size={12} />{ageRuleLabel(rule)}</span>;
}

export function FitBadge({ label }: { label: FitLabel }) {
  if (!label) return null;
  if (label === 'strong') return <span className="fit fit--strong"><Sparkles size={13} /> Strong fit</span>;
  if (label === 'possible') return <span className="fit fit--possible"><Check size={13} /> Possible fit</span>;
  return <span className="fit fit--not">Not currently eligible</span>;
}
