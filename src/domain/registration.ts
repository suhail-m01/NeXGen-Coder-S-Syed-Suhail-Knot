import type { KnotEvent, Registration, RegistrationStatus } from './types';

const confirmedStatuses = new Set<RegistrationStatus>(['registered', 'approved', 'checked_in', 'attended']);

export function isConfirmedNative(registration: Pick<Registration, 'kind' | 'status'>) {
  return registration.kind === 'native' && confirmedStatuses.has(registration.status);
}

export function confirmedNativeRegistrations(registrations: Registration[], eventId: string) {
  return registrations.filter((registration) => registration.eventId === eventId && isConfirmedNative(registration));
}

export function hasNativeCapacity(event: KnotEvent, registrations: Registration[]) {
  if (event.registration.kind !== 'native') return false;
  if (event.registration.capacity === null) return true;
  return confirmedNativeRegistrations(registrations, event.id).length < event.registration.capacity;
}

export function waitlistedRegistrations(registrations: Registration[], eventId: string) {
  return registrations
    .filter((registration) => registration.eventId === eventId && registration.kind === 'native' && registration.status === 'waitlisted')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

export function waitlistPosition(registrations: Registration[], registrationId: string) {
  const registration = registrations.find((candidate) => candidate.id === registrationId);
  if (!registration) return null;
  const index = waitlistedRegistrations(registrations, registration.eventId).findIndex((candidate) => candidate.id === registrationId);
  return index >= 0 ? index + 1 : null;
}

export function initialNativeRegistrationStatus(event: KnotEvent, registrations: Registration[]): 'pending' | 'registered' | 'waitlisted' | 'closed' {
  const atCapacity = !hasNativeCapacity(event, registrations);
  if (atCapacity && !event.registration.waitlistEnabled) return 'closed';
  if (event.registration.approval === 'manual') return 'pending';
  return atCapacity ? 'waitlisted' : 'registered';
}

export function approvalRegistrationStatus(event: KnotEvent, registrations: Registration[]): 'approved' | 'waitlisted' | 'closed' {
  if (hasNativeCapacity(event, registrations)) return 'approved';
  return event.registration.waitlistEnabled ? 'waitlisted' : 'closed';
}

export function nextWaitlistCandidate(event: KnotEvent, registrations: Registration[]) {
  if (!hasNativeCapacity(event, registrations)) return null;
  return waitlistedRegistrations(registrations, event.id)[0] ?? null;
}
