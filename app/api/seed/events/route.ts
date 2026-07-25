import { prisma } from "@/lib/prisma";

const EVENT_URL =
  "https://raw.githubusercontent.com/Sekai-World/sekai-master-db-en-diff/main/events.json";

type MasterEvent = {
  id: number;
  name: string;
  assetbundleName: string;
  bgmAssetbundleName?: string;
  eventType: string;
  startAt: number;
};

export async function GET() {
  try {
    const res = await fetch(EVENT_URL, { cache: "no-store" });
    if (!res.ok) {
      return Response.json(
        { error: `Master data fetch failed: ${res.status}` },
        { status: 502 },
      );
    }

    const events = (await res.json()) as MasterEvent[];

    const data = events
      .filter((e) => e.name && e.assetbundleName)
      .map((e) => ({
        id: e.id,
        name: e.name,
        assetbundleName: e.assetbundleName,
        bgmAssetbundleName: e.bgmAssetbundleName ?? null,
        eventType: e.eventType,
        startAt: new Date(Number(e.startAt)),
      }));

    const result = await prisma.event.createMany({
      data,
      skipDuplicates: true,
    });
    return Response.json({ fetched: events.length, inserted: result.count });
  } catch (err) {
    console.error("Event seed failed:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
