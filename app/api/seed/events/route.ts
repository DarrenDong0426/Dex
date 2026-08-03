import { prisma } from "@/lib/prisma";

export async function GET() {
  const res = await fetch(
    "https://raw.githubusercontent.com/Sekai-World/sekai-master-db-en-diff/main/events.json",
  );
  const data = await res.json();

  for (const d of data) {
    await prisma.event.upsert({
      where: { id: d.id },
      update: { unit: d.unit },
      create: {
        id: d.id,
        name: d.name,
        assetbundleName: d.assetbundleName,
        bgmAssetbundleName: d.bgmAssetbundleName,
        eventType: d.eventType,
        startAt: new Date(d.startAt),
        unit: d.unit,
      },
    });
  }

  return Response.json({ count: data.length });
}
