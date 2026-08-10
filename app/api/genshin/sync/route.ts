// app/api/genshin/sync/route.ts — pulls the full Genshin roster (level,
// constellation, talents, equipped weapon, equipped artifacts+substats) from
// HoYoLAB's battle-chronicle API and replaces GenshinCharacter/GenshinArtifact
// with the fresh data. Needs HOYOLAB_COOKIE + GENSHIN_UID in .env.
//
// Auth model: HOYOLAB_COOKIE is a live HoYoLAB session credential, never sent
// to the client, only read server-side here. This route itself is gated by
// the same admin session cookie the rest of /admin uses, since (unlike the
// GraphQL endpoint, which only touches Dex's own DB) a stray/bot request here
// would burn calls against a real third-party account-bound session.
//
// The DS signature scheme, salt, and endpoints were verified against
// seriaati/genshin.py (an actively maintained HoYoLAB API wrapper) and by
// live-testing against a real account — the property_type → stat name
// mapping below was empirically derived from that account's real artifact
// data (deterministic anchors: Flower always HP, Feather always ATK; goblet
// element cross-reference for the elemental DMG% codes), not guessed.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { isValidSession } from "@/app/admin/auth";
import { prisma } from "@/lib/prisma";

const DS_SALT = "6s25p5ox5y14umn1p61aqyyvbvvl3lrt";

function generateDS(): string {
  const t = Math.floor(Date.now() / 1000);
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const r = Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  const h = crypto
    .createHash("md5")
    .update(`salt=${DS_SALT}&t=${t}&r=${r}`)
    .digest("hex");
  return `${t},${r},${h}`;
}

function recognizeServer(uid: string): string {
  const first = uid[0];
  if (first === "6") return "os_usa";
  if (first === "7") return "os_euro";
  if (first === "8") return "os_asia";
  if (first === "9") return "os_cht";
  return "os_asia";
}

function hoyolabHeaders(cookie: string) {
  return {
    "Content-Type": "application/json",
    Cookie: cookie,
    ds: generateDS(),
    "x-rpc-app_version": "1.5.0",
    "x-rpc-client_type": "5",
    "x-rpc-language": "en-us",
    "x-rpc-lang": "en-us",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36",
    Referer: "https://act.hoyolab.com/",
  };
}

const BASE_URL =
  "https://sg-public-api.hoyolab.com/event/game_record/genshin/api";

// empirically verified against a real account (see file header)
const STAT_NAMES: Record<number, string> = {
  2: "HP",
  3: "HP%",
  5: "ATK",
  6: "ATK%",
  8: "DEF",
  9: "DEF%",
  20: "Crit Rate",
  22: "Crit DMG",
  23: "Energy Recharge",
  26: "Healing Bonus",
  28: "Elemental Mastery",
  30: "Physical DMG%",
  40: "Pyro DMG%",
  41: "Electro DMG%",
  42: "Hydro DMG%",
  43: "Dendro DMG%",
  44: "Anemo DMG%",
  45: "Geo DMG%",
  46: "Cryo DMG%",
  27: "Incoming Healing Bonus",
  // 2000-series = character *final* stats (selected_properties), a
  // different namespace than the 1-46 artifact substat codes above
  2000: "Max HP",
  2001: "ATK",
  2002: "DEF",
};
function statName(propertyType: number): string {
  return STAT_NAMES[propertyType] ?? `Stat #${propertyType}`;
}

type HoyolabError = { kind: "auth" | "other"; message: string };

async function fetchCharacterList(
  cookie: string,
  uid: string,
  server: string,
): Promise<{ ids: number[] } | HoyolabError> {
  const res = await fetch(`${BASE_URL}/character/list`, {
    method: "POST",
    headers: hoyolabHeaders(cookie),
    body: JSON.stringify({ role_id: uid, server }),
  });
  const json = await res.json();
  if (json.retcode === 10001) {
    return { kind: "auth", message: "HOYOLAB_COOKIE has expired — re-extract it and update .env." };
  }
  if (json.retcode !== 0) {
    return { kind: "other", message: json.message ?? `retcode ${json.retcode}` };
  }
  return { ids: json.data.list.map((c: { id: number }) => c.id) };
}

async function fetchCharacterDetails(
  cookie: string,
  uid: string,
  server: string,
  ids: number[],
): Promise<{ list: unknown[] } | HoyolabError> {
  const all: unknown[] = [];
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20);
    const res = await fetch(`${BASE_URL}/character/detail`, {
      method: "POST",
      headers: hoyolabHeaders(cookie),
      body: JSON.stringify({ role_id: uid, server, character_ids: chunk }),
    });
    const json = await res.json();
    if (json.retcode === 10001) {
      return { kind: "auth", message: "HOYOLAB_COOKIE has expired — re-extract it and update .env." };
    }
    if (json.retcode !== 0) {
      return { kind: "other", message: json.message ?? `retcode ${json.retcode}` };
    }
    all.push(...json.data.list);
    // be polite to the API between chunks
    if (i + 20 < ids.length) await new Promise((r) => setTimeout(r, 300));
  }
  return { list: all };
}

