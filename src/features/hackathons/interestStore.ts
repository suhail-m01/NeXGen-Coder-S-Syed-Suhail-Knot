const STORAGE_KEY = 'knot_hackathon_interests_v1';
const MAX_LOCAL_INTERESTS = 200;

type StoredInterests = Record<string, string[]>;

function readAll(): StoredInterests {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => Array.isArray(value)).map(([key, value]) => [key, (value as unknown[]).filter((item): item is string => typeof item === 'string').slice(0, MAX_LOCAL_INTERESTS)]));
  } catch { return {}; }
}

export function localHackathonInterests(userId: string): string[] {
  return readAll()[userId] ?? [];
}

export function saveLocalHackathonInterest(userId: string, hackathonId: string): void {
  const all = readAll();
  all[userId] = [...new Set([hackathonId, ...(all[userId] ?? [])])].slice(0, MAX_LOCAL_INTERESTS);
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch { /* Storage may be unavailable; the server click remains authoritative. */ }
}

export function removeLocalHackathonInterest(userId: string, hackathonId: string): void {
  const all = readAll();
  all[userId] = (all[userId] ?? []).filter((id) => id !== hackathonId);
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all)); } catch { /* Best-effort local-only fallback. */ }
}
