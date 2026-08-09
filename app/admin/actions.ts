// app/admin/actions.ts — server actions the admin page calls.
"use server";

import { cookies } from "next/headers";
import { requestOtp, verifyOtp, destroySession } from "./auth";

const COOKIE = "dex_admin";

// called from the "enter your email" form
export async function requestCodeAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  await requestOtp(email);
  // always returns ok (no leak); the page then shows the code-entry step
  return { sent: true };
}

// called from the "enter the 6-digit code" form
export async function verifyCodeAction(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const token = await verifyOtp(code);
  if (!token) return { ok: false, error: "Invalid or expired code." };

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
  return { ok: true };
}

export async function logoutAction() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  await destroySession(token);
  jar.delete(COOKIE);
  return { ok: true };
}
