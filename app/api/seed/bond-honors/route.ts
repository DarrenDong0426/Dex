import { prisma } from "@/lib/prisma";

const BOND_HONORS_URL =
  "https://raw.githubusercontent.com/Sekai-World/sekai-master-db-en-diff/main/bondsHonors.json";

type MasterBondHonor = {
  id: number;
  name: string;
  bondsGroupId: number;
  gameCharacterUnitId1: number;
  gameCharacterUnitId2: number;
  honorRarity: string;
};

export async function GET() {
  try {
    const res = await fetch(BOND_HONORS_URL, { cache: "no-store" });
    if (!res.ok) {
      return Response.json(
        { error: `Master data fetch failed: ${res.status}` },
        { status: 502 },
      );
    }

    const honors = (await res.json()) as MasterBondHonor[];

    const data = honors
      .filter((h) => h.name)
      .map((h) => ({
        id: h.id,
        name: h.name,
        bondsGroupId: h.bondsGroupId,
        characterId1: h.gameCharacterUnitId1,
        characterId2: h.gameCharacterUnitId2,
        honorRarity: h.honorRarity,
      }));

    const result = await prisma.bondHonor.createMany({
      data,
      skipDuplicates: true,
    });
    return Response.json({ fetched: honors.length, inserted: result.count });
  } catch (err) {
    console.error("Bond honor seed failed:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
