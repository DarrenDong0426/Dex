// app/api/upload/route.ts — generic image upload for admin editors (starts
// with the Logistics avatar, reusable for anything else that wants a
// no-code "pick a file" flow instead of pasting a URL). Admin-session
// gated like app/api/genshin/sync/route.ts. Uploads to Supabase Storage's
// "uploads" bucket (see lib/supabaseStorage.ts) and returns the public URL.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidSession } from "@/app/admin/auth";
import { uploadToStorage } from "@/lib/supabaseStorage";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB, matches the bucket's file_size_limit

export async function POST(request: Request) {
  const jar = await cookies();
  const authed = await isValidSession(jar.get("dex_admin")?.value);
  if (!authed) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided (expected form field 'file')." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type "${file.type}" — use PNG, JPEG, WEBP, or GIF.` },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB) — max 5MB.` },
      { status: 400 },
    );
  }

  const ext = file.type.split("/")[1];
  const baseName =
    file.name.replace(/\.[^./]+$/, "").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 60) ||
    "upload";
  const path = `${Date.now()}-${baseName}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const url = await uploadToStorage(path, buffer, file.type);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Upload failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
