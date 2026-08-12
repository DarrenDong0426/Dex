// lib/supabaseStorage.ts — server-only helper for uploading files to Supabase
// Storage (the "uploads" bucket, public). This project uses Supabase only as
// a raw Postgres host via Prisma (see lib/prisma.ts) — no Supabase JS SDK is
// installed, so this talks to the Storage REST API directly with fetch,
// matching how the rest of the app integrates third-party APIs (AniList,
// HoYoLAB, Jikan) without pulling in their SDKs either.
//
// Auth: Supabase's dashboard now issues a new-format key (sb_secret_...) by
// default, but this project's Storage API only accepts the legacy JWT-style
// service_role token. Rather than storing that long-lived JWT as a secret,
// we hold only its signing secret (SUPABASE_JWT_SECRET, from the dashboard's
// "Legacy JWT secret") and mint a short-lived service_role JWT per request.
import crypto from "crypto";

const BUCKET = "uploads";

function b64url(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function serviceRoleJwt(): string {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET is missing from .env");
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { role: "service_role", iss: "supabase", iat: now, exp: now + 300 };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = crypto
    .createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `${signingInput}.${sig}`;
}

// uploads a file and returns its public URL. `path` is the key within the
// bucket, e.g. "avatar/1699999999-pfp.png" — include a cache-busting
// component (timestamp/uuid) since the public URL has no query-string
// versioning and browsers/CDNs will otherwise cache a stale image.
export async function uploadToStorage(
  path: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  const base = process.env.SUPABASE_URL;
  if (!base) throw new Error("SUPABASE_URL is missing from .env");
  const jwt = serviceRoleJwt();

  const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
      apikey: jwt,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: new Blob([new Uint8Array(data)], { type: contentType }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Supabase Storage upload failed (${res.status}): ${text}`);
  }
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}
