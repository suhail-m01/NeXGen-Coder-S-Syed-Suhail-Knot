import { getSupabase, isCloudProvider } from '../../data/supabase/client';
import type { Hackathon, HackathonFilters, HackathonListResponse, InterestContext, InterestResponse } from './types';

async function authHeader(): Promise<Record<string, string>> {
  if (!isCloudProvider) return {};
  try {
    const { data } = await getSupabase().auth.getSession();
    return data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {};
  } catch {
    return {};
  }
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === 'string') return body.error;
  } catch {
    // Use the bounded generic message below for non-JSON failures.
  }
  return `Request failed (${response.status}). Please retry.`;
}

export function hackathonQuery(filters: Partial<HackathonFilters>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value === '' || value === null || value === undefined || key === 'page' && value === 1 || key === 'limit' && value === 12) continue;
    if ((key === 'from' || key === 'to') && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const local = new Date(`${value}T${key === 'from' ? '00:00:00.000' : '23:59:59.999'}`);
      params.set(key, local.toISOString());
    } else params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function listHackathons(filters: Partial<HackathonFilters>, signal?: AbortSignal): Promise<HackathonListResponse> {
  const response = await fetch(`/api/hackathons${hackathonQuery(filters)}`, { headers: { Accept: 'application/json' }, signal });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.json() as Promise<HackathonListResponse>;
}

export async function listMyHackathonInterests(signal?: AbortSignal): Promise<Hackathon[]> {
  const response = await fetch('/api/hackathons/interests', { headers: { Accept: 'application/json', ...(await authHeader()) }, signal });
  if (!response.ok) throw new Error(await errorMessage(response));
  const body = await response.json() as { data?: Hackathon[] };
  return Array.isArray(body.data) ? body.data : [];
}

export async function recordHackathonInterest(id: string, context: InterestContext): Promise<InterestResponse> {
  const response = await fetch(`/api/hackathons/${encodeURIComponent(id)}/interest`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ context }),
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.json() as Promise<InterestResponse>;
}

export interface HackathonStatus {
  lastRunAt: string | null;
  lastStatus: string;
  totalUpcoming: number;
  perSource: Record<string, number>;
}

export async function getHackathonsStatus(signal?: AbortSignal): Promise<HackathonStatus> {
  const response = await fetch('/api/hackathons/status', { headers: { Accept: 'application/json' }, signal });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.json() as Promise<HackathonStatus>;
}

export function reportHackathonUrl(hackathon: { id: string; title: string; sourceUrl: string }): string {
  const subject = `Knot hackathon information report: ${hackathon.title}`;
  const body = `Hackathon: ${hackathon.title}\nKnot record: ${hackathon.id}\nSource: ${hackathon.sourceUrl}\n\nWhat is incorrect?\n`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
