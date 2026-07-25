import { prisma } from "@/lib/prisma";

const AREA_ITEMS_URL =
  "https://raw.githubusercontent.com/Sekai-World/sekai-master-db-en-diff/main/areaItems.json";

type MasterAreaItem = {
  id: number;
  name: string;
  areaId: number;
  assetbundleName: string;
};

export async function GET() {
  try {
    const res = await fetch(AREA_ITEMS_URL, { cache: "no-store" });
    if (!res.ok) {
      return Response.json(
        { error: `Master data fetch failed: ${res.status}` },
        { status: 502 },
      );
    }

    const items = (await res.json()) as MasterAreaItem[];

    const data = items
      .filter((i) => i.name && i.assetbundleName)
      .map((i) => ({
        id: i.id,
        name: i.name,
        areaId: i.areaId,
        assetbundleName: i.assetbundleName,
      }));

    const result = await prisma.areaItem.createMany({
      data,
      skipDuplicates: true,
    });
    return Response.json({ fetched: items.length, inserted: result.count });
  } catch (err) {
    console.error("Area item seed failed:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
