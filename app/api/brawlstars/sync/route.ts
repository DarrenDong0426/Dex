// app/api/brawlstars/sync/route.ts — the admin's manual "Sync now" trigger.
// Actual sync logic lives in lib/brawlStarsSync.ts, shared with the
// automatic background refresh (see syncBrawlStarsIfStale there).
//
// Auth model: same as app/api/genshin/sync/route.ts — gated by the admin
// session cookie so a stray/bot request doesn't burn calls against the key.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidSession } from "@/app/admin/auth";
import { syncBrawlStars } from "@/lib/brawlStarsSync";

export async function POST() {
  const jar = await cookies();
  const authed = await isValidSession(jar.get("dex_admin")?.value);
  if (!authed) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await syncBrawlStars();
  return NextResponse.json(result, {
    status: result.ok ? 200 : result.error === "auth" ? 401 : result.error === "config" ? 500 : 502,
  });
}
