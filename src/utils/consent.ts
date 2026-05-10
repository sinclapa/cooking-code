export const CONSENT_KEY = 'cc-consent';

export type ConsentValue = 'accepted' | 'declined' | null;

export function parseConsentValue(raw: string | null): ConsentValue {
  if (raw === 'accepted' || raw === 'declined') return raw;
  return null;
}

export function shouldShowBannerOnLoad(stored: ConsentValue): boolean {
  return stored === null;
}

export function getStatusLabel(current: ConsentValue): string | null {
  if (current === 'accepted') return 'Current: Accepted';
  if (current === 'declined') return 'Current: Declined';
  return null;
}

export function getActiveButton(current: ConsentValue): 'accept' | 'decline' | null {
  if (current === 'accepted') return 'accept';
  if (current === 'declined') return 'decline';
  return null;
}
