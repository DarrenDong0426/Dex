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

    const data = honors
      .filter((h) => h.name && h.assetbundleName)
      .map((h) => ({
        id: h.id,
        name: h.name,
        assetbundleName: h.assetbundleName,
        honorRarity: h.honorRarity,
        groupId: h.groupId ?? null,
      }));

    // bulk insert-only, like the other large seeds (cards/musics/stamps/
    // characters) — was a per-row upsert loop (6,472 honors = 6,472
    // sequential awaited round-trips), which took long enough to blow
    // past both curl's and Vercel's timeouts once this ran on a schedule
    // instead of a one-off manual hit. Trade-off: an existing honor's
    // groupId won't get updated if it's ever corrected upstream — group
    // assignments are effectively static once a honor ships, so that's a
    // reasonable bet against the ~100x slowdown of doing it per-row.
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
