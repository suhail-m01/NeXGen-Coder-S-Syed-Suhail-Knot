export const CHECK_IN_PAYLOAD_PREFIX = 'knot:checkin:v1:';

export function createCheckInToken() {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function checkInPayload(token: string) {
  return `${CHECK_IN_PAYLOAD_PREFIX}${token}`;
}

/** Accepts a Knot QR payload or the participant's manual fallback code. */
export function parseCheckInPayload(value: string) {
  const trimmed = value.trim();
  const token = trimmed.startsWith(CHECK_IN_PAYLOAD_PREFIX) ? trimmed.slice(CHECK_IN_PAYLOAD_PREFIX.length) : trimmed;
  return /^[a-f0-9]{48}$/i.test(token) ? token.toLowerCase() : null;
}

export interface CheckInScanResult {
  status: 'checked_in' | 'duplicate' | 'invalid' | 'wrong_event' | 'not_eligible' | 'closed';
  message: string;
  registrationId: string | null;
  checkedInAt: string | null;
}
