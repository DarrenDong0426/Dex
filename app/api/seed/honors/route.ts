import { prisma } from "@/lib/prisma";

const HONORS_URL =
  "https://raw.githubusercontent.com/Sekai-World/sekai-master-db-en-diff/main/honors.json";

type MasterHonor = {
  id: number;
  name: string;
  assetbundleName: string;
  honorRarity: string;
  groupId: number;
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

    const data = honors.filter((h) => h.name && h.assetbundleName);

    for (const h of data) {
      await prisma.honor.upsert({
        where: { id: h.id },
        update: { groupId: h.groupId ?? null },
        create: {
          id: h.id,
          name: h.name,
          assetbundleName: h.assetbundleName,
          honorRarity: h.honorRarity,
          groupId: h.groupId ?? null,
        },
      });
    }

    return Response.json({ fetched: honors.length, upserted: data.length });
  } catch (err) {
    console.error("Honor seed failed:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
