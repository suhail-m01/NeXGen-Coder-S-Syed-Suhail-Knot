import type {
  AnnouncementAudience,
  AnnouncementInput,
  Registration,
  UserAccount,
} from './types';
import { isConfirmedNative } from './registration';

export const announcementKindLabels = {
  general: 'General update',
  logistics: 'Logistics',
  deadline: 'Deadline reminder',
  post_event: 'Post-event follow-up',
} as const;

export const announcementAudienceLabels: Record<AnnouncementAudience, string> = {
  all_native: 'All active native participants',
  confirmed: 'Confirmed / checked-in / attended',
  pending: 'Pending review',
  waitlisted: 'Waitlisted',
  attended: 'Attended only',
};

export interface AudienceResolution {
  audienceCount: number;
  recipients: UserAccount[];
  optedOutCount: number;
}

function inAudience(registration: Registration, audience: AnnouncementAudience) {
  switch (audience) {
    case 'all_native':
      return ['registered', 'approved', 'pending', 'waitlisted', 'checked_in', 'attended'].includes(registration.status);
    case 'confirmed':
      return isConfirmedNative(registration);
    case 'pending':
      return registration.status === 'pending';
    case 'waitlisted':
      return registration.status === 'waitlisted';
    case 'attended':
      return registration.status === 'attended';
  }
}

/** Resolve unique native users without treating external handoffs or rejected/cancelled records as an audience. */
export function resolveAnnouncementAudience(
  eventId: string,
  audience: AnnouncementAudience,
  registrations: Registration[],
  users: UserAccount[],
): AudienceResolution {
  const matchingIds = new Set(
    registrations
      .filter((registration) => registration.eventId === eventId && registration.kind === 'native' && inAudience(registration, audience))
      .map((registration) => registration.userId),
  );
  const matchingUsers = users.filter((user) => matchingIds.has(user.id));
  const recipients = matchingUsers.filter((user) => user.announcementOptOut !== true);
  return {
    audienceCount: matchingUsers.length,
    recipients,
    optedOutCount: matchingUsers.length - recipients.length,
  };
}

export function deliveryTimeForUser(user: UserAccount, requested: Date) {
  const start = user.quietHoursStart;
  const end = user.quietHoursEnd;
  if (!start || !end || start === end || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return requested.toISOString();
  const minutes = requested.getHours() * 60 + requested.getMinutes();
  const startMinutes = Number(start.slice(0, 2)) * 60 + Number(start.slice(3));
  const endMinutes = Number(end.slice(0, 2)) * 60 + Number(end.slice(3));
  const overnight = startMinutes > endMinutes;
  const quiet = overnight ? minutes >= startMinutes || minutes < endMinutes : minutes >= startMinutes && minutes < endMinutes;
  if (!quiet) return requested.toISOString();
  const delivery = new Date(requested);
  delivery.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
  if (delivery.getTime() <= requested.getTime()) delivery.setDate(delivery.getDate() + 1);
  return delivery.toISOString();
}

export function validateAnnouncement(input: AnnouncementInput) {
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (subject.length < 5 || subject.length > 100) return 'Use a subject between 5 and 100 characters.';
  if (body.length < 10 || body.length > 1200) return 'Use a message between 10 and 1,200 characters.';
  return null;
}
