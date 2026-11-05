import { Shield, ExternalLink, Globe, CheckCircle2 } from 'lucide-react';

export function BotInfoPage() {
  return (
    <div className="page-container" style={{ maxWidth: 780, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#22c55e22', color: '#4ade80', padding: '4px 12px', borderRadius: 999, fontSize: '0.85rem', fontWeight: 600, marginBottom: 16 }}>
        <CheckCircle2 size={15} /> Verified Crawler Transparency
      </div>
      <h1 style={{ fontSize: '2.2rem', marginBottom: 12 }}>About KnotBot</h1>
      <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '1.1rem', marginBottom: 28 }}>
        KnotBot is the transparent, automated indexing crawler for Knot (&ldquo;Find your people. Find your next event.&rdquo;).
      </p>

      <section style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24, marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Globe size={18} /> Identification &amp; User-Agent
        </h2>
        <p style={{ fontSize: '0.95rem', color: '#cbd5e1', marginBottom: 12 }}>
          KnotBot announces itself honestly on every HTTP request so administrators can identify traffic:
        </p>
        <code style={{ display: 'block', background: '#120e24', border: '1px solid #2d264f', padding: '12px 16px', borderRadius: 8, color: '#fbbf24', fontSize: '0.85rem', overflowX: 'auto' }}>
          Mozilla/5.0 (compatible; KnotBot/1.0; +https://ne-x-gen-coder-s-syed-suhail-knot.vercel.app/bot)
        </code>
      </section>

      <section style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24, marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Shield size={18} /> Politeness &amp; Safety Standards
        </h2>
        <ul style={{ color: '#cbd5e1', lineHeight: 1.8, paddingLeft: 20 }}>
          <li><strong>Strict robots.txt obedience:</strong> KnotBot never requests paths disallowed for KnotBot or general bots.</li>
          <li><strong>Per-domain delays:</strong> Requests are limited with at least 1.5 seconds between queries to prevent load spikes.</li>
          <li><strong>No anti-bot bypassing:</strong> KnotBot never solves CAPTCHAs, attempts login spoofing, or bypasses access controls.</li>
          <li><strong>Direct handoff:</strong> All discovered hackathons redirect users to the organizer&apos;s verified registration site.</li>
        </ul>
      </section>

      <section style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 24 }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: 12 }}>Managing Access in robots.txt</h2>
        <p style={{ fontSize: '0.95rem', color: '#cbd5e1', marginBottom: 12 }}>
          To disallow KnotBot entirely from indexing your events, add to your <code>robots.txt</code>:
        </p>
        <pre style={{ background: '#120e24', border: '1px solid #2d264f', padding: '12px 16px', borderRadius: 8, color: '#f1f5f9', fontSize: '0.9rem', overflowX: 'auto' }}>
User-agent: KnotBot&#10;Disallow: /
        </pre>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: 16 }}>
          Questions or inquiries? <a href="https://github.com/suhail-m01/NeXGen-Coder-S-Syed-Suhail-Knot" target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa' }}>Open an issue on GitHub <ExternalLink size={14} style={{ display: 'inline' }} /></a>.
        </p>
      </section>
    </div>
  );
}
