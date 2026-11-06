import {
  Award,
  CheckCircle2,
  ExternalLink,
  MapPin,
  QrCode,
  Share2,
  ShieldCheck,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatEventDate } from '../domain/events';
import { localityById } from '../domain/localities';
import { useApp } from '../state/AppContext';
import { isCloudProvider } from '../data/supabase/client';

export function BuilderPassport() {
  const { currentUser, data } = useApp();

  const attendedRegistrations = useMemo(() => {
    if (!currentUser) return [];
    return data.registrations.filter(
      (r) =>
        r.userId === currentUser.id &&
        (r.status === 'attended' || r.status === 'checked_in' || r.status === 'approved' || r.status === 'registered')
    );
  }, [currentUser, data.registrations]);

  const verifiedInPerson = useMemo(() => {
    return attendedRegistrations.filter((r) => r.status === 'attended' || r.status === 'checked_in');
  }, [attendedRegistrations]);

  const communitiesFollowed = useMemo(() => {
    if (!currentUser) return 0;
    return data.follows.filter((f) => f.userId === currentUser.id).length;
  }, [currentUser, data.follows]);

  if (!currentUser) return null;

  const sharePassport = () => {
    const text = `🌟 Check out my Knot Builder Passport!\n• ${verifiedInPerson.length} Organizer-recorded In-Person Check-in(s)\n• ${communitiesFollowed} Communities Connected\n${isCloudProvider ? 'Cloud-backed record' : 'Browser-local record; not a public credential'} on Knot: ${window.location.origin}/profile`;
    if (navigator.share) {
      void navigator.share({ title: `${currentUser.name}'s Builder Passport`, text, url: window.location.href });
    } else {
      void navigator.clipboard.writeText(text);
      alert('Builder Passport summary copied to clipboard!');
    }
  };

  return (
    <div className="builder-passport-container">
      <div className="builder-passport-card">
        <div className="passport-header">
          <div className="passport-emblem">
            <ShieldCheck size={28} />
          </div>
          <div className="passport-title-wrap">
            <span className="passport-sub">{isCloudProvider ? 'Organizer-recorded participation' : 'Browser-local participation record'}</span>
            <h3>{currentUser.name}’s Builder Passport</h3>
            <span className="passport-tier">
              <Sparkles size={13} />
              {verifiedInPerson.length >= 3
                ? 'Community Contributor · 3+ check-ins'
                : verifiedInPerson.length >= 1
                ? 'Community Participant · Organizer check-in recorded'
                : 'Community Explorer · No check-ins yet'}
            </span>
          </div>
          <button className="button button--secondary button--small passport-share-btn" onClick={sharePassport}>
            <Share2 size={14} /> Share Passport
          </button>
        </div>

        <div className="passport-stats-grid">
          <div className="passport-stat">
            <strong>{verifiedInPerson.length}</strong>
            <span>Organizer-recorded Check-ins</span>
          </div>
          <div className="passport-stat">
            <strong>{attendedRegistrations.length}</strong>
            <span>Active Participations</span>
          </div>
          <div className="passport-stat">
            <strong>{communitiesFollowed}</strong>
            <span>Communities Followed</span>
          </div>
          <div className="passport-stat">
            <strong>{localityById(currentUser.areaLocalityId)?.name ?? 'Bengaluru'}</strong>
            <span>Home Base Neighborhood</span>
          </div>
        </div>

        <div className="passport-stamps-section">
          <h4>
            <Award size={16} /> Organizer Check-ins &amp; Participation Passes
          </h4>

          {attendedRegistrations.length === 0 ? (
            <div className="passport-empty-stamps">
              <QrCode size={32} />
              <p>No event passes yet. Register for an upcoming event, check in at the venue, and your organizer-recorded check-in will appear here!</p>
              <Link to="/search" className="button button--primary button--small">
                Explore Events
              </Link>
            </div>
          ) : (
            <div className="passport-stamps-grid">
              {attendedRegistrations.map((reg) => {
                const event = data.events.find((e) => e.id === reg.eventId);
                if (!event) return null;
                const isVerified = reg.status === 'attended' || reg.status === 'checked_in';
                const locality = localityById(event.venue?.localityId);

                return (
                  <article key={reg.id} className={`passport-stamp ${isVerified ? 'is-verified' : 'is-registered'}`}>
                    <div className="stamp-inner">
                      <div className="stamp-seal">
                        {isVerified ? <CheckCircle2 size={16} /> : <Trophy size={16} />}
                        <span>{isVerified ? 'ORGANIZER CHECK-IN' : 'ACTIVE PASS'}</span>
                      </div>
                      <h5>{event.title}</h5>
                      <span className="stamp-organizer">{event.organizerName}</span>
                      <div className="stamp-meta">
                        <span>
                          <MapPin size={11} /> {locality?.name ?? 'Bengaluru'}
                        </span>
                        <span>{formatEventDate(event.startAt)}</span>
                      </div>
                      <div className="stamp-code">
                        <code>ID: {reg.checkInToken ? `PASSPORT-${reg.checkInToken.slice(0, 8)}` : `PASS-${reg.id.slice(0, 8)}`}</code>
                        <Link to={`/events/${event.id}`}>
                          View <ExternalLink size={11} />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
