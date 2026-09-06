/**
 * Login throttling.
 *
 * Credentials sign-in had no limit at all, so a password could be guessed as fast as the network
 * allowed. This keeps a short-lived count of failures per email and per IP and refuses once either
 * crosses the threshold.
 *
 * The counter lives in module memory, which on serverless means per instance — an attacker
 * spreading requests across instances still gets more attempts than this suggests. It raises the
 * cost of a naive attack considerably and costs nothing; a shared store (Redis) would make the
 * limit exact, and the UPSTASH_* credentials already on the project are the obvious home for it.
 */

const WINDOW_MS = 15 * 60_000;
const MAX_PER_EMAIL = 8;
const MAX_PER_IP = 30;

type Bucket = { count: number; resetAt: number };
const byEmail = new Map<string, Bucket>();
const byIp = new Map<string, Bucket>();

function hit(store: Map<string, Bucket>, key: string, max: number): boolean {
  const now = Date.now();
  const b = store.get(key);
  if (!b || b.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  b.count += 1;
  return b.count <= max;
}

function peek(store: Map<string, Bucket>, key: string, max: number): boolean {
  const b = store.get(key);
  if (!b || b.resetAt < Date.now()) return true;
  return b.count < max;
}

/** Keeps the maps from growing without bound on a long-lived instance. */
function sweep(store: Map<string, Bucket>) {
  if (store.size < 5000) return;
  const now = Date.now();
  for (const [k, v] of store) if (v.resetAt < now) store.delete(k);
}

export function loginAllowed(email: string, ip: string): boolean {
  return peek(byEmail, email.toLowerCase(), MAX_PER_EMAIL) && peek(byIp, ip, MAX_PER_IP);
}

/** Call only on a failed attempt — a success should not count against the user. */
export function recordFailedLogin(email: string, ip: string): void {
  sweep(byEmail);
  sweep(byIp);
  hit(byEmail, email.toLowerCase(), MAX_PER_EMAIL);
  hit(byIp, ip, MAX_PER_IP);
}

export function clearLoginFailures(email: string): void {
  byEmail.delete(email.toLowerCase());
}

export const LOGIN_BLOCKED_MESSAGE = "Too many sign-in attempts. Wait a few minutes and try again.";
