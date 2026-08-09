// app/admin/page.tsx — server component. Reads the session cookie, decides
// whether to show the login flow or the dashboard. No secrets reach the client.

import { cookies } from "next/headers";
import { isValidSession } from "./auth";
import AdminLogin from "./AdminLogin";
import AdminDashboard from "./AdminDashboard";

export const dynamic = "force-dynamic"; // never cache the auth state

export default async function AdminPage() {
  const jar = await cookies();
  const token = jar.get("dex_admin")?.value;
  const authed = await isValidSession(token);

  // authenticated: AdminDashboard owns the full page (sidebar + background)
  if (authed) return <AdminDashboard />;

  return (
    <div className="min-h-screen bg-[#0d0f1a] text-[#eef1ff]">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="mb-8 text-2xl font-extrabold tracking-tight">
          Dex <span className="text-[#5ec8b8]">Admin</span>
        </h1>
        <AdminLogin />
      </div>
    </div>
  );
}