function isError(x: unknown): x is HoyolabError {
  return typeof x === "object" && x !== null && "kind" in x;
}

export async function POST() {
  const jar = await cookies();
  const authed = await isValidSession(jar.get("dex_admin")?.value);
  if (!authed) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const cookie = process.env.HOYOLAB_COOKIE;
  const uid = process.env.GENSHIN_UID;
  if (!cookie || !uid) {
    return NextResponse.json(
      { ok: false, error: "config", message: "HOYOLAB_COOKIE or GENSHIN_UID missing from .env" },
      { status: 500 },
    );
  }

  const server = recognizeServer(uid);

  const listResult = await fetchCharacterList(cookie, uid, server);
  if (isError(listResult)) {
    return NextResponse.json(
      { ok: false, error: listResult.kind, message: listResult.message },
      { status: listResult.kind === "auth" ? 401 : 502 },
    );
  }

  const detailResult = await fetchCharacterDetails(cookie, uid, server, listResult.ids);
  if (isError(detailResult)) {
    return NextResponse.json(
      { ok: false, error: detailResult.kind, message: detailResult.message },
      { status: detailResult.kind === "auth" ? 401 : 502 },
    );
  }

  type Avatar = {
    base: {
      id: number;
      name: string;
      element: string;
      rarity: number;
      icon: string;
      image: string;
      level: number;
      fetter: number;
      actived_constellation_num: number;
    };
    weapon: {
      id: number;
      name: string;
      icon: string;
      rarity: number;
      level: number;
      affix_level: number;
    };
    skills: { skill_type: number; level: number }[];
    relics: {
      pos_name: string;
      name: string;
      icon: string;
      rarity: number;
      level: number;
      set: { name: string };
      main_property: { property_type: number; value: string };
      sub_property_list: { property_type: number; value: string }[];
    }[];
    // HoYoLAB's own computed final stats — same list shown in-game's
    // character detail panel (Max HP/ATK/DEF/EM/CR/CD/ER/elemental bonus)
    selected_properties: { property_type: number; final: string }[];
    // owned skins for this character (sibling of base, not nested in it) —
    // empty for characters with no purchased/earned costume
    costumes: { id: number; name: string; icon: string }[];
  };

  let synced = 0;
  for (const raw of detailResult.list as Avatar[]) {
    const talents = raw.skills.filter((s) => s.skill_type === 1);
    const [normal, skill, burst] = talents;
    const stats = (raw.selected_properties ?? []).map((p) => ({
      name: statName(p.property_type),
      value: p.final,
    }));
    const costumes = (raw.costumes ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
    }));

    await prisma.$transaction(async (tx) => {
      await tx.genshinCharacter.upsert({
        where: { id: raw.base.id },
        create: {
          id: raw.base.id,
          name: raw.base.name,
          element: raw.base.element,
          rarity: raw.base.rarity,
          icon: raw.base.icon,
          image: raw.base.image,
          stats,
          costumes,
          level: raw.base.level,
          constellation: raw.base.actived_constellation_num,
          friendship: raw.base.fetter,
          normalAttackLvl: normal?.level ?? 0,
          elementalSkillLvl: skill?.level ?? 0,
          elementalBurstLvl: burst?.level ?? 0,
          weaponId: raw.weapon.id,
          weaponName: raw.weapon.name,
          weaponIcon: raw.weapon.icon,
          weaponRarity: raw.weapon.rarity,
          weaponLevel: raw.weapon.level,
          weaponRefinement: raw.weapon.affix_level,
        },
        update: {
          name: raw.base.name,
          element: raw.base.element,
          rarity: raw.base.rarity,
          icon: raw.base.icon,
          image: raw.base.image,
          stats,
          costumes,
          level: raw.base.level,
          constellation: raw.base.actived_constellation_num,
          friendship: raw.base.fetter,
          normalAttackLvl: normal?.level ?? 0,
          elementalSkillLvl: skill?.level ?? 0,
          elementalBurstLvl: burst?.level ?? 0,
          weaponId: raw.weapon.id,
          weaponName: raw.weapon.name,
          weaponIcon: raw.weapon.icon,
          weaponRarity: raw.weapon.rarity,
          weaponLevel: raw.weapon.level,
          weaponRefinement: raw.weapon.affix_level,
        },
      });

      // artifacts don't have stable IDs worth diffing — replace wholesale
      await tx.genshinArtifact.deleteMany({ where: { characterId: raw.base.id } });
      if (raw.relics.length > 0) {
        await tx.genshinArtifact.createMany({
          data: raw.relics.map((r) => ({
            characterId: raw.base.id,
            slot: r.pos_name,
            setName: r.set.name,
            icon: r.icon,
            rarity: r.rarity,
            level: r.level,
            mainStatName: statName(r.main_property.property_type),
            mainStatValue: r.main_property.value,
            substats: r.sub_property_list.map((sp) => ({
              name: statName(sp.property_type),
              value: sp.value,
            })),
          })),
        });
      }
    });
    synced++;
  }

  return NextResponse.json({ ok: true, synced, total: (detailResult.list as Avatar[]).length });
}
