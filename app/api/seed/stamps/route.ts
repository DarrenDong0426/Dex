import { prisma } from "@/lib/prisma";

const STAMPS_URL =
  "https://raw.githubusercontent.com/Sekai-World/sekai-master-db-en-diff/main/stamps.json";

type MasterStamp = {
  id: number;
  name: string;
  assetbundleName: string;
  characterId1: number;
  gameCharacterUnitId: number;
};

export async function GET() {
  try {
    const res = await fetch(STAMPS_URL, { cache: "no-store" });
    if (!res.ok) {
      return Response.json(
        { error: `Master data fetch failed: ${res.status}` },
        { status: 502 },
      );
    }

    const stamps = (await res.json()) as MasterStamp[];

    const data = stamps
      .filter((s) => s.characterId1 != null && s.name && s.assetbundleName)
      .map((s) => ({
        id: s.id,
        name: s.name,
        assetbundleName: s.assetbundleName,
        characterId: s.characterId1,
        gameCharacterUnitId: s.gameCharacterUnitId,
      }));

    const result = await prisma.stamp.createMany({
      data,
      skipDuplicates: true,
    });
    return Response.json({ fetched: stamps.length, inserted: result.count });
  } catch (err) {
    console.error("Stamp seed failed", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
