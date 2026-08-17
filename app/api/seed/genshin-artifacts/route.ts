// Full artifact-set master list, used to resolve icon/name/rarity/set-effect
// text for GenshinArtifactItem rows once the GOOD-import path exists — GOOD
// only gives a string setKey per artifact, no icon URL or effect text.
// Source is gi.yatta.moe, same precedent as GenshinCharacterMaster.
//
// affixList is keyed by numeric affix id, almost always with exactly two
// entries (2pc then 4pc — the lower id is always 2pc, higher is 4pc;
// Object.values on numeric-string keys iterates in ascending numeric order
// regardless of insertion order, so this holds without re-sorting). Four
// sets are the exception: the "Prayers for X" family (Illumination, Destiny,
// Wisdom, Springtime) only have a single 1-piece bonus, no 2pc/4pc split —
// verified against yatta's full 63-set list (59 with 2 affixes, exactly
// those 4 with 1).
import { prisma } from "@/lib/prisma";
import { fetchArtifactSetGoodKeys, normalizeToGoodKey } from "@/lib/genshinGoodKeys";

const RELIQUARY_URL = "https://gi.yatta.moe/api/v2/en/reliquary";

type YattaReliquarySet = {
  id: number;
  name: string;
  levelList: number[]; // rarities this set can drop at, e.g. [4, 5]
  affixList: Record<string, string>; // { affixId: effect text }, 2pc then 4pc
  icon: string; // e.g. "UI_RelicIcon_15006_4" — served under /assets/UI/reliquary/<icon>.png
};

export async function GET() {
  try {
    const res = await fetch(RELIQUARY_URL, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) {
      return Response.json({ error: `Reliquary fetch failed: ${res.status}` }, { status: 502 });
    }

    const json = (await res.json()) as { data: { items: Record<string, YattaReliquarySet> } };
    const goodKeys = await fetchArtifactSetGoodKeys();

    const rows = Object.values(json.data.items)
      .filter((s) => {
        const n = Object.keys(s.affixList).length;
        return n === 1 || n === 2; // skip anything that doesn't fit either known shape rather than guess
      })
      .map((s) => {
        const affixes = Object.values(s.affixList);
        const candidate = normalizeToGoodKey(s.name);
        return {
          id: s.id,
          name: s.name,
          icon: `https://gi.yatta.moe/assets/UI/reliquary/${s.icon}.png`,
          rarity: Math.max(...s.levelList),
          onePiece: affixes.length === 1 ? affixes[0] : null,
          twoPiece: affixes.length === 2 ? affixes[0] : null,
          fourPiece: affixes.length === 2 ? affixes[1] : null,
          goodKey: goodKeys.has(candidate) ? candidate : null,
        };
      });

    // Upsert, not delete+recreate: GenshinArtifactItem (GOOD-imported inventory)
    // FKs into this table with no cascade, so a wholesale deleteMany() fails
    // once any real inventory has been imported (hit exactly this running
    // this seed a second time after the Prayers-set fix, 2026-08-15).
    for (const row of rows) {
      await prisma.genshinArtifactSetMaster.upsert({
        where: { id: row.id },
        create: row,
        update: row,
      });
    }

    const unresolved = rows.filter((r) => !r.goodKey).length;
    return Response.json({ fetched: rows.length, inserted: rows.length, unresolvedGoodKey: unresolved });
  } catch (err) {
    console.error("Genshin artifact-set seed failed:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
