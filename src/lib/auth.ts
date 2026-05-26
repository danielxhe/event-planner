// Host-dashboard auth = constant-time compare against the event's Host Secret.
// No login, no session, no cookies. The secret in the URL IS the auth.

export function hostSecretValid(provided: string | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < provided.length; i++) {
    diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export function generateHostSecret(): string {
  // 32-char hex, generated server-side when creating an event.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
