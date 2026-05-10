import { describe, it, expect } from 'vitest';
import {
  CONSENT_KEY,
  parseConsentValue,
  shouldShowBannerOnLoad,
  getStatusLabel,
  getActiveButton,
} from './consent';

// ---------------------------------------------------------------------------
// CONSENT_KEY
// ---------------------------------------------------------------------------
describe('CONSENT_KEY', () => {
  it('is the expected localStorage key', () => {
    expect(CONSENT_KEY).toBe('cc-consent');
  });
});

// ---------------------------------------------------------------------------
// parseConsentValue
// ---------------------------------------------------------------------------
describe('parseConsentValue', () => {
  it('returns "accepted" for "accepted"', () => {
    expect(parseConsentValue('accepted')).toBe('accepted');
  });

  it('returns "declined" for "declined"', () => {
    expect(parseConsentValue('declined')).toBe('declined');
  });

  it('returns null for null', () => {
    expect(parseConsentValue(null)).toBeNull();
  });

  it('returns null for an unrecognised string', () => {
    expect(parseConsentValue('yes')).toBeNull();
    expect(parseConsentValue('true')).toBeNull();
    expect(parseConsentValue('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// shouldShowBannerOnLoad
// ---------------------------------------------------------------------------
describe('shouldShowBannerOnLoad', () => {
  it('returns true when no consent is stored', () => {
    expect(shouldShowBannerOnLoad(null)).toBe(true);
  });

  it('returns false when consent is accepted', () => {
    expect(shouldShowBannerOnLoad('accepted')).toBe(false);
  });

  it('returns false when consent is declined', () => {
    expect(shouldShowBannerOnLoad('declined')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getStatusLabel
// ---------------------------------------------------------------------------
describe('getStatusLabel', () => {
  it('returns "Current: Accepted" when accepted', () => {
    expect(getStatusLabel('accepted')).toBe('Current: Accepted');
  });

  it('returns "Current: Declined" when declined', () => {
    expect(getStatusLabel('declined')).toBe('Current: Declined');
  });

  it('returns null when no preference is set', () => {
    expect(getStatusLabel(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getActiveButton
// ---------------------------------------------------------------------------
describe('getActiveButton', () => {
  it('returns "accept" when consent is accepted', () => {
    expect(getActiveButton('accepted')).toBe('accept');
  });

  it('returns "decline" when consent is declined', () => {
    expect(getActiveButton('declined')).toBe('decline');
  });

  it('returns null when no preference is set', () => {
    expect(getActiveButton(null)).toBeNull();
  });
});
