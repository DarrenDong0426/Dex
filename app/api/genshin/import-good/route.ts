// app/api/genshin/import-good/route.ts — admin upload of a .GOOD export
// (produced locally by Inventory Kamera / Genshin Optimizer's scanner,
// never by Dex itself — see lib/genshinGoodKeys.ts for why). A GOOD file is
// a full inventory snapshot (equipped + benched), so each import wholesale-
// replaces GenshinWeaponItem/GenshinArtifactItem rather than diffing.
//
// Only weapons/artifacts whose GOOD key resolves against GenshinWeaponMaster
// /GenshinArtifactSetMaster.goodKey are imported — anything else is reported
// back as "unmatched" rather than silently dropped or guessed in. Ignores
// the file's characters[] block entirely; character level/constellation/
// talents stay owned by the HoYoLAB sync (lib/genshinSync.ts).
//
// Auth model: admin-session-gated, same as /api/genshin/sync — this writes
// to Dex's own DB only (no third-party credential at risk), but it's still
// a destructive wholesale-replace, not something to leave open.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isValidSession } from "@/app/admin/auth";
import { prisma } from "@/lib/prisma";

type GoodArtifact = {
  setKey: string;
  slotKey: string;
  level: number;
  rarity: number;
  lock: boolean;
  location?: string;
  mainStatKey: string;
  substats: { key: string; value: number }[];
};
type GoodWeapon = {
  key: string;
  level: number;
  ascension: number;
  refinement: number;
  lock: boolean;
  location?: string;
};
type GoodFile = {
  format: string;
  artifacts?: GoodArtifact[];
  weapons?: GoodWeapon[];
};

export async function POST(request: Request) {
  const jar = await cookies();
  const authed = await isValidSession(jar.get("dex_admin")?.value);
  if (!authed) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "No file uploaded (expected field 'file')" }, { status: 400 });
  }

  let data: GoodFile;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return NextResponse.json({ ok: false, error: "File isn't valid JSON" }, { status: 400 });
  }
  if (data.format !== "GOOD") {
    return NextResponse.json(
      { ok: false, error: `Not a GOOD file (format field was "${data.format}", expected "GOOD")` },
      { status: 400 },
    );
  }

  const [weaponMasters, setMasters] = await Promise.all([
    prisma.genshinWeaponMaster.findMany({
      where: { goodKey: { not: null } },
      select: { id: true, goodKey: true },
    }),
    prisma.genshinArtifactSetMaster.findMany({
      where: { goodKey: { not: null } },
      select: { id: true, goodKey: true },
    }),
  ]);
  const weaponIdByKey = new Map(weaponMasters.map((w) => [w.goodKey as string, w.id]));
  const setIdByKey = new Map(setMasters.map((s) => [s.goodKey as string, s.id]));

  const weaponRows: {
    weaponId: number;
    level: number;
    ascension: number;
    refinement: number;
    lock: boolean;
    location: string | null;
  }[] = [];
  const unmatchedWeaponKeys = new Set<string>();
  for (const w of data.weapons ?? []) {
    const weaponId = weaponIdByKey.get(w.key);
    if (!weaponId) {
      unmatchedWeaponKeys.add(w.key);
      continue;
    }
    weaponRows.push({
      weaponId,
      level: w.level,
      ascension: w.ascension,
      refinement: w.refinement,
      lock: w.lock,
      location: w.location || null,
    });
  }

  const artifactRows: {
    setId: number;
    slotKey: string;
    level: number;
    rarity: number;
    lock: boolean;
    location: string | null;
    mainStatKey: string;
    substats: { key: string; value: number }[];
  }[] = [];
  const unmatchedSetKeys = new Set<string>();
  for (const a of data.artifacts ?? []) {
    const setId = setIdByKey.get(a.setKey);
    if (!setId) {
      unmatchedSetKeys.add(a.setKey);
      continue;
    }
    artifactRows.push({
      setId,
      slotKey: a.slotKey,
      level: a.level,
      rarity: a.rarity,
      lock: a.lock,
      location: a.location || null,
      mainStatKey: a.mainStatKey,
      substats: a.substats,
    });
  }

  await prisma.$transaction([
    prisma.genshinWeaponItem.deleteMany(),
    prisma.genshinArtifactItem.deleteMany(),
    prisma.genshinWeaponItem.createMany({ data: weaponRows }),
    prisma.genshinArtifactItem.createMany({ data: artifactRows }),
  ]);

  return NextResponse.json({
    ok: true,
    weapons: { imported: weaponRows.length, unmatched: [...unmatchedWeaponKeys] },
    artifacts: { imported: artifactRows.length, unmatched: [...unmatchedSetKeys] },
  });
}
