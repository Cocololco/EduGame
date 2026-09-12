/**
 * Lightweight per-browser identity — NOT a real account system. There's no
 * password, no server-issued session, no verification: a random id is
 * generated on first use and stored in localStorage, and the client sends
 * it (plus whatever display name you typed) with every multiplayer API
 * request. The server trusts it at face value.
 *
 * This is a deliberate, documented tradeoff for a personal project with no
 * sensitive data (see docs/GAME_DESIGN.md) — good enough to tell two
 * browsers apart in a friendly game with your brother, not something to
 * build a public product on. A real account system is future work.
 */

const IDENTITY_KEY = "edugame:identity";

export interface Identity {
  userId: string;
  displayName: string;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function generateUserId(): string {
  return `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Reads the current identity, if any (null if this browser hasn't "logged in" yet). */
export function getIdentity(): Identity | null {
  if (!isBrowser()) return null;
  const raw = window.localStorage.getItem(IDENTITY_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Identity>;
    if (!parsed.userId || !parsed.displayName) return null;
    return { userId: parsed.userId, displayName: parsed.displayName };
  } catch {
    return null;
  }
}

/** Sets (or changes) the display name, generating a new userId the first time this browser is used. */
export function setDisplayName(displayName: string): Identity {
  const existing = getIdentity();
  const identity: Identity = { userId: existing?.userId ?? generateUserId(), displayName };
  if (isBrowser()) {
    window.localStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
  }
  return identity;
}
