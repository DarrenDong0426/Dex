// Full weapon master list (all rarities/types), used to resolve icon/name/
// rarity for GenshinWeaponItem rows once the GOOD-import path exists — GOOD
// only gives a string key per weapon, no icon URL. Source is gi.yatta.moe,
// same precedent as GenshinCharacterMaster.
import { prisma } from "@/lib/prisma";
import { fetchWeaponGoodKeys, normalizeToGoodKey } from "@/lib/genshinGoodKeys";

const WEAPON_URL = "https://gi.yatta.moe/api/v2/en/weapon";

// yatta's raw type enum -> the display name this app uses elsewhere.
const WEAPON_TYPE: Record<string, string> = {
  WEAPON_SWORD_ONE_HAND: "Sword",
  WEAPON_CLAYMORE: "Claymore",
  WEAPON_POLE: "Polearm",
  WEAPON_CATALYST: "Catalyst",
  WEAPON_BOW: "Bow",
};

type YattaWeapon = {
  id: number;
  name: string;
  rank: number; // rarity, 1-5
  type: string;
  icon: string; // e.g. "UI_EquipIcon_Sword_Blunt" — served under /assets/UI/<icon>.png
};

export async function GET() {
  try {
    const res = await fetch(WEAPON_URL, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) {
      return Response.json({ error: `Weapon fetch failed: ${res.status}` }, { status: 502 });
    }

    const json = (await res.json()) as { data: { items: Record<string, YattaWeapon> } };
    const goodKeys = await fetchWeaponGoodKeys();

    const rows = Object.values(json.data.items)
      .filter((w) => WEAPON_TYPE[w.type]) // drop anything with an unrecognized type rather than guess
      .map((w) => {
        const candidate = normalizeToGoodKey(w.name);
        return {
          id: w.id,
          name: w.name,
          icon: `https://gi.yatta.moe/assets/UI/${w.icon}.png`,
          rarity: w.rank,
          weaponType: WEAPON_TYPE[w.type],
          goodKey: goodKeys.has(candidate) ? candidate : null,
        };
      });

    // Upsert, not delete+recreate: GenshinWeaponItem (GOOD-imported inventory)
    // FKs into this table with no cascade, so a wholesale deleteMany() fails
    // once any real inventory has been imported. Upserting is also just
    // correct for a re-seedable reference table regardless.
    for (const row of rows) {
      await prisma.genshinWeaponMaster.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
    }

    const unresolved = rows.filter((r) => !r.goodKey).length;
    return Response.json({ fetched: rows.length, inserted: rows.length, unresolvedGoodKey: unresolved });
  } catch (err) {
    console.error("Genshin weapon seed failed:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
