// lib/baseUrl.ts — absolute origin for server-side code (Server Components,
// etc.) that needs to fetch() this app's own API routes. A relative fetch
// path only works client-side (the browser has an implicit origin); server-
// side fetch has none, so this always needs to be absolute.
//
// VERCEL_URL is auto-provided by Vercel at runtime with the current
// deployment's real hostname (no protocol) — using it means this works
// correctly on every deployment (preview or production) with zero hardcoded
// domain, and falls back to localhost for local dev. Found needed 2026-08-17
// — app/page.tsx and app/cards/page.tsx both had "http://localhost:3000"
// hardcoded, which 500'd every page load once actually deployed.
export function baseUrl(): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
