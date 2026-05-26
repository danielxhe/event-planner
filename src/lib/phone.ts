// Phone normalizer — the dedup foundation.
// Every read and write of a Phone value MUST pass through normalizePhone first.

const DEFAULT_CC = process.env.DEFAULT_COUNTRY_CODE ?? '1';

export function normalizePhone(raw: string | null | undefined, defaultCountry = DEFAULT_CC): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/[^\d+]/g, '');
  // Strip any non-leading +
  if (digits.indexOf('+') > 0) digits = digits.replace(/\+/g, '');
  if (digits.startsWith('+')) return digits.length >= 11 ? digits : null;
  if (digits.length === 10) return '+' + defaultCountry + digits;
  if (digits.length === 11 && digits.startsWith(defaultCountry)) return '+' + digits;
  return null;
}

// Display helper — US-style for +1 numbers, raw E.164 otherwise.
export function formatPhoneForDisplay(e164: string): string {
  if (!e164.startsWith('+1') || e164.length !== 12) return e164;
  const d = e164.slice(2);
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
