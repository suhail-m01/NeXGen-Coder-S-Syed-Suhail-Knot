import { buildSampleEvents } from '../domain/sample';
import type { AppData } from '../domain/types';

const STORAGE_KEY = 'knot.product.data.v1';
const DATA_VERSION = 1;

export const createInitialData = (): AppData => ({
  version: DATA_VERSION,
  events: buildSampleEvents(),
  users: [],
  session: null,
  registrations: [],
  saves: [],
  follows: [],
  notifications: [],
  submissions: [],
  feedback: [],
  teamPosts: [],
  teamRequests: [],
});

export function loadData(): AppData {
  if (typeof window === 'undefined') return createInitialData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialData();
    const parsed = JSON.parse(raw) as AppData;
    if (parsed.version !== DATA_VERSION || !Array.isArray(parsed.events)) return createInitialData();
    const initial = createInitialData();
    return {
      ...initial,
      ...parsed,
      users: Array.isArray(parsed.users) ? parsed.users : [],
      registrations: Array.isArray(parsed.registrations) ? parsed.registrations : [],
      saves: Array.isArray(parsed.saves) ? parsed.saves : [],
      follows: Array.isArray(parsed.follows) ? parsed.follows : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions : [],
      feedback: Array.isArray(parsed.feedback) ? parsed.feedback : [],
      teamPosts: Array.isArray(parsed.teamPosts) ? parsed.teamPosts : [],
      teamRequests: Array.isArray(parsed.teamRequests) ? parsed.teamRequests : [],
    };
  } catch {
    return createInitialData();
  }
}

export function saveData(data: AppData) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetData() {
  if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
}

export function makeId(prefix: string) {
  const value = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${value}`;
}
