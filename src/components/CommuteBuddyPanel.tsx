import { useState, useMemo } from 'react';
import { 
  MapPin, 
  Clock, 
  Plus, 
  Check, 
  MessageCircle, 
  ShieldCheck, 
  Navigation,
  Sparkles
} from 'lucide-react';
import type { KnotEvent, CommuteMode, CommuteSquad } from '../domain/types';
import { nearestMetroOrLandmark, localityById } from '../domain/localities';
import { 
  COMMUTE_TRANSIT_HUBS, 
  COMMUTE_MODE_CONFIG, 
  getCommuteSquadsForEvent, 
  joinSquad, 
  leaveSquad, 
  addSquad 
} from '../domain/commute';
import { useApp } from '../state/AppContext';

export interface CommuteBuddyPanelProps {
  event: KnotEvent;
  className?: string;
  style?: React.CSSProperties;
}

export function CommuteBuddyPanel({ event, className = '', style }: CommuteBuddyPanelProps) {
  const { currentUser, requireAuth } = useApp();
  const [squads, setSquads] = useState<CommuteSquad[]>(() => getCommuteSquadsForEvent(event.id));
  const [selectedHub, setSelectedHub] = useState<string>('all');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Form State
  const [newHub, setNewHub] = useState<string>(COMMUTE_TRANSIT_HUBS[0]);
  const [newMode, setNewMode] = useState<CommuteMode>('metro_squad');
  const [newDeparture, setNewDeparture] = useState('8:30 AM');
  const [newArrival, setNewArrival] = useState('9:15 AM');
  const [newCapacity, setNewCapacity] = useState<number>(COMMUTE_MODE_CONFIG.metro_squad.defaultCapacity);
  const [newNotes, setNewNotes] = useState('');

  const metroAnchor = nearestMetroOrLandmark(event.venue?.localityId);
  const venueLocality = localityById(event.venue?.localityId)?.name ?? 'Bengaluru';

  const filteredSquads = useMemo(() => {
    return squads.filter((s) => {
      if (selectedHub !== 'all' && !s.pickupHub.toLowerCase().includes(selectedHub.toLowerCase())) {
        return false;
      }
      if (selectedMode !== 'all' && s.mode !== selectedMode) {
        return false;
      }
      return true;
    });
  }, [squads, selectedHub, selectedMode]);

  const handleJoin = (squadId: string) => {
    if (!currentUser) {
      requireAuth(`/events/${event.id}`, 'join a commute squad');
      return;
    }
    const updated = joinSquad(event.id, squadId, {
      userId: currentUser.id,
      name: currentUser.name,
      pickupHub: squads.find((s) => s.id === squadId)?.pickupHub ?? 'Transit Hub',
      joinedAt: new Date().toISOString(),
    });
    setSquads(updated);
    setNotification('You joined this travel plan in this browser only. No server record or live group membership was created.');
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLeave = (squadId: string) => {
    if (!currentUser) return;
    const updated = leaveSquad(event.id, squadId, currentUser.id);
    setSquads(updated);
    setNotification('You left the commute squad.');
    setTimeout(() => setNotification(null), 4000);
  };

  const handleCreateSquad = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      requireAuth(`/events/${event.id}`, 'create a commute squad');
      return;
    }

    const created: CommuteSquad = {
      id: `squad-${event.id}-${Date.now()}`,
      eventId: event.id,
      pickupHub: newHub,
      mode: newMode,
      departureTime: newDeparture,
      targetArrival: newArrival,
      organizerName: currentUser.name,
      organizerContact: currentUser.email,
      capacity: Number(newCapacity) || 4,
      members: [
        {
          userId: currentUser.id,
          name: currentUser.name,
          pickupHub: newHub,
          joinedAt: new Date().toISOString(),
        },
      ],
      notes: newNotes.trim() || undefined,
    };

    const updated = addSquad(event.id, created);
    setSquads(updated);
    setShowCreateForm(false);
    setNewNotes('');
    setNotification('Your travel squad was saved in this browser only. Other attendees cannot see it on their devices.');
    setTimeout(() => setNotification(null), 5000);
  };

  const openWhatsAppCoordination = (squad: CommuteSquad) => {
    const text = `Hey! I am coordinating for the ${COMMUTE_MODE_CONFIG[squad.mode].label} to *${event.title}* from *${squad.pickupHub}* departing at ${squad.departureTime}. Join the group to travel together!`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`commute-buddy-panel ${className}`} style={style}>
      <div className="commute-buddy-panel__header">
        <div className="commute-buddy-panel__title-box">
          <div className="commute-buddy-panel__badge">
            <Sparkles size={13} />
            <span>Browser-local commute planning</span>
          </div>
          <h3>Local Commute &amp; Metro Planner</h3>
          <p>
            Draft a travel plan from a transit hub. Entries stay in this browser; sample squads are fictional,
            not live attendees or verified travel groups.
          </p>
        </div>
        <button
          type="button"
          className="button button--secondary button--small"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <Plus size={15} /> {showCreateForm ? 'Cancel' : 'Host a Travel Squad'}
        </button>
      </div>

      <div className="commute-anchor-callout" role="note">
        <ShieldCheck size={17} className="commute-anchor-icon" />
        <div><strong>Browser-only storage:</strong><span> Changes are not synced to Knot or other attendees. WhatsApp opens a share composer; it does not create or join a group.</span></div>
      </div>

      {metroAnchor && (
        <div className="commute-anchor-callout">
          <Navigation size={17} className="commute-anchor-icon" />
          <div>
            <strong>Nearest Public Transit Anchor:</strong>
            <span> {metroAnchor} (Destination: {event.venue?.name ?? venueLocality})</span>
          </div>
        </div>
      )}

      {notification && (
        <div className="commute-notification-banner">
          <Check size={16} />
          <span>{notification}</span>
        </div>
      )}

      {/* Creation Form */}
      {showCreateForm && (
        <form onSubmit={handleCreateSquad} className="commute-create-form">
          <h4>Host a New Travel Pool / Metro Squad</h4>
          <p className="commute-form-sub">
            Gather people from your area or station. Coordinate departure and split cabs or ride the metro together.
          </p>

          <div className="commute-form-grid">
            <label>
              Pickup / Assembly Hub
              <select value={newHub} onChange={(e) => setNewHub(e.target.value)}>
                {COMMUTE_TRANSIT_HUBS.map((hub) => (
                  <option key={hub} value={hub}>{hub}</option>
                ))}
              </select>
            </label>

            <label>
              Travel Mode
              <select 
                value={newMode} 
                onChange={(e) => {
                  const m = e.target.value as CommuteMode;
                  setNewMode(m);
                  setNewCapacity(COMMUTE_MODE_CONFIG[m].defaultCapacity);
                }}
              >
                <option value="metro_squad">🚇 Metro Squad (Meet at Station)</option>
                <option value="cab_pool">🚗 Cab / Auto Pool (Split fare)</option>
                <option value="bike_convoy">🏍️ Two-Wheeler Convoy / Pillion</option>
              </select>
            </label>

            <label>
              Departure Time
              <input
                type="text"
                value={newDeparture}
                onChange={(e) => setNewDeparture(e.target.value)}
                placeholder="e.g. 8:30 AM"
                required
              />
            </label>

            <label>
              Est. Arrival at Venue
              <input
                type="text"
                value={newArrival}
                onChange={(e) => setNewArrival(e.target.value)}
                placeholder="e.g. 9:15 AM"
                required
              />
            </label>

            <label>
              Max Squad Capacity
              <input
                type="number"
                min={2}
                max={20}
                value={newCapacity}
                onChange={(e) => setNewCapacity(Number(e.target.value))}
                required
              />
            </label>
          </div>

          <label style={{ marginTop: '0.75rem' }}>
            Meeting Landmark &amp; Notes (Optional)
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g. Meet near Purple Line Gate B AFC gates. Look for black backpack."
            />
          </label>

          <div className="button-row" style={{ marginTop: '1rem' }}>
            <button type="submit" className="button button--primary button--small">
              Save local travel squad
            </button>
            <button
              type="button"
              className="button button--ghost button--small"
              onClick={() => setShowCreateForm(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter Chips */}
      <div className="commute-filters-row">
        <div className="commute-filter-group">
          <span className="commute-filter-label">Transit Hub:</span>
          <button 
            type="button" 
            className={`commute-chip ${selectedHub === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedHub('all')}
          >
            All Hubs ({squads.length})
          </button>
          <button 
            type="button" 
            className={`commute-chip ${selectedHub === 'Indiranagar' ? 'active' : ''}`}
            onClick={() => setSelectedHub('Indiranagar')}
          >
            Indiranagar Metro
          </button>
          <button 
            type="button" 
            className={`commute-chip ${selectedHub === 'Silk Board' ? 'active' : ''}`}
            onClick={() => setSelectedHub('Silk Board')}
          >
            Silk Board
          </button>
          <button 
            type="button" 
            className={`commute-chip ${selectedHub === 'HSR' ? 'active' : ''}`}
            onClick={() => setSelectedHub('HSR')}
          >
            HSR BDA
          </button>
        </div>

        <div className="commute-filter-group">
          <span className="commute-filter-label">Mode:</span>
          <button 
            type="button" 
            className={`commute-chip ${selectedMode === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedMode('all')}
          >
            All
          </button>
          <button 
            type="button" 
            className={`commute-chip ${selectedMode === 'metro_squad' ? 'active' : ''}`}
            onClick={() => setSelectedMode('metro_squad')}
          >
            🚇 Metro
          </button>
          <button 
            type="button" 
            className={`commute-chip ${selectedMode === 'cab_pool' ? 'active' : ''}`}
            onClick={() => setSelectedMode('cab_pool')}
          >
            🚗 Cab Pool
          </button>
          <button 
            type="button" 
            className={`commute-chip ${selectedMode === 'bike_convoy' ? 'active' : ''}`}
            onClick={() => setSelectedMode('bike_convoy')}
          >
            🏍️ Bike
          </button>
        </div>
      </div>

      {/* Squad Cards Grid */}
      <div className="commute-squads-grid">
        {filteredSquads.length === 0 ? (
          <div className="commute-empty-state">
            <p>No active commute squads match this filter.</p>
            <button
              type="button"
              className="button button--secondary button--small"
              onClick={() => { setSelectedHub('all'); setSelectedMode('all'); }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredSquads.map((squad) => {
            const isUserMember = currentUser && squad.members.some((m) => m.userId === currentUser.id);
            const isFull = squad.members.length >= squad.capacity;
            const remainingSpots = squad.capacity - squad.members.length;

            return (
              <div 
                key={squad.id} 
                className={`commute-squad-card ${isUserMember ? 'commute-squad-card--joined' : ''}`}
              >
                <div className="commute-squad-card__header">
                  <div className="commute-squad-card__badge">
                    <span className="commute-squad-icon">
                      {COMMUTE_MODE_CONFIG[squad.mode].icon}
                    </span>
                    <strong>{COMMUTE_MODE_CONFIG[squad.mode].label}</strong>
                    {squad.isSample && <span className="commute-spots-pill">Sample</span>}
                  </div>
                  <span className={`commute-spots-pill ${isFull ? 'commute-spots-pill--full' : ''}`}>
                    {isFull ? 'Squad Full' : `${remainingSpots} spot${remainingSpots > 1 ? 's' : ''} left`}
                  </span>
                </div>

                <div className="commute-squad-hub">
                  <MapPin size={15} />
                  <span>{squad.pickupHub}</span>
                </div>

                <div className="commute-squad-timings">
                  <Clock size={14} />
                  <span>Departs <strong>{squad.departureTime}</strong></span>
                  <span className="commute-arrow">→</span>
                  <span>Arrives ~<strong>{squad.targetArrival}</strong></span>
                </div>

                {squad.notes && (
                  <p className="commute-squad-notes">
                    &ldquo;{squad.notes}&rdquo;
                  </p>
                )}

                <div className="commute-squad-members-row">
                  <div className="commute-member-avatars">
                    {squad.members.map((m, idx) => (
                      <span 
                        key={m.userId || idx} 
                        className="commute-member-avatar"
                        title={m.name}
                      >
                        {m.name.charAt(0).toUpperCase()}
                      </span>
                    ))}
                  </div>
                  <span className="commute-member-count">
                    {squad.members.length} / {squad.capacity} joined
                  </span>
                </div>

                <div className="commute-squad-actions">
                  {isUserMember ? (
                    <div className="commute-joined-actions">
                      <span className="commute-joined-status">
                        <Check size={14} /> You&apos;re in this squad
                      </span>
                      <div className="button-row">
                        <button
                          type="button"
                          className="button button--accent button--small"
                          onClick={() => openWhatsAppCoordination(squad)}
                        >
                          <MessageCircle size={14} /> Share travel plan
                        </button>
                        <button
                          type="button"
                          className="button button--ghost button--small text-button"
                          onClick={() => handleLeave(squad.id)}
                        >
                          Leave
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="button button--primary button--small button--full"
                      disabled={isFull}
                      onClick={() => handleJoin(squad.id)}
                    >
                      {isFull ? 'Squad Full' : 'Join Travel Squad'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="commute-safety-footer">
        <ShieldCheck size={16} />
        <span>
          <strong>Local planning &amp; safety:</strong> Sample profiles are fictional and no participant is verified by this tool.
          Choose public meeting points, arrange transport independently, and never share passwords or banking credentials.
        </span>
      </div>
    </div>
  );
}
