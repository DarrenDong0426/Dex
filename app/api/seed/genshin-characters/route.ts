// Full playable Genshin roster (owned + unowned), used only to render
// locked characters on the Characters tab — GenshinCharacter itself only
// ever holds what HoYoLAB sync returns (characters actually owned). Source
// is Enka Network's static character/name data, not HoYoLAB (HoYoLAB never
// exposes characters you don't own).
import { prisma } from "@/lib/prisma";

const CHARACTERS_URL =
  "https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/characters.json";
const LOC_URL =
  "https://raw.githubusercontent.com/EnkaNetwork/API-docs/master/store/loc.json";
// region isn't in Enka's data — gi.yatta.moe's avatar list has it directly
// (avatarId matches the same numeric scheme as Enka/HoYoLAB)
const YATTA_URL = "https://gi.yatta.moe/api/v2/en/avatar";

type MasterCharacter = {
  Element?: string;
  NameTextMapHash: number;
  SideIconName: string;
  QualityType: string;
};

// gi.yatta.moe's raw region tags, normalized to display names. A few are
// story-arc/faction tags rather than nations (verified against the actual
// character lists behind each tag, not guessed) — grouped sensibly:
// SNEZHNAYA_STAR are newer Snezhnaya-affiliated characters, NODKRAI_ZIBAI is
// just Zibai (a Nod-Krai character under a stray tag), MAINACTOR is the
// Traveler, and RANGER/OMNI_SCOURGE/HVISION are one-off characters with no
// nation (Aloy, Skirk, Nicole) bucketed into "Other".
const REGION_NAME: Record<string, string> = {
  MONDSTADT: "Mondstadt",
  LIYUE: "Liyue",
  INAZUMA: "Inazuma",
  SUMERU: "Sumeru",
  FONTAINE: "Fontaine",
  NATLAN: "Natlan",
  SNEZHNAYA: "Snezhnaya",
  SNEZHNAYA_STAR: "Snezhnaya",
  NODKRAI: "Nod-Krai",
  NODKRAI_ZIBAI: "Nod-Krai",
  FATUI: "Fatui",
  MAINACTOR: "Traveler",
};

// Enka's element names -> the naming this app already uses everywhere else
// (ELEMENT_COLOR keys in the Genshin display components).
const ELEMENT_NAME: Record<string, string> = {
  Fire: "Pyro",
  Water: "Hydro",
  Wind: "Anemo",
  Electric: "Electro",
  Grass: "Dendro",
  Ice: "Cryo",
  Rock: "Geo",
};

const RARITY: Record<string, number> = {
  QUALITY_ORANGE: 5,
  QUALITY_PURPLE: 4,
};

export async function GET() {
  try {
    const [charsRes, locRes, yattaRes] = await Promise.all([
      fetch(CHARACTERS_URL, { cache: "no-store" }),
      fetch(LOC_URL, { cache: "no-store" }),
      fetch(YATTA_URL, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }),
    ]);
    if (!charsRes.ok || !locRes.ok || !yattaRes.ok) {
      return Response.json(
        {
          error: `Master data fetch failed: ${charsRes.status} / ${locRes.status} / ${yattaRes.status}`,
        },
        { status: 502 },
      );
    }

    const characters = (await charsRes.json()) as Record<string, MasterCharacter>;
    const loc = (await locRes.json()) as { en: Record<string, string> };
    const yatta = (await yattaRes.json()) as {
      data: { items: Record<string, { name: string; region?: string }> };
    };
    // match by name, not id — Enka and Yatta sometimes disagree on the
    // avatarId for very recently released characters (confirmed for
    // Traveler, Sandrone, Linnea, Columbina) even though both otherwise use
    // the game's real internal ids
    const regionByName = new Map(
      Object.values(yatta.data.items).map((a) => [a.name.toLowerCase(), a.region]),
    );

    const rows: { id: number; name: string; element: string; rarity: number; icon: string; region: string }[] = [];
    const seenNames = new Set<string>();

    for (const [idStr, c] of Object.entries(characters)) {
      const rarity = RARITY[c.QualityType];
      const element = c.Element ? ELEMENT_NAME[c.Element] : undefined;
      const name = loc.en[String(c.NameTextMapHash)];
      if (!rarity || !element || !name) continue;
      // trial/test/demo duplicates ("Hu Tao (Trial)", "Pyro Archon (Test)")
      // aren't real roster entries
      if (name.includes("(")) continue;

      // Traveler has a separate avatarId per element + gender — collapse to
      // one roster entry so it doesn't show up as a dozen "locked" tiles.
      const key = name.toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);

      const iconName = c.SideIconName.replace("_Side", "");
      const rawRegion = regionByName.get(key);
      rows.push({
        id: Number(idStr),
        name,
        element,
        rarity,
        icon: `https://enka.network/ui/${iconName}.png`,
        region: (rawRegion && REGION_NAME[rawRegion]) || "Other",
      });
    }

    await prisma.genshinCharacterMaster.deleteMany();
    const result = await prisma.genshinCharacterMaster.createMany({
      data: rows,
      skipDuplicates: true,
    });

    return Response.json({ fetched: rows.length, inserted: result.count });
  } catch (err) {
    console.error("Genshin character seed failed:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
