// app/admin/auth.ts — core admin auth logic (adapt paths to your project).
// Server-only. Do NOT import into client components.

import crypto from "node:crypto";
import { prisma } from "@/lib/prisma"; // your existing prisma client

// ── env you need ────────────────────────────────────────────────
//   RESEND_API_KEY      – from your Resend dashboard
//   ADMIN_EMAIL         – the ONLY address codes are sent to
//   RESEND_FROM         – a verified sender, e.g. "Dex <admin@ddarren.org>"
// ────────────────────────────────────────────────────────────────

const OTP_TTL_MS = 10 * 60 * 1000; // code valid 10 min
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // session 7 days
const MAX_ATTEMPTS = 5;

function hashCode(code: string) {
  // hash so a DB leak doesn't expose live codes
  return crypto.createHash("sha256").update(code).digest("hex");
}

// STEP 1 — request a code. Only ever emails ADMIN_EMAIL, whatever is submitted.
export async function requestOtp(submittedEmail: string) {
  const admin = process.env.ADMIN_EMAIL!;
  // silently no-op if the submitted email isn't the admin's — don't reveal
  if (submittedEmail.trim().toLowerCase() !== admin.toLowerCase()) {
    return { ok: true }; // pretend success (don't leak whether it matched)
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.adminOtp.upsert({
    where: { email: admin },
    create: { email: admin, codeHash: hashCode(code), expiresAt, attempts: 0 },
    update: { codeHash: hashCode(code), expiresAt, attempts: 0 },
  });

  await sendOtpEmail(admin, code);
  return { ok: true };
}

async function sendOtpEmail(to: string, code: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM,
      to,
      subject: "Your Dex admin code",
      html: `<p>Your admin login code is <strong style="font-size:20px;letter-spacing:2px">${code}</strong></p>
             <p>It expires in 10 minutes. If you didn't request this, ignore it.</p>`,
    }),
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status}`);
}

// STEP 2 — verify a code. On success, create a session and return its token.
export async function verifyOtp(code: string): Promise<string | null> {
  const admin = process.env.ADMIN_EMAIL!;
  const row = await prisma.adminOtp.findUnique({ where: { email: admin } });
  if (!row) return null;
  if (row.expiresAt < new Date()) return null;
  if (row.attempts >= MAX_ATTEMPTS) return null;

  if (hashCode(code) !== row.codeHash) {
    await prisma.adminOtp.update({
      where: { email: admin },
      data: { attempts: { increment: 1 } },
    });
    return null;
  }

  // success — burn the code, mint a session
  await prisma.adminOtp.delete({ where: { email: admin } });
  const session = await prisma.adminSession.create({
    data: { expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  return session.id; // this goes in the cookie
}

// used by the page/middleware to authorize a request
export async function isValidSession(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const s = await prisma.adminSession.findUnique({ where: { id: token } });
  if (!s) return false;
  if (s.expiresAt < new Date()) {
    await prisma.adminSession.delete({ where: { id: token } }).catch(() => {});
    return false;
  }
  return true;
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  await prisma.adminSession.delete({ where: { id: token } }).catch(() => {});
}
