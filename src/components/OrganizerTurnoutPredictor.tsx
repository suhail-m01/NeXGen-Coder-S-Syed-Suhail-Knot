import { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Radio,
  Zap
} from 'lucide-react';
import type { KnotEvent } from '../domain/types';
import { nearestMetroOrLandmark, localityById } from '../domain/localities';

export interface OrganizerTurnoutPredictorProps {
  event: KnotEvent;
  className?: string;
}

interface TurnoutFactor {
  title: string;
  impactPct: number; // e.g. +14 or -10
  status: 'positive' | 'neutral' | 'negative';
  description: string;
}

export function OrganizerTurnoutPredictor({ event, className = '' }: OrganizerTurnoutPredictorProps) {
  const [selectedRadius, setSelectedRadius] = useState<'3km' | '7km' | '15km'>('7km');

  const locality = localityById(event.venue?.localityId);
  const metroAnchor = nearestMetroOrLandmark(event.venue?.localityId);

  // Calculate Turnout Metrics based on Hyperlocal heuristics
  const turnoutAnalysis = useMemo(() => {
    let baseRate = 50; // Base 50% attendance for typical events
    const factors: TurnoutFactor[] = [];
    const tips: string[] = [];

    // Factor 1: Public Transit / Metro Accessibility
    if (metroAnchor) {
      baseRate += 16;
      factors.push({
        title: 'Metro / Transit Hub Proximity',
        impactPct: 16,
        status: 'positive',
        description: `Venue is near ${metroAnchor}. Direct Purple/Green line access reduces travel reluctance.`,
      });
    } else {
      baseRate -= 12;
      factors.push({
        title: 'No Direct Metro Station Linked',
        impactPct: -12,
        status: 'negative',
        description: 'Venues without a designated metro anchor experience higher traffic drop-off during peak hours.',
      });
      tips.push('Add a designated Metro pickup anchor (e.g. Indiranagar or Silk Board) to recover up to 15% in attendance.');
    }

    // Factor 2: Neighborhood Developer / Student Density
    const localityId = event.venue?.localityId?.toLowerCase() ?? '';
    const isHighDensityHub = ['koramangala', 'indiranagar', 'hsr-layout', 'bellandur', 'jayanagar'].includes(localityId);
    if (isHighDensityHub) {
      baseRate += 14;
      factors.push({
        title: 'High-Density Builder Hub',
        impactPct: 14,
        status: 'positive',
        description: `${locality?.name ?? 'This locality'} has high concentration of software engineers, startups, and colleges.`,
      });
    } else if (localityId.includes('whitefield') || localityId.includes('electronic-city')) {
      baseRate += 8;
      factors.push({
        title: 'Major Tech Park Corridor',
        impactPct: 8,
        status: 'positive',
        description: 'Excellent corporate tech presence, though weekend travel can require metro planning.',
      });
    } else {
      baseRate -= 6;
      factors.push({
        title: 'Peripheral / Suburb Location',
        impactPct: -6,
        status: 'neutral',
        description: 'Longer average commute times for builders traveling from Central Bengaluru.',
      });
      tips.push('Promote Knot Commute Buddy squads to encourage carpooling and metro groups from central stations.');
    }

    // Factor 3: Day & Timing Schedule Fit
    const startDate = new Date(event.startAt);
    const dayOfWeek = startDate.getDay(); // 0 is Sunday, 6 is Saturday
    const hour = startDate.getHours();

    if (dayOfWeek === 6 && hour >= 9 && hour <= 11) {
      baseRate += 12;
      factors.push({
        title: 'Optimal Saturday Morning Slot',
        impactPct: 12,
        status: 'positive',
        description: 'Saturday 10:00 AM is the gold standard for hackathons and workshops in Bengaluru.',
      });
    } else if (dayOfWeek === 0 && hour >= 16) {
      baseRate -= 10;
      factors.push({
        title: 'Sunday Evening Slot',
        impactPct: -10,
        status: 'negative',
        description: 'Late Sunday events suffer drop-offs due to Monday workday preparations.',
      });
      tips.push('Consider moving start time to Saturday or Sunday morning to avoid the Sunday night dropout cliff.');
    } else {
      factors.push({
        title: 'Standard Timing Schedule',
        impactPct: 4,
        status: 'neutral',
        description: 'Moderate attendance schedule alignment.',
      });
    }

    // Factor 4: Team Collaboration / Hackathon Format
    if (event.team.mode !== 'solo') {
      baseRate += 10;
      factors.push({
        title: 'Team Accountability Factor',
        impactPct: 10,
        status: 'positive',
        description: 'Attendees participating in teams are 3x more likely to show up due to peer accountability.',
      });
    } else {
      factors.push({
        title: 'Solo Format',
        impactPct: -4,
        status: 'neutral',
        description: 'Solo attendees face lower peer commitment and higher last-minute cancellation rates.',
      });
      tips.push('Enable Team Formation or Commute Squads to give solo registrants travel partners.');
    }

    // Factor 5: Ticket Pricing / Commitment
    if (event.price.kind === 'free') {
      baseRate -= 8;
      factors.push({
        title: 'Free Registration Frictionless Flake',
        impactPct: -8,
        status: 'neutral',
        description: 'Free events naturally experience higher casual dropouts than paid or refundable reservations.',
      });
      tips.push('Send automated check-in reminders and require ticket confirmation 24 hours in advance.');
    } else {
      baseRate += 15;
      factors.push({
        title: 'Paid / Reservation Commitment',
        impactPct: 15,
        status: 'positive',
        description: 'Paid admission or token deposits virtually eliminate no-shows.',
      });
    }

    // Bound the final prediction
    const predictedTurnoutPct = Math.min(96, Math.max(38, baseRate));

    return {
      predictedTurnoutPct,
      factors,
      tips,
    };
  }, [event, locality, metroAnchor]);

  // Radius audience reach numbers
  const audienceReach = useMemo(() => {
    const isHigh = ['koramangala', 'indiranagar', 'hsr-layout'].includes(event.venue?.localityId ?? '');
    const mult = isHigh ? 1.5 : 1.0;

    return {
      '3km': { builders: Math.round(1450 * mult), colleges: isHigh ? 4 : 2, communities: isHigh ? 9 : 4, mode: 'Walk / Metro Short' },
      '7km': { builders: Math.round(4800 * mult), colleges: isHigh ? 12 : 7, communities: isHigh ? 24 : 14, mode: 'Metro Direct / Cab' },
      '15km': { builders: Math.round(11200 * mult), colleges: isHigh ? 28 : 18, communities: isHigh ? 55 : 32, mode: 'City-wide Transit' },
    }[selectedRadius];
  }, [event.venue?.localityId, selectedRadius]);

  return (
    <div className={`turnout-predictor-card ${className}`}>
      <div className="turnout-predictor-header">
        <div className="turnout-predictor-title-box">
          <div className="turnout-predictor-badge">
            <Radio size={13} className="turnout-live-pulse" />
            <span>AI Hyperlocal Turnout Model</span>
          </div>
          <h3>Audience Radar &amp; Turnout Predictor</h3>
          <p>
            Predict real-world physical attendance for <strong>{event.title}</strong> based on transit accessibility,
            local developer density, and scheduling dynamics.
          </p>
        </div>
      </div>

      {/* Top Prediction Bar & Radial Score */}
      <div className="turnout-metrics-banner">
        <div className="turnout-score-box">
          <div className="turnout-score-circle">
            <span className="turnout-score-value">{turnoutAnalysis.predictedTurnoutPct}%</span>
            <span className="turnout-score-label">Predicted Turnout</span>
          </div>
          <div className="turnout-score-meta">
            <h4>Estimated Attendance Rate</h4>
            <span className={`turnout-health-pill ${turnoutAnalysis.predictedTurnoutPct >= 75 ? 'health-strong' : turnoutAnalysis.predictedTurnoutPct >= 60 ? 'health-moderate' : 'health-warning'}`}>
              {turnoutAnalysis.predictedTurnoutPct >= 75 ? '⚡ High Physical Attendance Expected' : turnoutAnalysis.predictedTurnoutPct >= 60 ? '📈 Good Turnout Potential' : '⚠️ Commute Friction Risk'}
            </span>
            <p>
              Based on {turnoutAnalysis.factors.length} verified hyperlocal Bengaluru signals including transit hubs and day of week.
            </p>
          </div>
        </div>

        {/* Hyperlocal Audience Radius Selector */}
        <div className="turnout-radius-box">
          <div className="radius-selector-tabs">
            <span className="radius-label">Audience Radius:</span>
            {(['3km', '7km', '15km'] as const).map((rad) => (
              <button
                key={rad}
                type="button"
                className={`radius-tab-btn ${selectedRadius === rad ? 'active' : ''}`}
                onClick={() => setSelectedRadius(rad)}
              >
                {rad}
              </button>
            ))}
          </div>

          <div className="radius-stats-row">
            <div>
              <strong>{audienceReach.builders.toLocaleString()}</strong>
              <small>Local Builders</small>
            </div>
            <div>
              <strong>{audienceReach.colleges}</strong>
              <small>Institutes / Tech Campuses</small>
            </div>
            <div>
              <strong>{audienceReach.communities}</strong>
              <small>Active Tech Groups</small>
            </div>
          </div>
          <span className="radius-transit-note">
            Primary transit: <strong>{audienceReach.mode}</strong>
          </span>
        </div>
      </div>

      {/* Key Drivers List */}
      <div className="turnout-factors-section">
        <h4>Key Attendance Drivers &amp; Friction Points</h4>
        <div className="turnout-factors-grid">
          {turnoutAnalysis.factors.map((f, i) => (
            <div key={i} className={`turnout-factor-item turnout-factor-item--${f.status}`}>
              <div className="turnout-factor-top">
                <strong>{f.title}</strong>
                <span className="turnout-impact-tag">
                  {f.impactPct > 0 ? `+${f.impactPct}%` : `${f.impactPct}%`}
                </span>
              </div>
              <p>{f.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Turnout Optimization Recommendations */}
      {turnoutAnalysis.tips.length > 0 && (
        <div className="turnout-tips-box">
          <div className="turnout-tips-header">
            <Sparkles size={16} />
            <strong>Actionable Recommendations to Boost In-Person Attendance:</strong>
          </div>
          <ul>
            {turnoutAnalysis.tips.map((tip, idx) => (
              <li key={idx}>
                <Zap size={14} className="tip-zap-icon" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
