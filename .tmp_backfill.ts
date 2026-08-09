import "dotenv/config";
import { prisma } from "@/lib/prisma";

function eventHonorRankThreshold(name: string): number | null {
  const ord = name.match(/^(\d+)(?:st|nd|rd|th)/i);
  if (ord) return parseInt(ord[1], 10);
  const top = name.match(/top\s*([\d,]+)/i);
  if (top) return parseInt(top[1].replace(/,/g, ""), 10);
  return null;
}
function normalizeEventName(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}
function findOverallEventHonorGroup(
  eventName: string,
  groups: { id: number; name: string | null; honorType: string | null }[],
) {
  const key = normalizeEventName(eventName);
  return groups.find(
    (g) =>
      g.honorType === "event" &&
      normalizeEventName(g.name) === key &&
      !/chapter/i.test(g.name ?? ""),
  );
}

async function main() {
  const [events, groups, userEvents] = await Promise.all([
    prisma.event.findMany(),
    prisma.honorGroup.findMany({ where: { honorType: "event" } }),
    prisma.userEvent.findMany({ where: { rank: { not: null } } }),
  ]);
  const rankByEvent = new Map(userEvents.map((u) => [u.eventId, u.rank]));

  let upserted = 0, deleted = 0, eventsSynced = 0;
  for (const e of events) {
    const rank = rankByEvent.get(e.id);
    if (rank === undefined) continue;
    const group = findOverallEventHonorGroup(e.name, groups);
    if (!group) continue;
    eventsSynced++;
    const honors = await prisma.honor.findMany({ where: { groupId: group.id } });
    for (const h of honors) {
      const threshold = eventHonorRankThreshold(h.name);
      if (threshold == null) continue;
      const achieved = rank != null && threshold >= rank;
      if (achieved) {
        const res = await prisma.userHonor.upsert({
          where: { honorId: h.id },
          update: { level: 1 },
          create: { honorId: h.id, level: 1 },
        });
        upserted++;
      } else {
        const res = await prisma.userHonor.deleteMany({ where: { honorId: h.id } });
        if (res.count > 0) deleted++;
      }
    }
  }
  console.log("events synced:", eventsSynced, "honor rows upserted:", upserted, "honor rows actually deleted:", deleted);
  await prisma.$disconnect();
}
main();
