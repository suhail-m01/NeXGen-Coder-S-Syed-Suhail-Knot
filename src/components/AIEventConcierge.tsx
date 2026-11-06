import { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  X, 
  MapPin, 
  Calendar, 
  ArrowRight, 
  Trophy, 
  Bot, 
  RotateCcw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { localityById, nearestMetroOrLandmark } from '../domain/localities';
import { formatEventDate, priceLabel } from '../domain/events';
import type { Hackathon } from '../features/hackathons/types';

interface ConciergeResultItem {
  id: string;
  title: string;
  type: 'knot_event' | 'hackathon';
  dateStr: string;
  venueOrCity: string;
  metro?: string | null;
  badgeText: string;
  prizeOrPrice?: string;
  matchReason: string;
  url: string;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  results?: ConciergeResultItem[];
  timestamp: string;
}

const QUICK_PROMPTS = [
  '🏆 Hackathons with Cash Prizes',
  '🛠️ Hands-on Tech Workshops',
  '☕ Developer Meetups & Coffee',
  '🌐 Leadership Summits & Confs',
  '📍 Events near Koramangala & Indiranagar',
];

export function AIEventConcierge() {
  const { data } = useApp();
  const [liveHackathons, setLiveHackathons] = useState<Hackathon[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      sender: 'ai',
      text: 'Hey there! 👋 I am your Hyperlocal Event Concierge. Tell me what you want to build or attend—e.g. "Free AI hackathons near Koramangala" or "Weekend meetups with open teams".',
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import('../features/hackathons/liveSeed')
      .then(({ LIVE_VERIFIED_HACKATHONS }) => setLiveHackathons(LIVE_VERIFIED_HACKATHONS))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const processQuery = (rawQuery: string): { reply: string; results: ConciergeResultItem[] } => {
    const q = rawQuery.toLowerCase();
    const scoredResults: Array<{ item: ConciergeResultItem; score: number }> = [];

    const wantsHackathons = q.includes('hackathon') || q.includes('hack') || q.includes('coding');
    const wantsWorkshops = q.includes('workshop') || q.includes('lab') || q.includes('class') || q.includes('bootcamp') || q.includes('masterclass');
    const wantsMeetups = q.includes('meetup') || q.includes('coffee') || q.includes('circle') || q.includes('roundtable') || q.includes('discussion');
    const wantsSummits = q.includes('summit') || q.includes('leadership') || q.includes('keynote');
    const wantsConferences = q.includes('conference') || q.includes('conf') || q.includes('expo') || q.includes('forum');
    const wantsAI = q.includes('ai') || q.includes('ml') || q.includes('machine learning') || q.includes('intelligence') || q.includes('gemini');
    const wantsFree = q.includes('free') || q.includes('zero') || q.includes('no cost');
    const wantsPrizes = q.includes('prize') || q.includes('cash') || q.includes('award') || q.includes('money');
    const wantsKoramangala = q.includes('koramangala');
    const wantsIndiranagar = q.includes('indiranagar');
    const wantsHSR = q.includes('hsr');
    const wantsWhitefield = q.includes('whitefield');
    const wantsWeekend = q.includes('weekend') || q.includes('saturday') || q.includes('sunday');
    const wantsTeam = q.includes('team') || q.includes('squad') || q.includes('synergy');

    // 1. Search Live Hackathons
    for (const h of liveHackathons) {
      let score = 0;
      const reasons: string[] = [];

      if (wantsHackathons) {
        score += 30;
        reasons.push('Live national hackathon');
      }
      if (wantsPrizes && h.prizePool) {
        score += 35;
        reasons.push(h.prizePool);
      }
      if (wantsFree && h.isFree) {
        score += 20;
        reasons.push('Free registration');
      }
      if (wantsAI && (h.tags.some((t) => t.includes('ai') || t.includes('ml')) || (h.description?.toLowerCase() ?? '').includes('ai'))) {
        score += 35;
        reasons.push('AI & intelligent software track');
      }
      if (wantsKoramangala && (h.area?.toLowerCase().includes('koramangala') || h.venue?.toLowerCase().includes('koramangala'))) {
        score += 40;
        reasons.push('In Koramangala');
      }
      if (wantsIndiranagar && (h.area?.toLowerCase().includes('indiranagar') || h.venue?.toLowerCase().includes('indiranagar'))) {
        score += 40;
        reasons.push('In Indiranagar');
      }
      if (wantsWhitefield && (h.area?.toLowerCase().includes('whitefield') || h.venue?.toLowerCase().includes('whitefield'))) {
        score += 40;
        reasons.push('In Whitefield');
      }
      if (wantsTeam && h.teamSize) {
        score += 25;
        reasons.push(`Team size: ${h.teamSize}`);
      }

      // Keyword broad match
      const textMatch = `${h.title} ${h.description ?? ''} ${h.tags.join(' ')}`.toLowerCase();
      const words = q.split(/\s+/).filter((w) => w.length > 3);
      for (const w of words) {
        if (textMatch.includes(w)) score += 15;
      }

      if (score > 15) {
        scoredResults.push({
          score,
          item: {
            id: h.id,
            title: h.title,
            type: 'hackathon',
            dateStr: new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(h.startDate)),
            venueOrCity: h.venue ?? h.city ?? 'Bengaluru',
            badgeText: `${h.sourcePlatform} Hackathon`,
            prizeOrPrice: h.prizePool ?? (h.isFree ? 'Free Entry' : undefined),
            matchReason: reasons.join(' • ') || 'Matches your discovery criteria',
            url: `/hackathons`,
          },
        });
      }
    }

    // 2. Search Knot Events
    for (const event of data.events) {
      if (event.status === 'cancelled') continue;
      let score = 0;
      const reasons: string[] = [];

      const localityName = localityById(event.venue?.localityId)?.name ?? '';
      const metro = nearestMetroOrLandmark(event.venue?.localityId);

      if (wantsHackathons && event.eventType === 'hackathon') {
        score += 35;
        reasons.push('Hackathon build sprint');
      }
      if (wantsWorkshops && event.eventType === 'workshop') {
        score += 45;
        reasons.push('Hands-on technical workshop');
      }
      if (wantsMeetups && event.eventType === 'meetup') {
        score += 45;
        reasons.push('Local community meetup');
      }
      if (wantsSummits && event.eventType === 'summit') {
        score += 45;
        reasons.push('Leadership & tech summit');
      }
      if (wantsConferences && event.eventType === 'conference') {
        score += 45;
        reasons.push('Multi-track technical conference');
      }
      if (wantsFree && event.price.kind === 'free') {
        score += 20;
        reasons.push('Free admission');
      }
      if (wantsPrizes && event.prizes.length > 0) {
        score += 35;
        reasons.push(event.prizes[0]);
      }
      if (wantsTeam && event.team.mode !== 'solo') {
        score += 30;
        reasons.push('Team participation open');
      }
      if (wantsKoramangala && (localityName.toLowerCase().includes('koramangala') || event.venue?.address.toLowerCase().includes('koramangala'))) {
        score += 40;
        reasons.push('Koramangala locality');
      }
      if (wantsIndiranagar && (localityName.toLowerCase().includes('indiranagar') || event.venue?.address.toLowerCase().includes('indiranagar'))) {
        score += 40;
        reasons.push('Indiranagar locality');
      }
      if (wantsHSR && (localityName.toLowerCase().includes('hsr') || event.venue?.address.toLowerCase().includes('hsr'))) {
        score += 40;
        reasons.push('HSR Layout');
      }
      if (wantsWeekend) {
        const day = new Date(event.startAt).getDay();
        if (day === 0 || day === 6) {
          score += 25;
          reasons.push('Weekend schedule');
        }
      }
      if (wantsAI && (event.skills.some((s) => s.toLowerCase().includes('ai') || s.toLowerCase().includes('ml')) || event.title.toLowerCase().includes('ai') || event.description.toLowerCase().includes('ai'))) {
        score += 35;
        reasons.push('AI / ML focus');
      }

      // Keyword match
      const textMatch = `${event.title} ${event.tagline} ${event.description} ${event.skills.join(' ')}`.toLowerCase();
      const words = q.split(/\s+/).filter((w) => w.length > 3);
      for (const w of words) {
        if (textMatch.includes(w)) score += 15;
      }

      if (score > 15) {
        scoredResults.push({
          score,
          item: {
            id: event.id,
            title: event.title,
            type: 'knot_event',
            dateStr: formatEventDate(event.startAt),
            venueOrCity: event.mode === 'online' ? 'Online event' : (event.venue?.name ?? localityName),
            metro,
            badgeText: event.eventType.toUpperCase(),
            prizeOrPrice: priceLabel(event),
            matchReason: reasons.join(' • ') || 'Verified community listing',
            url: `/events/${event.id}`,
          },
        });
      }
    }

    // Sort by score
    scoredResults.sort((a, b) => b.score - a.score);
    const topResults = scoredResults.slice(0, 4).map((sr) => sr.item);

    let reply = '';
    if (topResults.length > 0) {
      reply = `I found ${topResults.length} high-match events in Bengaluru tailored to your query:`;
    } else {
      // Fallback: provide top upcoming items
      const fallbackHackathons = liveHackathons.slice(0, 2).map((h) => ({
        id: h.id,
        title: h.title,
        type: 'hackathon' as const,
        dateStr: new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(new Date(h.startDate)),
        venueOrCity: h.venue ?? h.city ?? 'Bengaluru',
        badgeText: 'Trending Hackathon',
        prizeOrPrice: h.prizePool ?? 'Free',
        matchReason: 'Top trending event in Bengaluru right now',
        url: `/hackathons`,
      }));
      topResults.push(...fallbackHackathons);
      reply = `I didn't find an exact match for "${rawQuery}", but here are the top trending hackathons and community events happening right now:`;
    }

    return { reply, results: topResults };
  };

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: 'Now',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const { reply, results } = processQuery(query);
      const aiResponse: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'ai',
        text: reply,
        results,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 600);
  };

  const handlePromptClick = (prompt: string) => {
    handleSend(prompt);
  };

  const clearChat = () => {
    setMessages([
      {
        id: `msg-reset-${Date.now()}`,
        sender: 'ai',
        text: 'Chat history reset. How can I help you discover your next hackathon or meetup today?',
        timestamp: 'Just now',
      },
    ]);
  };

  return (
    <div className="ai-concierge-container">
      {/* Docked Floating Trigger Pill */}
      {!isOpen && (
        <button
          type="button"
          className="ai-concierge-trigger"
          onClick={() => setIsOpen(true)}
          aria-label="Open AI Hyperlocal Event Concierge"
        >
          <div className="ai-concierge-trigger__icon">
            <Sparkles size={16} />
            <span className="ai-concierge-ping" />
          </div>
          <span className="ai-concierge-trigger__text">Ask AI Concierge</span>
        </button>
      )}

      {/* Expandable Chat Drawer */}
      {isOpen && (
        <div className="ai-concierge-drawer" role="dialog" aria-label="AI Event Concierge Chat">
          {/* Header */}
          <div className="ai-concierge-header">
            <div className="ai-concierge-header__title">
              <div className="ai-concierge-avatar">
                <Bot size={17} />
              </div>
              <div>
                <h4>Hyperlocal Event Concierge</h4>
                <span>AI-Powered Event Discovery</span>
              </div>
            </div>
            <div className="ai-concierge-header__actions">
              <button
                type="button"
                className="ai-concierge-icon-btn"
                onClick={clearChat}
                title="Reset conversation"
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                className="ai-concierge-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Close Concierge"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Quick Prompts Bar */}
          <div className="ai-concierge-prompts">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className="ai-concierge-prompt-chip"
                onClick={() => handlePromptClick(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div className="ai-concierge-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-message-row ai-message-row--${msg.sender}`}>
                <div className="ai-message-bubble">
                  <p>{msg.text}</p>

                  {/* Render Event Result Cards inside message */}
                  {msg.results && msg.results.length > 0 && (
                    <div className="ai-concierge-results-list">
                      {msg.results.map((res) => (
                        <div key={res.id} className="ai-concierge-result-card">
                          <div className="ai-concierge-result-card__top">
                            <span className="ai-result-badge">{res.badgeText}</span>
                            {res.prizeOrPrice && (
                              <span className="ai-result-prize">
                                <Trophy size={11} /> {res.prizeOrPrice}
                              </span>
                            )}
                          </div>

                          <h5>{res.title}</h5>

                          <div className="ai-result-meta">
                            <span><Calendar size={12} /> {res.dateStr}</span>
                            <span><MapPin size={12} /> {res.venueOrCity}</span>
                          </div>

                          {res.metro && (
                            <div className="ai-result-metro">
                              🚇 {res.metro}
                            </div>
                          )}

                          <div className="ai-result-reason">
                            ✨ {res.matchReason}
                          </div>

                          <div className="ai-result-action">
                            <Link
                              to={res.url}
                              className="button button--secondary button--small button--full"
                              onClick={() => setIsOpen(false)}
                            >
                              <span>Explore &amp; Register</span>
                              <ArrowRight size={13} />
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="ai-message-row ai-message-row--ai">
                <div className="ai-message-bubble ai-typing-indicator">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="ai-concierge-input-form"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything... e.g. Free hackathons near HSR Layout"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="ai-concierge-send-btn"
              aria-label="Send query"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
