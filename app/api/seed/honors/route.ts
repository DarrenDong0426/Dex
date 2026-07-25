import { prisma } from "@/lib/prisma";

const HONORS_URL =
  "https://raw.githubusercontent.com/Sekai-World/sekai-master-db-en-diff/main/honors.json";

type MasterHonor = {
  id: number;
  name: string;
  assetbundleName: string;
  honorRarity: string;
};

export async function GET() {
  try {
    const res = await fetch(HONORS_URL, { cache: "no-store" });
    if (!res.ok) {
      return Response.json(
        { error: `Master data fetch failed: ${res.status}` },
        { status: 502 },
      );
    }

    const honors = (await res.json()) as MasterHonor[];

    const data = honors
      .filter((h) => h.name && h.assetbundleName)
      .map((h) => ({
        id: h.id,
        name: h.name,
        assetbundleName: h.assetbundleName,
        honorRarity: h.honorRarity,
      }));

    const result = await prisma.honor.createMany({
      data,
      skipDuplicates: true,
    });
    return Response.json({ fetched: honors.length, inserted: result.count });
  } catch (err) {
    console.error("Honor seed failed:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
