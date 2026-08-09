// app/admin/AdminLogin.tsx — client component. Two steps:
//   1) enter email  → server emails a 6-digit code (only to ADMIN_EMAIL)
//   2) enter code    → server verifies, sets session cookie, page reloads authed
"use client";

import { useState } from "react";
import { requestCodeAction, verifyCodeAction } from "./actions";

export default function AdminLogin() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("email", email);
      await requestCodeAction(fd);
      setStep("code"); // always advance — we don't reveal if the email matched
    } catch {
      setError("Couldn't send the code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode() {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("code", code);
      const res = await verifyCodeAction(fd);
      if (res.ok) {
        // cookie is set; reload so the server re-renders the dashboard
        window.location.reload();
      } else {
        setError(res.error ?? "Invalid code.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-[#333a5c] bg-[#181b2e] p-6">
      {step === "email" ? (
        <>
          <p className="mb-4 text-sm text-[#9aa3c8]">
            Enter your admin email to receive a login code.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && email && !busy && sendCode()}
            placeholder="you@example.com"
            className="mb-3 w-full rounded-lg border border-[#333a5c] bg-[#20243d] px-3 py-2 text-sm outline-none focus:border-[#5ec8b8]"
          />
          <button
            onClick={sendCode}
            disabled={!email || busy}
            className="w-full rounded-lg bg-[#5ec8b8] px-3 py-2 text-sm font-bold text-[#0c0a1e] transition disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send code"}
          </button>
        </>
      ) : (
        <>
          <p className="mb-4 text-sm text-[#9aa3c8]">
            Enter the 6-digit code sent to your email.
          </p>
          <input
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) =>
              e.key === "Enter" && code.length === 6 && !busy && submitCode()
            }
            placeholder="••••••"
            className="mb-3 w-full rounded-lg border border-[#333a5c] bg-[#20243d] px-3 py-2 text-center text-lg tracking-[0.4em] outline-none focus:border-[#5ec8b8]"
          />
          <button
            onClick={submitCode}
            disabled={code.length !== 6 || busy}
            className="mb-2 w-full rounded-lg bg-[#5ec8b8] px-3 py-2 text-sm font-bold text-[#0c0a1e] transition disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Verify"}
          </button>
          <button
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="w-full text-xs text-[#9aa3c8] hover:text-[#eef1ff]"
          >
            ← use a different email
          </button>
        </>
      )}
      {error && <p className="mt-3 text-xs text-[#f0819e]">{error}</p>}
    </div>
  );
}
