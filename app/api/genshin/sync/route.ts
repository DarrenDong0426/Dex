// app/api/genshin/sync/route.ts — the admin's manual "Sync now" trigger.
// Actual sync logic lives in lib/genshinSync.ts, shared with the automatic
// background refresh (see syncGenshinIfStale there).
//
// Auth model: this route is gated by the admin session cookie since (unlike
// the GraphQL endpoint, which only touches Dex's own DB) a stray/bot
// request here would burn calls against a real third-party account-bound
// session.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidSession } from "@/app/admin/auth";
import { syncGenshin } from "@/lib/genshinSync";

export async function POST() {
  const jar = await cookies();
  const authed = await isValidSession(jar.get("dex_admin")?.value);
  if (!authed) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const result = await syncGenshin();
  return NextResponse.json(result, {
    status: result.ok ? 200 : result.error === "auth" ? 401 : result.error === "config" ? 500 : 502,
  });
}
