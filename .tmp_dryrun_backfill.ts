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
  const [events, groups, userEvents, allHonors, allUserHonors] = await Promise.all([
    prisma.event.findMany(),
    prisma.honorGroup.findMany({ where: { honorType: "event" } }),
    prisma.userEvent.findMany({ where: { rank: { not: null } } }),
    prisma.honor.findMany(),
    prisma.userHonor.findMany(),
  ]);
  const rankByEvent = new Map(userEvents.map((u) => [u.eventId, u.rank]));
  const honorsByGroup = new Map<number, typeof allHonors>();
  for (const h of allHonors) {
    if (h.groupId == null) continue;
    if (!honorsByGroup.has(h.groupId)) honorsByGroup.set(h.groupId, []);
    honorsByGroup.get(h.groupId)!.push(h);
  }
  const levelByHonorId = new Map(allUserHonors.map((u) => [u.honorId, u.level]));

  let matchedEvents = 0, unmatchedEvents = 0;
  let toUpsert = 0, toDelete = 0, unchanged = 0;
  const sampleChanges: string[] = [];

  for (const e of events) {
    const rank = rankByEvent.get(e.id);
    if (rank === undefined) continue; // no recorded rank at all
    const group = findOverallEventHonorGroup(e.name, groups);
    if (!group) { unmatchedEvents++; continue; }
    matchedEvents++;
    const honors = honorsByGroup.get(group.id) ?? [];
    for (const h of honors) {
      const threshold = eventHonorRankThreshold(h.name);
      if (threshold == null) continue;
      const achieved = rank != null && threshold >= rank;
      const currentlyOwned = levelByHonorId.has(h.id);
      if (achieved && !currentlyOwned) {
        toUpsert++;
        if (sampleChanges.length < 15) sampleChanges.push(`+ own "${h.name}" for "${e.name}" (rank ${rank})`);
      } else if (!achieved && currentlyOwned) {
        toDelete++;
        if (sampleChanges.length < 15) sampleChanges.push(`- unown "${h.name}" for "${e.name}" (rank ${rank})`);
      } else {
        unchanged++;
      }
    }
  }

  console.log("events with a rank matched to an honor group:", matchedEvents);
  console.log("events with a rank but NO matching honor group:", unmatchedEvents);
  console.log("honor rows that would become newly owned:", toUpsert);
  console.log("honor rows that would become newly un-owned:", toDelete);
  console.log("honor rows unchanged:", unchanged);
  console.log("--- sample changes ---");
  console.log(sampleChanges.join("\n"));

  await prisma.$disconnect();
}
main();
