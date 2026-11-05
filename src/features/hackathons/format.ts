import type { Hackathon } from './types';

export function formatHackathonDate(value: string, timeKnown: boolean, timezone: string | null): string {
  const options: Intl.DateTimeFormatOptions = timeKnown
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }
    : { day: 'numeric', month: 'short', year: 'numeric', timeZone: timezone ?? 'UTC' };
  return new Intl.DateTimeFormat('en-IN', options).format(new Date(value));
}

export function formatHackathonRange(hackathon: Hackathon): string {
  const start = formatHackathonDate(hackathon.startDate, hackathon.startTimeKnown, hackathon.timezone);
  if (!hackathon.endDate) return start;
  return `${start} → ${formatHackathonDate(hackathon.endDate, hackathon.endTimeKnown, hackathon.timezone)}`;
}

export function formatHackathonPrice(hackathon: Pick<Hackathon, 'isFree' | 'priceAmount' | 'currency'>): string {
  if (hackathon.isFree === true) return 'Free';
  if (hackathon.isFree === false) {
    if (hackathon.priceAmount === null) return 'Paid · amount not stated';
    if (!hackathon.currency) return `${hackathon.priceAmount} · currency not stated`;
    try {
      return new Intl.NumberFormat('en-IN', { style: 'currency', currency: hackathon.currency, maximumFractionDigits: 2 }).format(hackathon.priceAmount);
    } catch { return `${hackathon.priceAmount} ${hackathon.currency}`; }
  }
  return 'Price not stated';
}

export function hackathonLocation(hackathon: Pick<Hackathon, 'mode' | 'area' | 'city' | 'venue' | 'locationPrecision'>): string {
  if (hackathon.mode === 'online') return 'Online';
  const place = [hackathon.venue, hackathon.area, hackathon.city].filter(Boolean).join(' · ');
  if (!place) return 'Location not stated';
  return hackathon.locationPrecision === 'city' ? `${place} · approximate city` : place;
}

export function formatLastUpdated(value: string | null): string {
  if (!value) return 'No successful source check yet';
  return `Last source check ${new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(value))}`;
}
